const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    try {
        const email = 'member@test.com';
        const password = await bcrypt.hash('password123', 10);
        const name = 'Test Member';

        // 1. Create or Update User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password,
                isAdmin: false // Ensure NOT system admin
            },
            create: {
                email,
                name,
                password,
                isAdmin: false
            }
        });

        console.log(`User ${email} setup complete.`);

        // 2. Create Group
        const group = await prisma.group.upsert({
            where: { inviteCode: 'TEST01' },
            update: {},
            create: {
                name: 'Members Only Group',
                inviteCode: 'TEST01'
            }
        });

        console.log(`Group ${group.name} setup complete.`);

        // 3. Add User to Group
        await prisma.groupMembership.upsert({
            where: {
                userId_groupId: {
                    userId: user.id,
                    groupId: group.id
                }
            },
            update: {},
            create: {
                userId: user.id,
                groupId: group.id,
                role: 'MEMBER'
            }
        });

        console.log(`Added ${email} to ${group.name}.`);

    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
