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
    const adminEmail = 'admin@example.com';
    const groupName = 'Test Group';

    console.log(`🔍 Finding user ${adminEmail}...`);
    const user = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (!user) {
        console.error('❌ User not found');
        return;
    }

    console.log(`✨ Creating group "${groupName}"...`);

    let inviteCode;
    let isUnique = false;
    while (!isUnique) {
        inviteCode = generateInviteCode();
        const existing = await prisma.group.findUnique({ where: { inviteCode } });
        if (!existing) isUnique = true;
    }

    const group = await prisma.group.create({
        data: {
            name: groupName,
            inviteCode,
            users: {
                connect: { id: user.id }
            }
        }
    });

    console.log(`✅ Assigned ${adminEmail} to group "${group.name}" (Invite Code: ${group.inviteCode})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
