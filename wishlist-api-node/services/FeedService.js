const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FeedService = {
    /**
     * Broadcasts an event to all members of groups that the actor belongs to.
     * @param {number} actorId - The ID of the user performing the action.
     * @param {string} type - The type of event (e.g., 'ITEM_ADDED', 'PURCHASED').
     * @param {object} data - The data associated with the event.
     * @param {number|null} relatedId - Optional ID linking to the specific entity (e.g., Item ID).
     */
    async broadcastToSharedGroups(actorId, type, data, relatedId = null, excludeUserIds = []) {
        // Run async without awaiting to avoid blocking the request
        this._processBroadcast(actorId, type, data, relatedId, excludeUserIds).catch(err => {
            console.error('Feed broadcast failed:', err);
        });
    },

    async _processBroadcast(actorId, type, data, relatedId, excludeUserIds) {
        // 1. Find all groups the actor is in
        const memberships = await prisma.groupMembership.findMany({
            where: { userId: actorId },
            select: { groupId: true }
        });

        if (memberships.length === 0) return;

        const groupIds = memberships.map(m => m.groupId);

        // 2. Find all unique users in these groups (excluding actor and excluded users)
        const recipients = await prisma.groupMembership.findMany({
            where: {
                groupId: { in: groupIds },
                userId: { notIn: [actorId, ...excludeUserIds] }
            },
            distinct: ['userId'],
            select: { userId: true }
        });

        if (recipients.length === 0) return;

        // 3. Bulk insert FeedItems
        const feedItems = recipients.map(r => ({
            userId: r.userId,
            actorId: actorId,
            type,
            data: JSON.stringify(data),
            relatedId,
            createdAt: new Date()
        }));

        await prisma.feedItem.createMany({
            data: feedItems
        });

        console.log(`[Feed] Broadcasted ${type} from user ${actorId} to ${feedItems.length} recipients.`);
    },

    /**
     * Retrieves the feed for a specific user.
     * @param {number} userId 
     * @param {number} limit 
     * @param {number} offset 
     */
    async getUserFeed(userId, limit = 20, offset = 0) {
        const start = Date.now();
        const feed = await prisma.feedItem.findMany({
            where: { userId: parseInt(userId) },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        profilePictureUrl: true
                    }
                }
            }
        });
        const duration = Date.now() - start;
        console.log(`[BENCHMARK] Fetch Feed (limit=${limit}, offset=${offset}): ${duration}ms`);
        return feed;
    },

    /**
     * Revokes (deletes) feed items of a specific type related to a specific entity.
     * @param {string} type - The type of event (e.g., 'PURCHASED').
     * @param {number} relatedId - The ID of the related entity (e.g., Item ID).
     */
    async revokeFeedItems(type, relatedId) {
        if (!relatedId) return;
        try {
            const result = await prisma.feedItem.deleteMany({
                where: {
                    type: type,
                    relatedId: parseInt(relatedId)
                }
            });
            console.log(`[Feed] Revoked ${result.count} items of type ${type} for relatedId ${relatedId}`);
        } catch (error) {
            console.error('Error revoking feed items:', error);
        }
    }
};

module.exports = FeedService;
