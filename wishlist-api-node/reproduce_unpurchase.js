const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FeedService = require('./services/FeedService');

async function verifyUnpurchase() {
    console.log('🔄 Starting Verification...');

    // 1. Setup Data
    console.log('setup data...');
    const userA = await prisma.user.create({
        data: { name: 'User A', email: `usera_${Date.now()}@test.com`, password: 'password' }
    });
    const userB = await prisma.user.create({
        data: { name: 'User B', email: `userb_${Date.now()}@test.com`, password: 'password' }
    });
    const userC = await prisma.user.create({
        data: { name: 'User C', email: `userc_${Date.now()}@test.com`, password: 'password' }
    });

    const group = await prisma.group.create({
        data: {
            name: `Group ${Date.now()}`,
            inviteCode: `G${Date.now()}`
        }
    });

    await prisma.groupMembership.createMany({
        data: [
            { userId: userA.id, groupId: group.id },
            { userId: userB.id, groupId: group.id },
            { userId: userC.id, groupId: group.id }
        ]
    });

    const wishlist = await prisma.wishlist.create({
        data: { title: 'User A Wishlist', userId: userA.id }
    });

    const item = await prisma.item.create({
        data: { name: 'Test Item', wishlistId: wishlist.id }
    });

    // 2. User B purchases item
    console.log('User B purchasing item...');
    // Simulate what the API does
    await prisma.item.update({
        where: { id: item.id },
        data: { purchased: true }
    });

    // Feed Trigger Logic (simulated call)
    await FeedService.broadcastToSharedGroups(
        userB.id,
        'PURCHASED',
        { itemName: item.name, recipientName: 'User A', wishlistId: wishlist.id },
        item.id,
        [userA.id]
    );

    // Wait for async broadcast
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Verify Feed Item Exists (For User C)
    let feedItems = await prisma.feedItem.findMany({
        where: { relatedId: item.id, type: 'PURCHASED', userId: userC.id }
    });
    console.log(`Feed items after purchase: ${feedItems.length}`);
    if (feedItems.length === 0) throw new Error('Feed item not created!');

    // 4. User B un-purchases item
    console.log('User B un-purchasing item...');
    await prisma.item.update({
        where: { id: item.id },
        data: { purchased: false }
    });

    // Clean up logic (simulated call - this is what we added)
    await FeedService.revokeFeedItems('PURCHASED', item.id);

    // 5. Verify Feed Item Removed
    feedItems = await prisma.feedItem.findMany({
        where: { relatedId: item.id, type: 'PURCHASED' }
    });
    console.log(`Feed items after un-purchase: ${feedItems.length}`);

    if (feedItems.length === 0) {
        console.log('✅ Verification Passed: Feed item removed.');
    } else {
        console.error('❌ Verification Failed: Feed item still exists.');
    }

    // Cleanup
    await prisma.feedItem.deleteMany({ where: { relatedId: item.id } });
    await prisma.item.delete({ where: { id: item.id } });
    await prisma.wishlist.delete({ where: { id: wishlist.id } });
    await prisma.groupMembership.deleteMany({ where: { groupId: group.id } });
    await prisma.group.delete({ where: { id: group.id } });
    await prisma.user.delete({ where: { id: userA.id } });
    await prisma.user.delete({ where: { id: userB.id } });
}

verifyUnpurchase()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
