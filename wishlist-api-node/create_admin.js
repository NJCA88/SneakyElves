const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@example.com';
    const password = 'password123';
    const name = 'Admin User';

    console.log(`Checking for user with email: ${email}`);

    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log('User not found. Creating new user...');
        user = await prisma.user.create({
            data: {
                email,
                name,
                password, // Plaintext fallback supported
                isAdmin: true
            }
        });
        console.log('User created successfully.');

        // Create a wishlist for the new user
        await prisma.wishlist.create({
            data: {
                title: name,
                userId: user.id
            }
        });
        console.log('Wishlist created for user.');

    } else {
        console.log('User found. Updating admin status and password...');
        user = await prisma.user.update({
            where: { email },
            data: {
                isAdmin: true,
                password: password // Reset password
            }
        });
        console.log('User updated successfully.');
    }

    console.log('User details:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
