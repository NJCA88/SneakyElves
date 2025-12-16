const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: 'admin@example.com' }
    });

    if (existingAdmin) {
        console.log('✅ Admin user already exists');
        return;
    }

    // Create admin user
    const adminUser = await prisma.user.create({
        data: {
            name: 'Admin',
            email: 'admin@example.com',
            password: 'admin',
            isAdmin: true
        }
    });

    console.log('✅ Created admin user:', adminUser.email);

    // Create default wishlist for admin
    const adminWishlist = await prisma.wishlist.create({
        data: {
            title: 'Admin',
            userId: adminUser.id
        }
    });

    console.log('✅ Created admin wishlist');
    console.log('🌱 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
