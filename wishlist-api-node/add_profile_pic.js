const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('No users found');
        return;
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
            profilePictureUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.name}`
        }
    });

    console.log('Updated user profile picture:', updatedUser.email);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
