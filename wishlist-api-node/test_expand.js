const axios = require('axios');

async function expandUrl(url) {
    if (!url) return url;
    console.log(`Checking URL: ${url}`);
    try {
        // Try HEAD first
        console.log("Attempting HEAD request...");
        const response = await axios.head(url, {
            validateStatus: status => status >= 200 && status < 400,
            maxRedirects: 5
        });

        console.log(`HEAD status: ${response.status}`);

        if (response.request && response.request.res && response.request.res.responseUrl) {
            console.log(`Expanded URL (HEAD): ${response.request.res.responseUrl}`);
            return response.request.res.responseUrl;
        }

    } catch (error) {
        console.log(`HEAD failed: ${error.message}`);

        // Try GET
        try {
            console.log("Attempting GET request...");
            const response = await axios.get(url, {
                validateStatus: status => status >= 200 && status < 400,
                maxRedirects: 5
            });

            console.log(`GET status: ${response.status}`);

            if (response.request && response.request.res && response.request.res.responseUrl) {
                console.log(`Expanded URL (GET): ${response.request.res.responseUrl}`);
                return response.request.res.responseUrl;
            }
        } catch (e2) {
            console.log(`GET failed: ${e2.message}`);
        }
    }
    return url;
}

// Test with a sample link
// Using the one found in search: https://a.co/d/7Z2aY2P
// Also trying a non-existent one?
// Let's use a known one if possible. 
// https://a.co/d/2hM4x2k (random generated string often invalid, but let's try the one from search result)
// https://a.co/d/7Z2aY2P

expandUrl('https://a.co/d/7Z2aY2P');
