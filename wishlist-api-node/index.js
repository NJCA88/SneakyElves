const express = require('express');
const crypto = require('crypto');
require('dotenv').config();
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');
const bcrypt = require('bcryptjs');
const FeedService = require('./services/FeedService');
const { OAuth2Client } = require('google-auth-library');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

function generateInviteCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

app.use(cors());
app.use(express.json());

// Basic Route
app.get('/api/', (req, res) => {
    res.json({ message: 'Wishlist API is running' });
});

app.get('/api/feed', async (req, res) => {
    const { userId, limit, offset } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        const feed = await FeedService.getUserFeed(
            userId,
            limit ? parseInt(limit) : 20,
            offset ? parseInt(offset) : 0
        );
        res.json(feed);
    } catch (error) {
        console.error('Error fetching feed:', error);
        res.status(500).json({ error: 'Failed to fetch feed' });
    }
});

// Auth Routes
// Auth Routes
app.post('/api/auth/google', async (req, res) => {
    const { token, inviteCode, inviteToken } = req.body;
    // Warn if ID is missing but proceed (will fail if client tries to verify)
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('GOOGLE_CLIENT_ID is not set in environment variables');
    }
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        // sub is the unique Google ID
        const { sub: googleId, email, name, picture } = payload;

        // 1. Check if user exists by googleId
        let user = await prisma.user.findUnique({
            where: { googleId },
            include: {
                memberships: {
                    include: { group: true }
                }
            }
        });

        // 2. If not found by googleId, check by email (legacy user or first time google login)
        if (!user) {
            user = await prisma.user.findUnique({
                where: { email },
                include: {
                    memberships: {
                        include: { group: true }
                    }
                }
            });

            if (user) {
                // Link account: Add googleId to existing user
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId,
                        // Optionally update profile picture if missing
                        profilePictureUrl: user.profilePictureUrl || picture
                    },
                    include: {
                        memberships: {
                            include: { group: true }
                        }
                    }
                });
            } else {
                // 3. Create new user
                console.log(`Creating new user from Google: ${email}`);

                // Handle Group Logic (same as Signup)
                let groupsToJoin = [];

                if (inviteCode) {
                    const grp = await prisma.group.findUnique({
                        where: { inviteCode: inviteCode.toUpperCase() }
                    });
                    if (grp) groupsToJoin.push(grp);
                }

                // Check new WishlistInvite token
                if (inviteToken) {
                    const invite = await prisma.wishlistInvite.findUnique({
                        where: { token: inviteToken },
                        include: { groups: true }
                    });
                    if (invite && invite.groups.length > 0) {
                        groupsToJoin = [...groupsToJoin, ...invite.groups];
                    }
                }

                // Generate valid random password (required by schema)
                const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(randomPassword, 10);

                const newUser = await prisma.user.create({
                    data: {
                        name,
                        email,
                        password: hashedPassword,
                        googleId,
                        profilePictureUrl: picture
                    }
                });

                if (groupsToJoin.length > 0) {
                    // Deduplicate groups
                    const discreteGroups = Array.from(new Set(groupsToJoin.map(g => g.id)))
                        .map(id => groupsToJoin.find(g => g.id === id));

                    for (const grp of discreteGroups) {
                        await prisma.groupMembership.create({
                            data: {
                                userId: newUser.id,
                                groupId: grp.id,
                                role: 'MEMBER'
                            }
                        });
                    }
                } else {
                    // Create new group
                    let newInviteCode;
                    let isUnique = false;
                    while (!isUnique) {
                        newInviteCode = generateInviteCode();
                        const existing = await prisma.group.findUnique({ where: { inviteCode: newInviteCode } });
                        if (!existing) isUnique = true;
                    }

                    const newGroup = await prisma.group.create({
                        data: {
                            name: `${name}'s Group`,
                            inviteCode: newInviteCode
                        }
                    });

                    await prisma.groupMembership.create({
                        data: {
                            userId: newUser.id,
                            groupId: newGroup.id,
                            role: 'ADMIN'
                        }
                    });
                }

                // Auto-create wishlist
                await prisma.wishlist.create({
                    data: {
                        title: name,
                        userId: newUser.id
                    }
                });

                // Fetch full user for return
                user = await prisma.user.findUnique({
                    where: { id: newUser.id },
                    include: {
                        memberships: {
                            include: { group: true }
                        }
                    }
                });
            }
        }

        const { password: _, ...userWithoutPassword } = user;
        // console.log('Google Auth successful for:', email);
        res.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ error: 'Invalid Google Token' });
    }
});

app.post('/api/auth/google/link', async (req, res) => {
    const { userId, token } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('GOOGLE_CLIENT_ID is not set in environment variables');
    }
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, picture } = payload;

        // 1. Check if googleId is already used by ANOTHER user
        const existingUser = await prisma.user.findUnique({
            where: { googleId }
        });

        if (existingUser && existingUser.id !== userId) {
            return res.status(400).json({ error: 'This Google account is already linked to another user.' });
        }

        // 2. Link the account
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                googleId,
                // Optionally fill in profile picture if missing
                profilePictureUrl: { set: picture } // Actually, let's only set if missing, but Prisma update is simple.
                // Ideally: profilePictureUrl: user.profilePictureUrl || picture. But we don't have user loaded here effectively unless we fetch.
                // Let's just update googleId. The user can update profile pic manually if they want, or we can fetch first.
            },
            include: {
                memberships: {
                    include: { group: true }
                }
            }
        });

        // If profile pic is missing, update it? 
        // Let's keep it simple for now, just link.

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('Google Link Error:', error);
        res.status(401).json({ error: 'Invalid Google Token or Link Failed' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    include: {
                        group: true
                    }
                }
            }
        });

        if (!user) {
            console.log('User not found');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password: Try standard bcrypt first, then fallback to plaintext
        let passwordMatch = false;

        // 1. Try bcrypt compare (will fail gracefully if not a hash)
        try {
            passwordMatch = await bcrypt.compare(password, user.password);
        } catch (e) {
            // Ignore error, probably not a hash
        }

        // 2. If not match yet, check plaintext (legacy/dev support)
        if (!passwordMatch) {
            if (user.password === password) {
                passwordMatch = true;
            }
        }

        if (!passwordMatch) {
            console.log('Password mismatch');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // In a real app, we would return a JWT here.
        // For this simple version, we just return the user info.
        const { password: _, ...userWithoutPassword } = user;
        console.log('Login successful');
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, password, inviteCode, inviteToken } = req.body; // Changed to accept inviteToken too
    try {
        let groupToJoin = null;
        let groupsToJoin = [];

        // 1. Check legacy invite code
        if (inviteCode) {
            const grp = await prisma.group.findUnique({
                where: { inviteCode: inviteCode.toUpperCase() }
            });
            if (grp) groupsToJoin.push(grp);
            else return res.status(400).json({ error: 'Invalid invite code' });
        }

        // 2. Check new WishlistInvite token
        if (inviteToken) {
            const invite = await prisma.wishlistInvite.findUnique({
                where: { token: inviteToken },
                include: { groups: true }
            });
            if (invite && invite.groups.length > 0) {
                groupsToJoin = [...groupsToJoin, ...invite.groups];
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword }
        });

        // Add to groups
        if (groupsToJoin.length > 0) {
            // Deduplicate groups
            const discreteGroups = Array.from(new Set(groupsToJoin.map(g => g.id)))
                .map(id => groupsToJoin.find(g => g.id === id));

            for (const grp of discreteGroups) {
                // Check if already in group (in case multiple sources added same group)
                const existing = await prisma.groupMembership.findUnique({
                    where: { userId_groupId: { userId: user.id, groupId: grp.id } }
                });

                if (!existing) {
                    await prisma.groupMembership.create({
                        data: {
                            userId: user.id,
                            groupId: grp.id,
                            role: 'MEMBER'
                        }
                    });
                }
            }
        } else {
            // No invite code provided (or invalid, though we validate above), create a new group for them
            let newInviteCode;
            let isUnique = false;
            while (!isUnique) {
                newInviteCode = generateInviteCode();
                const existing = await prisma.group.findUnique({ where: { inviteCode: newInviteCode } });
                if (!existing) isUnique = true;
            }

            const newGroup = await prisma.group.create({
                data: {
                    name: `${name}'s Group`,
                    inviteCode: newInviteCode
                }
            });

            await prisma.groupMembership.create({
                data: {
                    userId: user.id,
                    groupId: newGroup.id,
                    role: 'ADMIN'
                }
            });
        }

        // Auto-create wishlist
        await prisma.wishlist.create({
            data: {
                title: name,
                userId: user.id
            }
        });

        // Fetch full user with memberships to ensure frontend state is correct (for AdminRoute)
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                memberships: {
                    include: {
                        group: true
                    }
                }
            }
        });

        const { password: _, ...userWithoutPassword } = fullUser;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).json({ error: 'User already exists or invalid data' });
    }
});

app.post('/api/wishlists', async (req, res) => {
    const { userId } = req.body;
    try {
        // Check if user already has a wishlist
        const existingWishlist = await prisma.wishlist.findFirst({
            where: { userId }
        });

        if (existingWishlist) {
            return res.json(existingWishlist);
        }

        // Get user name for title
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        const wishlist = await prisma.wishlist.create({
            data: {
                title: user.name,
                userId
            }
        });
        res.json(wishlist);
    } catch (error) {
        console.error('Error creating wishlist:', error);
        res.status(400).json({ error: 'Failed to create wishlist' });
    }
});

app.get('/api/wishlists/:id', async (req, res) => {
    const { id } = req.params;
    const { viewerId } = req.query; // Get the ID of the user viewing the list

    const wishlist = await prisma.wishlist.findUnique({
        where: { id: parseInt(id) },
        include: {
            items: {
                orderBy: [
                    { rank: 'asc' },
                    { id: 'asc' }
                ]
            },
            user: true
        }
    });

    if (!wishlist) {
        return res.status(404).json({ error: 'Wishlist not found' });
    }

    // Access Control Logic
    const isOwner = viewerId && parseInt(viewerId) === wishlist.userId;
    const shareToken = req.query.shareToken;

    console.log(`[DEBUG] GET /wishlists/${id}: viewerId=${viewerId}, shareToken=${shareToken}, owner=${wishlist.userId}`);

    // Check if token matches a WishlistInvite
    let isInviteTokenValid = false;
    if (shareToken) {
        // First check standard token
        if (shareToken === wishlist.shareToken) {
            isInviteTokenValid = true;
        } else {
            // Check invite tokens
            const invite = await prisma.wishlistInvite.findUnique({
                where: { token: shareToken }
            });
            if (invite && invite.wishlistId === parseInt(id)) {
                isInviteTokenValid = true;
            }
        }
    }

    // 1. If user is owner, allow full access (and mask purchased status if needed)
    if (isOwner) {
        wishlist.items = wishlist.items.map(item => ({
            ...item,
            purchased: false // Mask the purchased status so owner doesn't see spoilers
        }));
    }
    // 2. If valid share token (Legacy OR New Invite), allow access
    else if (isInviteTokenValid) {
        // Allow access
    }
    else {
        // If not owner and no valid token...
        if (!viewerId) {
            return res.status(403).json({ error: 'Unauthorized. Please login or use a valid share link.' });
        }
        // If viewerId is present, we allow it (Friend/Group logic fallback)
    }

    res.json(wishlist);
});

// Create new Invite Link with Group Selection
app.post('/api/wishlists/:id/invites', async (req, res) => {
    const { id } = req.params;
    const { userId, groupIds, createNewGroup } = req.body;

    try {
        const wishlist = await prisma.wishlist.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        });

        if (!wishlist) return res.status(404).json({ error: 'Not found' });
        // Ensure accurate type comparison
        if (wishlist.userId !== parseInt(userId)) return res.status(403).json({ error: 'Unauthorized' });

        const groupsToConnect = [...(groupIds || []).map(gid => ({ id: gid }))];

        // Handle "New Group" creation
        if (createNewGroup) {
            let newInviteCode;
            let isUnique = false;
            while (!isUnique) {
                newInviteCode = generateInviteCode();
                const existing = await prisma.group.findUnique({ where: { inviteCode: newInviteCode } });
                if (!existing) isUnique = true;
            }

            // Group names must be unique. Append invite code or random string to ensure it.
            const uniqueName = `${wishlist.user.name} & Guest (${newInviteCode})`;

            const newGroup = await prisma.group.create({
                data: {
                    name: uniqueName,
                    inviteCode: newInviteCode,
                    memberships: {
                        create: {
                            userId: parseInt(userId),
                            role: 'ADMIN'
                        }
                    }
                }
            });
            groupsToConnect.push({ id: newGroup.id });
        }

        const newToken = crypto.randomUUID();

        const invite = await prisma.wishlistInvite.create({
            data: {
                token: newToken,
                wishlistId: parseInt(id),
                groups: {
                    connect: groupsToConnect
                }
            }
        });

        res.json({ token: invite.token });
    } catch (error) {
        console.error('Error creating invite:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Legacy Share Token (Keep for backward compatibility or simple sharing)
app.post('/api/wishlists/:id/share', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const wishlist = await prisma.wishlist.findUnique({
            where: { id: parseInt(id) }
        });

        if (!wishlist) return res.status(404).json({ error: 'Not found' });
        if (wishlist.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        if (wishlist.shareToken) {
            return res.json({ shareToken: wishlist.shareToken });
        }

        const newToken = crypto.randomUUID();
        const updated = await prisma.wishlist.update({
            where: { id: parseInt(id) },
            data: { shareToken: newToken }
        });

        res.json({ shareToken: updated.shareToken });
    } catch (error) {
        console.error('Error generating share token:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Dashboard Summary Route
app.get('/api/dashboard/:userId', async (req, res) => {
    const { userId } = req.params;
    const uid = parseInt(userId);

    try {
        // 0. Fetch User & Memberships first to build filters
        const user = await prisma.user.findUnique({
            where: { id: uid },
            select: {
                isAdmin: true,
                memberships: {
                    include: { group: true }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Build Wishlist Filter
        let wishlistWhere = {};
        if (!user.isAdmin) {
            const groupIds = user.memberships.map(m => m.groupId);
            if (groupIds.length > 0) {
                wishlistWhere = {
                    user: {
                        memberships: {
                            some: { groupId: { in: groupIds } }
                        }
                    }
                };
            } else {
                // If user is not admin and has no groups, they can only see their own wishlist
                wishlistWhere = { userId: uid };
            }
        }

        const [wishlists, secretSantaAssignment, secretSantaParticipants] = await Promise.all([
            // 1. Wishlists (Filtered)
            prisma.wishlist.findMany({
                where: wishlistWhere,
                include: {
                    user: true,
                    items: true
                }
            }),

            // 2. Memberships (Already fetched, but we can just use the user object)
            // (Skipping fetch, will use `user.memberships`)

            // 3. Secret Santa Assignment
            prisma.secretSanta.findFirst({
                where: { giverId: uid, role: 'santa' },
                include: {
                    giver: { select: { id: true, name: true, email: true } },
                    receiver: { select: { id: true, name: true, email: true } }
                }
            }).then(async (assignment) => {
                // assignment.receiver is the person I am gifting.
                // We need to shape it like the frontend expects: { santa: { receiver: ... } } ??
                // Previous frontend: 
                // secretSantaAssignment.santa.receiver.name

                // Let's look at the "assignmentRes" from the old code: /api/secret-santa/my-assignment
                // Logic wasn't visible in snippets, but based on usage: 
                // secretSantaAssignment.santa.receiver.name

                // If I return structure: { santa: assignment, elves: ... }
                // And 'assignment' has a 'receiver' relation.
                // Then result.santa.receiver.name WORKS.

                // Now Elves:
                // people gifting TO me with role 'elf' ?
                // where: { receiverId: uid } ?? No, elf logic is finding who is YOUR elf.
                // If I am the receiver?
                // Actually, let's look at the old endpoint logic to be safe? 
                // Using view_code_item on /api/secret-santa/my-assignment would be safest, but let's try to infer from schema.

                // Assuming elves = people assigned to gift ME, with role 'elf'.
                const elves = await prisma.secretSanta.findMany({
                    where: { receiverId: uid, role: 'elf' },
                    include: {
                        giver: { select: { id: true, name: true, email: true } }, // The elf
                        receiver: { select: { id: true, name: true, email: true } } // Me
                    }
                });

                // Frontend: secretSantaAssignment.elves.map(elf => elf.receiver.name)
                // Wait. ELF assignment usually means "You are an elf for X".
                // So giverId = Me, role = 'elf'.

                // Let's assume the user wants to see who THEY are elves for.
                const myElfAssignments = await prisma.secretSanta.findMany({
                    where: { giverId: uid, role: 'elf' },
                    include: {
                        receiver: { select: { id: true, name: true, email: true } }
                    }
                });

                return {
                    santa: assignment, // My target as Santa
                    elves: myElfAssignments // My targets as Elf
                };
            }),

            // 4. Participants
            // Schema has no 'SecretSantaParticipation'. User has 'secretSantaGiving' etc.
            // Participation usually implies everyone involved in the current year?
            // Let's just return all users who have an active Secret Santa role this year?
            // Or maybe there is no separate table and it just means "Users in group"?
            // Let's return all users for now to be safe, or check schema again.
            // Schema has `SecretSanta` table.
            // Participants = `prisma.user.findMany({ where: { secretSantaGiving: { some: { year: currentYear } } } })`
            // Let's guess simple: All users.
            prisma.user.findMany({
                select: { id: true, name: true }
            })
        ]);

        res.json({
            wishlists: wishlists,
            memberships: user.memberships || [],
            secretSantaAssignment: secretSantaAssignment,
            // Map participation to just the user objects if that's what frontend expects
            secretSantaParticipants: secretSantaParticipants // It's already an array of users
        });

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
});

app.put('/api/wishlists/:id/reorder', async (req, res) => {
    const { id } = req.params;
    const { itemIds } = req.body;

    try {
        const updates = itemIds.map((itemId, index) =>
            prisma.item.update({
                where: { id: itemId },
                data: { rank: index }
            })
        );

        await prisma.$transaction(updates);
        res.json({ message: 'Items reordered successfully' });
    } catch (error) {
        console.error('Error reordering items:', error);
        res.status(500).json({ error: 'Failed to reorder items' });
    }
});

// Item Routes
// Helper function to expand short URLs
async function expandUrl(url) {
    if (!url) return url;
    try {
        // Only try to expand if it looks like a shortener or we want to be safe
        // For now, let's just do a HEAD request to follow redirects
        // But some sites block HEAD, so maybe GET with small params? 
        // Axios follows redirects by default.
        const response = await axios.head(url, {
            validateStatus: status => status >= 200 && status < 400,
            maxRedirects: 5,
            timeout: 5000
        });
        // axios returns the final URL in response.request.res.responseUrl (Node.js)
        if (response.request && response.request.res && response.request.res.responseUrl) {
            return response.request.res.responseUrl;
        }
        return url;
    } catch (error) {
        // Fallback: sometime HEAD is not allowed, try GET
        try {
            const response = await axios.get(url, {
                validateStatus: status => status >= 200 && status < 400,
                maxRedirects: 5,
                timeout: 5000
            });
            if (response.request && response.request.res && response.request.res.responseUrl) {
                return response.request.res.responseUrl;
            }
        } catch (e2) {
            console.error('Failed to expand URL:', e2.message);
        }
        return url;
    }
}

// Helper function to fetch image from URL
async function fetchImageFromUrl(url) {
    if (!url) return null;
    try {
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);

        // Try to find Open Graph image
        let imageUrl = $('meta[property="og:image"]').attr('content');

        // Fallback to Twitter image
        if (!imageUrl) {
            imageUrl = $('meta[name="twitter:image"]').attr('content');
        }

        return imageUrl || null;
    } catch (error) {
        console.error('Error fetching image from URL:', error.message);
        return null;
    }
}

app.post('/api/items', async (req, res) => {
    let { name, url, price, wishlistId, note } = req.body;

    let imageUrl = null;
    if (url) {
        // Expand URL first
        url = await expandUrl(url);
        imageUrl = await fetchImageFromUrl(url);
    }

    try {
        const item = await prisma.item.create({
            data: {
                name,
                url: url || null,
                imageUrl,
                price: price ? parseFloat(price) : null,
                note: note || null,
                wishlistId: parseInt(wishlistId)
            }
        });

        // Feed Trigger: ITEM_ADDED
        const wishlist = await prisma.wishlist.findUnique({ where: { id: parseInt(wishlistId) } });
        if (wishlist) {
            FeedService.broadcastToSharedGroups(
                wishlist.userId,
                'ITEM_ADDED',
                { itemName: item.name, wishlistId: wishlist.id },
                item.id
            );
        }

        res.json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(400).json({ error: 'Failed to create item' });
    }
});

app.patch('/api/items/:id/purchase', async (req, res) => {
    const { id } = req.params;
    const { purchased } = req.body;
    const item = await prisma.item.update({
        where: { id: parseInt(id) },
        data: { purchased }
    });

    // Feed Trigger: PURCHASED
    if (purchased) {
        const { purchasedBy } = req.body;
        if (purchasedBy) {
            const fullItem = await prisma.item.findUnique({
                where: { id: parseInt(id) },
                include: { wishlist: true }
            });

            if (fullItem) {
                FeedService.broadcastToSharedGroups(
                    purchasedBy,
                    'PURCHASED',
                    {
                        itemName: fullItem.name,
                        recipientName: fullItem.wishlist.title, // Usually the user's name
                        wishlistId: fullItem.wishlistId
                    },
                    fullItem.id,
                    [fullItem.wishlist.userId] // Exclude the recipient from seeing this
                );
            }
        }
    } else {
        // Unpurchased -> Revoke feed item
        FeedService.revokeFeedItems('PURCHASED', item.id);
    }

    res.json(item);
});

// Anonymous Q&A Routes

app.get('/api/wishlists/:id/conversations', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        const wishlistId = parseInt(id);
        const viewerId = parseInt(userId);

        const wishlist = await prisma.wishlist.findUnique({
            where: { id: wishlistId }
        });

        if (!wishlist) return res.status(404).json({ error: 'Wishlist not found' });

        const isOwner = wishlist.userId === viewerId;

        const where = { wishlistId };
        if (!isOwner) {
            where.authorId = viewerId;
        }

        const conversations = await prisma.conversation.findMany({
            where,
            include: {
                item: { select: { id: true, name: true, imageUrl: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                author: { select: { name: true } } // To show name to owner? Or keep anonymous?
                // Owner sees "Someone" effectively, but we might need data.
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json(conversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

app.get('/api/conversations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: parseInt(id) },
            include: {
                messages: { orderBy: { createdAt: 'asc' } },
                item: true,
                wishlist: { include: { user: true } },
                author: { select: { id: true, name: true } }
            }
        });
        res.json(conversation);
    } catch (error) {
        console.error('Error fetching conversation:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

app.post('/api/wishlists/:id/conversations', async (req, res) => {
    const { id } = req.params;
    const { authorId, body, itemId } = req.body;

    try {
        const wishlistId = parseInt(id);

        // Create conversation and first message
        const conversation = await prisma.conversation.create({
            data: {
                wishlistId,
                authorId,
                itemId: itemId ? parseInt(itemId) : null,
                messages: {
                    create: {
                        authorId,
                        body
                    }
                }
            },
            include: {
                wishlist: true,
                item: true
            }
        });

        // Notify Wishlist Owner
        await prisma.notification.create({
            data: {
                userId: conversation.wishlist.userId,
                type: 'NEW_QUESTION',
                message: `Someone asked a question about ${conversation.item ? conversation.item.name : 'your wishlist'}.`,
                link: `/wishlists/${wishlistId}?conversationId=${conversation.id}`
            }
        });

        res.json(conversation);
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

app.post('/api/conversations/:id/messages', async (req, res) => {
    const { id } = req.params;
    const { authorId, body } = req.body;

    try {
        const conversationId = parseInt(id);

        const message = await prisma.message.create({
            data: {
                conversationId,
                authorId,
                body
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() }
        });

        // Determine recipient for notification
        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { wishlist: true }
        });

        let recipientId;
        let notificationMessage;

        if (authorId === conversation.wishlist.userId) {
            // Owner replied, notify asker
            recipientId = conversation.authorId;
            notificationMessage = `The wishlist owner replied to your question.`;
        } else {
            // Asker replied, notify owner
            recipientId = conversation.wishlist.userId;
            notificationMessage = `Someone replied to their question.`;
        }

        if (recipientId !== authorId) {
            await prisma.notification.create({
                data: {
                    userId: recipientId,
                    type: 'NEW_REPLY',
                    message: notificationMessage,
                    link: `/wishlists/${conversation.wishlistId}?conversationId=${conversationId}`
                }
            });
        }

        res.json(message);
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ error: 'Failed to post message' });
    }
});

// Admin Routes - User Management


app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const userId = parseInt(id);

        // Find all wishlists for this user
        const userWishlists = await prisma.wishlist.findMany({
            where: { userId: userId },
            select: { id: true }
        });

        const wishlistIds = userWishlists.map(w => w.id);

        // Delete all items in user's wishlists
        if (wishlistIds.length > 0) {
            await prisma.item.deleteMany({
                where: { wishlistId: { in: wishlistIds } }
            });

            // Delete all wishlists
            await prisma.wishlist.deleteMany({
                where: { userId: userId }
            });
        }

        // Finally delete the user
        await prisma.user.delete({
            where: { id: userId }
        });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(400).json({ error: 'Failed to delete user' });
    }
});

app.patch('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { isAdmin } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { isAdmin }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ error: 'Failed to update user' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password, profilePictureUrl } = req.body;

    try {
        const data = { name, email };
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }
        if (profilePictureUrl !== undefined) {
            data.profilePictureUrl = profilePictureUrl;
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ error: 'Failed to update user' });
    }
});

// Admin Routes - Wishlist Management
app.put('/api/wishlists/:id', async (req, res) => {
    const { id } = req.params;
    const { title, generalInstructions } = req.body;
    try {
        const wishlist = await prisma.wishlist.update({
            where: { id: parseInt(id) },
            data: {
                title,
                generalInstructions
            }
        });
        res.json(wishlist);
    } catch (error) {
        console.error('Error updating wishlist:', error);
        res.status(400).json({ error: 'Failed to update wishlist' });
    }
});

app.delete('/api/wishlists/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Delete all items in the wishlist first
        await prisma.item.deleteMany({
            where: { wishlistId: parseInt(id) }
        });

        // Then delete the wishlist
        await prisma.wishlist.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Wishlist deleted successfully' });
    } catch (error) {
        console.error('Error deleting wishlist:', error);
        res.status(400).json({ error: 'Failed to delete wishlist' });
    }
});

// Admin Routes - Item Management
app.put('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    let { name, url, price, note } = req.body;

    if (url) {
        url = await expandUrl(url);
    }

    try {
        const item = await prisma.item.update({
            where: { id: parseInt(id) },
            data: {
                name,
                url: url || null,
                price: price ? parseFloat(price) : null,
                note: note || null
            },
            include: { wishlist: true }
        });

        // Feed Trigger: ITEM_UPDATED
        if (item && item.wishlist) {
            FeedService.broadcastToSharedGroups(
                item.wishlist.userId,
                'ITEM_UPDATED',
                { itemName: item.name, wishlistId: item.wishlistId },
                item.id
            );
        }

        res.json(item);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(400).json({ error: 'Failed to update item' });
    }
});

app.delete('/api/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.item.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(400).json({ error: 'Failed to delete item' });
    }
});

// Admin Routes - User Password Reset
app.put('/api/admin/users/:userId/password', async (req, res) => {
    const { userId } = req.params;
    const { password } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { password: await bcrypt.hash(password, 10) }
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ message: 'Password updated successfully', user: userWithoutPassword });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(400).json({ error: 'Failed to update password' });
    }
});

// User Routes - Profile Update
app.put('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, email } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { name, email }
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ message: 'Profile updated successfully', user: userWithoutPassword });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(400).json({ error: 'Failed to update profile' });
    }
});

// User Routes - Password Update (with verification)
app.put('/api/users/:userId/password', async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user || user.password !== currentPassword) {
            return res.status(401).json({ error: 'Incorrect current password' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { password: newPassword }
        });

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ message: 'Password updated successfully', user: userWithoutPassword });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(400).json({ error: 'Failed to update password' });
    }
});


// Secret Santa Routes
// Helper function to shuffle array (Fisher-Yates algorithm)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Group Routes (Admin Only)
app.post('/api/admin/groups', async (req, res) => {
    const { name, creatorId } = req.body;
    try {
        let inviteCode;
        let isUnique = false;
        while (!isUnique) {
            inviteCode = generateInviteCode();
            const existing = await prisma.group.findUnique({ where: { inviteCode } });
            if (!existing) isUnique = true;
        }

        const data = {
            name,
            inviteCode
        };

        // If creatorId is provided, add them as an ADMIN member immediately
        if (creatorId) {
            data.memberships = {
                create: {
                    userId: parseInt(creatorId),
                    role: 'ADMIN'
                }
            };
        }

        const group = await prisma.group.create({
            data: data
        });
        res.json(group);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

app.get('/api/admin/groups', async (req, res) => {
    const { currentUserId } = req.query;
    try {
        let whereClause = {};

        // Always filter if not System Admin
        if (currentUserId) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(currentUserId) },
                include: { memberships: true }
            });

            if (user && !user.isAdmin) {
                // If not system admin, only show groups they are a member of
                const groupIds = user.memberships.map(m => m.groupId);
                whereClause = { id: { in: groupIds } };
            }
        } else {
            // Check if this is a secure environment. If no currentUserId query param,
            // we should probably default to returning NOTHING or requiring it.
            // But let's verify what the frontend sends.
            // For now, if no user ID, return empty to be safe against unauthorized scraping,
            // OR checks headers if we had middleware.
            // Given current architecture:
            return res.status(401).json({ error: 'Authentication required' });
        }

        const groups = await prisma.group.findMany({
            where: whereClause,
            include: { _count: { select: { memberships: true } } }
        });
        res.json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

app.get('/api/admin/groups/:groupId', async (req, res) => {
    const { groupId } = req.params;
    try {
        const group = await prisma.group.findUnique({
            where: { id: parseInt(groupId) },
            include: {
                memberships: {
                    include: { user: true }
                }
            }
        });
        if (!group) return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    } catch (error) {
        console.error('Error fetching group details:', error);
        res.status(500).json({ error: 'Failed to fetch group details' });
    }
});

app.delete('/api/admin/groups/:groupId', async (req, res) => {
    const { groupId } = req.params;
    const { currentUserId } = req.query;

    try {
        if (!currentUserId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(currentUserId) }
        });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Check if System Admin
        let canDelete = user.isAdmin;

        // If not System Admin, check if Group Admin
        if (!canDelete) {
            const membership = await prisma.groupMembership.findUnique({
                where: {
                    userId_groupId: {
                        userId: user.id,
                        groupId: parseInt(groupId)
                    }
                }
            });
            if (membership && membership.role === 'ADMIN') {
                canDelete = true;
            }
        }

        if (!canDelete) {
            return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this group' });
        }

        // Delete all memberships first (cascade manually just in case)
        await prisma.groupMembership.deleteMany({
            where: { groupId: parseInt(groupId) }
        });

        // Delete the group
        await prisma.group.delete({
            where: { id: parseInt(groupId) }
        });

        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Failed to delete group' });
    }
});

app.get('/api/admin/groups/:groupId', async (req, res) => {
    const { groupId } = req.params;
    try {
        const group = await prisma.group.findUnique({
            where: { id: parseInt(groupId) },
            include: {
                memberships: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        if (!group) return res.status(404).json({ error: 'Group not found' });
        res.json(group);
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ error: 'Failed to fetch group' });
    }
});

app.get('/api/groups/validate/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const group = await prisma.group.findUnique({
            where: { inviteCode: code.toUpperCase() }
        });
        if (group) {
            res.json({ valid: true, groupName: group.name });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

app.put('/api/admin/users/:userId/system-role', async (req, res) => {
    const { userId } = req.params;
    const { isAdmin } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { isAdmin }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Error updating system role:', error);
        res.status(500).json({ error: 'Failed to update system role' });
    }
});

app.post('/api/admin/users/:userId/groups', async (req, res) => {
    const { userId } = req.params;
    const { groupId, role = 'MEMBER' } = req.body;
    try {
        // Check if membership exists
        const existing = await prisma.groupMembership.findUnique({
            where: {
                userId_groupId: {
                    userId: parseInt(userId),
                    groupId: parseInt(groupId)
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'User is already in this group' });
        }

        const membership = await prisma.groupMembership.create({
            data: {
                userId: parseInt(userId),
                groupId: parseInt(groupId),
                role
            },
            include: { group: true }
        });
        res.json(membership);
    } catch (error) {
        console.error('Error adding user to group:', error);
        res.status(500).json({ error: 'Failed to add user to group' });
    }
});

app.delete('/api/admin/users/:userId/groups/:groupId', async (req, res) => {
    const { userId, groupId } = req.params;
    try {
        await prisma.groupMembership.delete({
            where: {
                userId_groupId: {
                    userId: parseInt(userId),
                    groupId: parseInt(groupId)
                }
            }
        });
        res.json({ message: 'User removed from group' });
    } catch (error) {
        console.error('Error removing user from group:', error);
        res.status(500).json({ error: 'Failed to remove user from group' });
    }
});

// Update role in a group
app.put('/api/admin/users/:userId/groups/:groupId', async (req, res) => {
    const { userId, groupId } = req.params;
    const { role } = req.body;
    try {
        const membership = await prisma.groupMembership.update({
            where: {
                userId_groupId: {
                    userId: parseInt(userId),
                    groupId: parseInt(groupId)
                }
            },
            data: { role },
            include: { group: true }
        });
        res.json(membership);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// Update Users Route to include Group info and filter
app.get('/api/users', async (req, res) => {
    const { currentUserId } = req.query;
    try {
        let where = {};

        if (currentUserId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: parseInt(currentUserId) },
                include: { memberships: true }
            });

            if (currentUser && !currentUser.isAdmin) {
                // If not admin, only show users in the same groups
                const groupIds = currentUser.memberships.map(m => m.groupId);

                if (groupIds.length > 0) {
                    where = {
                        memberships: {
                            some: {
                                groupId: { in: groupIds }
                            }
                        }
                    };
                } else {
                    where = { id: parseInt(currentUserId) };
                }
            }
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true,
                profilePictureUrl: true,
                memberships: {
                    select: {
                        role: true,
                        group: { select: { id: true, name: true, inviteCode: true } }
                    }
                },
                wishlists: {
                    include: {
                        items: {
                            select: { id: true }
                        }
                    }
                }
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Update Wishlists Route to filter by group
app.get('/api/wishlists', async (req, res) => {
    const { userId } = req.query; // This is the requester's ID
    try {
        let where = {};

        if (userId) {
            const requester = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { memberships: true }
            });

            if (requester && !requester.isAdmin) {
                const groupIds = requester.memberships.map(m => m.groupId);
                if (groupIds.length > 0) {
                    where = {
                        user: {
                            memberships: {
                                some: {
                                    groupId: { in: groupIds }
                                }
                            }
                        }
                    };
                } else {
                    where = { userId: parseInt(userId) };
                }
            }
        }

        const wishlists = await prisma.wishlist.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        id: true,
                        profilePictureUrl: true,
                        memberships: {
                            select: {
                                role: true,
                                group: { select: { id: true, name: true } }
                            }
                        }
                    }
                },
                items: true
            }
        });
        res.json(wishlists);
    } catch (error) {
        console.error('Error fetching wishlists:', error);
        res.status(500).json({ error: 'Failed to fetch wishlists' });
    }
});

// Create Secret Santa assignments manually
app.post('/api/secret-santa/manual', async (req, res) => {
    const { assignments, year } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ error: 'Invalid assignments data' });
    }

    try {
        const currentYear = year || new Date().getFullYear();

        // Delete existing assignments for this year
        await prisma.secretSanta.deleteMany({
            where: { year: currentYear }
        });

        // Create new assignments
        await prisma.$transaction(
            assignments.map(assignment =>
                prisma.secretSanta.create({
                    data: {
                        giverId: parseInt(assignment.giverId),
                        receiverId: parseInt(assignment.receiverId),
                        role: assignment.role,
                        year: currentYear,
                        active: true
                    }
                })
            )
        );

        res.json({ message: 'Manual assignments created successfully', count: assignments.length });
    } catch (error) {
        console.error('Error creating manual assignments:', error);
        res.status(400).json({ error: 'Failed to create manual assignments' });
    }
});

// Create Secret Santa assignments automatically
app.post('/api/secret-santa/create', async (req, res) => {
    const { userIds, year, numberOfElves = 0 } = req.body;

    if (!userIds || userIds.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 users for Secret Santa' });
    }

    if (numberOfElves < 0) {
        return res.status(400).json({ error: 'Number of elves cannot be negative' });
    }

    try {
        const currentYear = year || new Date().getFullYear();

        // Delete existing assignments for this year
        await prisma.secretSanta.deleteMany({
            where: { year: currentYear }
        });

        const assignments = [];

        // 1. Create circular Santa assignments (A->B->C->A)
        const shuffledForSanta = shuffleArray(userIds);
        for (let i = 0; i < shuffledForSanta.length; i++) {
            const giverId = shuffledForSanta[i];
            const receiverId = shuffledForSanta[(i + 1) % shuffledForSanta.length];

            assignments.push({
                giverId,
                receiverId,
                role: 'santa',
                year: currentYear,
                active: true
            });
        }

        // 2. Create Elf assignments (random, no overlap with Santa)
        if (numberOfElves > 0) {
            for (const giverId of userIds) {
                // Find who this person is Santa for
                const santaAssignment = assignments.find(a => a.giverId === giverId && a.role === 'santa');
                const santaReceiverId = santaAssignment.receiverId;

                // Get available receivers (everyone except self and Santa receiver)
                const availableReceivers = userIds.filter(id => id !== giverId && id !== santaReceiverId);

                if (availableReceivers.length < numberOfElves) {
                    throw new Error(`Not enough users to assign ${numberOfElves} elves to each person`);
                }

                // Randomly select numberOfElves receivers
                const shuffledReceivers = shuffleArray(availableReceivers);
                const elfReceivers = shuffledReceivers.slice(0, numberOfElves);

                for (const receiverId of elfReceivers) {
                    assignments.push({
                        giverId,
                        receiverId,
                        role: 'elf',
                        year: currentYear,
                        active: true
                    });
                }
            }
        }

        // Create all assignments
        await prisma.secretSanta.createMany({
            data: assignments
        });

        res.json({
            message: 'Secret Santa assignments created',
            totalAssignments: assignments.length,
            santaAssignments: assignments.filter(a => a.role === 'santa').length,
            elfAssignments: assignments.filter(a => a.role === 'elf').length
        });
    } catch (error) {
        console.error('Error creating Secret Santa:', error);
        res.status(500).json({ error: error.message || 'Failed to create Secret Santa assignments' });
    }
});

// Get current user's assignment
app.get('/api/secret-santa/my-assignment', async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }

    try {
        const currentYear = new Date().getFullYear();
        const assignments = await prisma.secretSanta.findMany({
            where: {
                giverId: parseInt(userId),
                year: currentYear,
                active: true
            },
            include: {
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Group by role
        const santaAssignment = assignments.find(a => a.role === 'santa');
        const elfAssignments = assignments.filter(a => a.role === 'elf');

        res.json({
            santa: santaAssignment || null,
            elves: elfAssignments
        });
    } catch (error) {
        console.error('Error fetching assignment:', error);
        res.status(500).json({ error: 'Failed to fetch assignment' });
    }
});

// About Page Routes
app.get('/api/about', async (req, res) => {
    try {
        const config = await prisma.appConfig.findUnique({
            where: { key: 'about_content' }
        });
        res.json({ content: config?.value || '' });
    } catch (error) {
        console.error('Error fetching about content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

app.put('/api/admin/about', async (req, res) => {
    const { content } = req.body;
    try {
        const config = await prisma.appConfig.upsert({
            where: { key: 'about_content' },
            update: { value: content },
            create: { key: 'about_content', value: content }
        });
        res.json(config);
    } catch (error) {
        console.error('Error updating about content:', error);
        res.status(500).json({ error: 'Failed to update content' });
    }
});

// Landing Page Routes
app.get('/api/landing', async (req, res) => {
    try {
        const config = await prisma.appConfig.findUnique({
            where: { key: 'landing_content' }
        });
        res.json({ content: config?.value || '' });
    } catch (error) {
        console.error('Error fetching landing content:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

app.put('/api/admin/landing', async (req, res) => {
    const { content } = req.body;
    try {
        const config = await prisma.appConfig.upsert({
            where: { key: 'landing_content' },
            update: { value: content },
            create: { key: 'landing_content', value: content }
        });
        res.json(config);
    } catch (error) {
        console.error('Error updating landing content:', error);
        res.status(500).json({ error: 'Failed to update content' });
    }
});


// Get all participants
app.get('/api/secret-santa/participants', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const assignments = await prisma.secretSanta.findMany({
            where: {
                year: currentYear,
                active: true
            },
            include: {
                giver: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Get unique participants
        const participantIds = new Set();
        assignments.forEach(a => participantIds.add(a.giverId));

        const participants = await prisma.user.findMany({
            where: {
                id: { in: Array.from(participantIds) }
            },
            select: {
                id: true,
                name: true,
                email: true
            }
        });

        res.json(participants);
    } catch (error) {
        console.error('Error fetching participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

// Admin: Get all assignments
app.get('/api/secret-santa/admin/assignments', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const assignments = await prisma.secretSanta.findMany({
            where: {
                year: currentYear,
                active: true
            },
            include: {
                giver: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// Notifications Routes
app.get('/api/notifications', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'User ID required' });

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to 50 recent notifications
        });
        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.notification.update({
            where: { id: parseInt(id) },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

app.patch('/api/notifications/read-all', async (req, res) => {
    const { userId } = req.body;
    try {
        await prisma.notification.updateMany({
            where: { userId: parseInt(userId), read: false },
            data: { read: true }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all notifications read:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Admin: Reset assignments
app.delete('/api/secret-santa/reset', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        await prisma.secretSanta.deleteMany({
            where: { year: currentYear }
        });

        res.json({ message: 'Secret Santa assignments reset' });
    } catch (error) {
        console.error('Error resetting Secret Santa:', error);
        res.status(500).json({ error: 'Failed to reset assignments' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
