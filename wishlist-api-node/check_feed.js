const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.feedItem.count();
        console.log('FeedItem count:', count);

        const users = await prisma.user.count();
        console.log('User count:', users);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
