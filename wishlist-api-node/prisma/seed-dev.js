// Test data for LOCAL DEVELOPMENT ONLY (runs against the dev schema).
// Safe to run repeatedly: anything that already exists is left alone.
//
// Log in locally with:  dev.admin@example.com / devpassword   (site admin)
//                       dev.alice@example.com / devpassword   (regular user)
require('../scripts/check-dev-env.js');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const PASSWORD = 'devpassword';

const USERS = [
    { email: 'dev.admin@example.com', name: 'Dev Admin', isAdmin: true, items: [] },
    { email: 'dev.alice@example.com', name: 'Alice Dev', items: [['Cozy wool socks', 18, 'Size M'], ['Pour-over kettle', 45, null], ['Mystery novel', 16, null]] },
    { email: 'dev.ben@example.com', name: 'Ben Dev', items: [['Running headphones', 79, 'Wireless'], ['Hot sauce sampler', 30, null]] },
    { email: 'dev.carmen@example.com', name: 'Carmen Dev', items: [['Watercolor set', 35, 'Beginner friendly'], ['Houseplant', 22, null]] },
];

async function main() {
    const group = await prisma.group.upsert({
        where: { name: 'Dev group' },
        update: {},
        create: { name: 'Dev group', inviteCode: 'DEV001' },
    });

    const hash = await bcrypt.hash(PASSWORD, 10);
    for (const u of USERS) {
        const existing = await prisma.user.findUnique({ where: { email: u.email } });
        if (existing) {
            console.log(`• ${u.email} already exists`);
            continue;
        }
        const user = await prisma.user.create({
            data: {
                email: u.email,
                name: u.name,
                password: hash,
                isAdmin: !!u.isAdmin,
                memberships: { create: { groupId: group.id, role: u.isAdmin ? 'ADMIN' : 'MEMBER' } },
                wishlists: {
                    create: {
                        title: u.name,
                        items: { create: u.items.map(([name, price, note], rank) => ({ name, price, note, rank })) },
                    },
                },
            },
        });
        console.log(`✓ created ${user.email}`);
    }
    console.log(`\nDev logins (password "${PASSWORD}"): ${USERS.map(u => u.email).join(', ')}`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
