const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const content = `
# About Our Wishlist App

Welcome to the **Wishlist App**! This is a place where you can share your wishes with friends and family.

## Features
- Create and manage your own wishlists
- View friends' wishlists
- Secret Santa assignments
- Community sharing

## Contact
If you have any questions, please contact the admin.
  `;

    await prisma.appConfig.upsert({
        where: { key: 'about_content' },
        update: { value: content.trim() },
        create: { key: 'about_content', value: content.trim() }
    });

    console.log('✅ About content seeded');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
