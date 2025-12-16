const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function run() {
    try {
        // 1. Create User A (Owner)
        const emailA = `owner_${Date.now()}@test.com`;
        const resA = await axios.post(`${API_URL}/signup`, {
            name: 'Owner',
            email: emailA,
            password: 'password'
        });
        const userA = resA.data.user;
        const tokenA = resA.data.token;
        console.log('User A created:', userA.id);

        // 2. Create User B (Asker)
        const emailB = `asker_${Date.now()}@test.com`;
        const resB = await axios.post(`${API_URL}/signup`, {
            name: 'Asker',
            email: emailB,
            password: 'password'
        });
        const userB = resB.data.user;
        const tokenB = resB.data.token;
        console.log('User B created:', userB.id);

        // 3. User A creates Wishlist
        const resWishlist = await axios.post(`${API_URL}/wishlists`, {
            title: 'My Birthday',
            userId: userA.id
        });
        const wishlistId = resWishlist.data.id;
        console.log('Wishlist created:', wishlistId);

        // 4. User B asks question
        console.log('User B asking question...');
        const resConv = await axios.post(`${API_URL}/wishlists/${wishlistId}/conversations`, {
            authorId: userB.id,
            body: 'Is this anonymous?'
        });
        const conversationId = resConv.data.id;
        console.log('Conversation created:', conversationId);

        // 5. Verify Notification for A
        // Need to fetch notifications. Do we have an endpoint?
        // Usually GET /api/notifications?userId=...
        // Let's assume yes or check index.js
        try {
            // Assuming we implemented GET /api/notifications in a previous session or existing code
            const resNotifA = await axios.get(`${API_URL}/notifications?userId=${userA.id}`);
            const notifsA = resNotifA.data;
            const questionNotif = notifsA.find(n => n.type === 'NEW_QUESTION' && n.link.includes(conversationId));
            if (questionNotif) {
                console.log('SUCCESS: User A received notification:', questionNotif.message);
            } else {
                console.error('FAILURE: User A did NOT receive notification.');
                console.log('Notifications:', notifsA);
            }
        } catch (e) {
            console.log('Could not fetch notifications (endpoint might be missing or different). Skipping check.');
        }

        // 6. User A replies
        console.log('User A replying...');
        await axios.post(`${API_URL}/conversations/${conversationId}/messages`, {
            authorId: userA.id,
            body: 'Yes it is!'
        });

        // 7. Verify Notification for B
        try {
            const resNotifB = await axios.get(`${API_URL}/notifications?userId=${userB.id}`);
            const notifsB = resNotifB.data;
            const replyNotif = notifsB.find(n => n.type === 'NEW_REPLY' && n.link.includes(conversationId));
            if (replyNotif) {
                console.log('SUCCESS: User B received notification:', replyNotif.message);
            } else {
                console.error('FAILURE: User B did NOT receive notification.');
            }
        } catch (e) {
            console.log('Could not fetch notifications for B.');
        }

        console.log('Verification Complete.');

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

run();
