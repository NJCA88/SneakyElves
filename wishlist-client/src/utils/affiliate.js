export const addAffiliateTag = (url) => {
    if (!url) return url;

    // Configurable tag from environment variable
    const AMAZON_TAG = import.meta.env.VITE_AMAZON_AFFILIATE_TAG || 'amazon_affiliate_tag_here';

    try {
        // basic check if it is a string
        if (typeof url !== 'string') return url;

        // Attempt to parse URL. If it fails (e.g. relative URL or just messy text), we return original.
        // We add 'http://' if missing to help parsing, though for display we might want to be careful.
        // Actually, users usually paste full URLs.
        let urlObj;
        try {
            urlObj = new URL(url);
        } catch (e) {
            // attempt to fix missing protocol
            if (!url.match(/^https?:\/\//)) {
                try {
                    urlObj = new URL('https://' + url);
                } catch (e2) {
                    return url;
                }
            } else {
                return url;
            }
        }

        const hostname = urlObj.hostname.toLowerCase();

        // Amazon domains
        // This covers amazon.com, www.amazon.com, smile.amazon.com, amazon.co.uk etc. if we want to be broad
        // For now, let's target specific common ones or a regex
        if (hostname.includes('amazon.') || hostname.includes('amzn.')) {
            // CAREFUL: amzn.to is a shortener, we can't add params easily without breaking it potentially if it expects none or specific ones,
            // but usually we can't edit shortlinks. 
            // We should only target the main domains where we know ?tag= works.

            if (hostname.match(/(^|\.)(amazon|amzn)\.(com|co\.uk|ca|de|fr|es|it|co\.jp|in|cn|mx|au|br)$/)) {
                // Check if tag already exists? We usually want to overwrite or ensure ours is there.
                // If we want to replace:
                urlObj.searchParams.set('tag', AMAZON_TAG);
                return urlObj.toString();
            }
        }

        return url;

    } catch (e) {
        console.error("Error parsing URL for affiliate tag", e);
        return url;
    }
};
