const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("1. Finding test users...");
        // Find a group with at least 2 members
        const group = await prisma.group.findFirst({
            where: {
                memberships: {
                    some: {}
                }
            },
            include: {
                memberships: {
                    include: { user: true }
                }
            }
        });

        if (!group || group.memberships.length < 2) {
            console.log("Not enough users in a group to test.");
            return;
        }

        const owner = group.memberships[0].user;
        const buyer = group.memberships[1].user;

        console.log(`Owner: ${owner.name} (${owner.id})`);
        console.log(`Buyer: ${buyer.name} (${buyer.id})`);

        // Find or create an item for the owner
        let wishlist = await prisma.wishlist.findFirst({
            where: { userId: owner.id }
        });

        if (!wishlist) {
            wishlist = await prisma.wishlist.create({
                data: {
                    title: "Test Wishlist",
                    userId: owner.id
                }
            });
        }

        let item = await prisma.item.findFirst({
            where: { wishlistId: wishlist.id }
        });

        if (!item) {
            item = await prisma.item.create({
                data: {
                    name: "Test Item",
                    wishlistId: wishlist.id
                }
            });
        }

        // Reset purchased status
        await prisma.item.update({
            where: { id: item.id },
            data: { purchased: false }
        });

        console.log(`Test Item: ${item.name} (${item.id})`);

        console.log("2. Simulating purchase...");
        const response = await axios.patch(`http://localhost:3000/api/items/${item.id}/purchase`, {
            purchased: true,
            purchasedBy: buyer.id
        });

        if (response.status === 200) {
            console.log("Purchase API call successful.");
        } else {
            console.error("Purchase API call failed:", response.status);
        }

        // Wait a bit for async processing
        await new Promise(r => setTimeout(r, 2000));

        console.log("3. Checking feed...");

        // Helper to check feed
        const checkFeed = async (userId, userName, shouldExist) => {
            const feedItem = await prisma.feedItem.findFirst({
                where: {
                    userId: userId,
                    type: 'PURCHASED',
                    relatedId: item.id,
                    createdAt: { gt: new Date(Date.now() - 10000) } // Created in last 10s
                }
            });

            if (shouldExist && feedItem) {
                console.log(`✅ [PASS] ${userName} received feed item.`);
            } else if (shouldExist && !feedItem) {
                console.log(`❌ [FAIL] ${userName} DID NOT receive feed item.`);
            } else if (!shouldExist && !feedItem) {
                console.log(`✅ [PASS] ${userName} correctly did NOT receive feed item.`);
            } else {
                console.log(`❌ [FAIL] ${userName} received feed item but SHOULD NOT have.`);
            }
        };

        // Owner should NOT see it
        await checkFeed(owner.id, "Owner", false);

        // Buyer should see it (assuming they are in the group, usually broadcast goes to everyone but actor? wait, actor is buyer)
        // Actually FeedService excludes actor by default: `userId: { not: actorId }`.
        // So Buyer shouldn't see it either because they are the actor.
        await checkFeed(buyer.id, "Buyer (Actor)", false);

        // Third party?
        if (group.memberships.length > 2) {
            const observer = group.memberships[2].user;
            await checkFeed(observer.id, "Observer", true);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
