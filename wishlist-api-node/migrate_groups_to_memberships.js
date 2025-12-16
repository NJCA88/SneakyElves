const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log('Starting migration from users.groupId to GroupMembership...');

    try {
        // 1. Fetch all users who are currently in a group
        const usersInGroups = await prisma.user.findMany({
            where: {
                groupId: {
                    not: null
                }
            }
        });

        console.log(`Found ${usersInGroups.length} users in groups to migrate.`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of usersInGroups) {
            if (!user.groupId) continue;

            // Check if membership already exists to avoid duplicates
            const existing = await prisma.groupMembership.findUnique({
                where: {
                    userId_groupId: {
                        userId: user.id,
                        groupId: user.groupId
                    }
                }
            });

            if (existing) {
                console.log(`Skipping User ${user.id} (already migrated)`);
                skippedCount++;
                continue;
            }

            // Determine role: If they were "isAdmin", assume they are ADMIN of their group.
            // NOTE: This logic might need refinement if "isAdmin" meant "System Admin".
            // But for now, let's assume system admins are also group admins of their group.
            // Or safer: default to MEMBER unless specified.
            // The user prompt said: "As an admin, I can give anyone in a group the 'group admin' role"
            // So let's migrate EVERYONE as MEMBER first, except maybe the creator?
            // Actually, let's migrate `isAdmin` users as `ADMIN`. The super-admin can demote them later if needed.
            const role = user.isAdmin ? 'ADMIN' : 'MEMBER';

            await prisma.groupMembership.create({
                data: {
                    userId: user.id,
                    groupId: user.groupId,
                    role: role
                }
            });

            process.stdout.write('.');
            migratedCount++;
        }

        console.log('\nMigration complete.');
        console.log(`Migrated: ${migratedCount}`);
        console.log(`Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
