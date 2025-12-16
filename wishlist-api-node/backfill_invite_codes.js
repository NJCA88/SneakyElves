const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateInviteCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

async function main() {
    console.log('🔄 Backfilling invite codes...');
    const groups = await prisma.group.findMany();

    console.log(`Found ${groups.length} groups to update.`);

    for (const group of groups) {
        let inviteCode;
        let isUnique = false;
        while (!isUnique) {
            inviteCode = generateInviteCode();
            const existing = await prisma.group.findUnique({ where: { inviteCode } });
            if (!existing) isUnique = true;
        }

        await prisma.group.update({
            where: { id: group.id },
            data: { inviteCode }
        });
        console.log(`✅ Updated group "${group.name}" with code: ${inviteCode}`);
    }

    console.log('✨ Backfill complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
