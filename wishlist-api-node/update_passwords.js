const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Update all users
    const updateResult = await prisma.user.updateMany({
        data: {
            password: 'test'
        }
    });
    console.log(`Updated ${updateResult.count} users.`);

    // Verify specifically for the requested user if they exist
    const specificUser = await prisma.user.findUnique({
        where: { email: 'chriszou25+wishlist1@gmail.com' }
    });

    if (specificUser) {
        console.log(`User chriszou25+wishlist1@gmail.com found. Password is now: ${specificUser.password}`);
    } else {
        console.log('User chriszou25+wishlist1@gmail.com not found.');
    }

    const allUsers = await prisma.user.findMany({
        select: { email: true, password: true }
    });
    console.log('All users:', allUsers);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
