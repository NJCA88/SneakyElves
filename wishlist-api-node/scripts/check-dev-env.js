// Safety check for local development.
//
// Local dev uses the same Neon database as production, but its own Postgres
// schema (e.g. "dev") so test data never mixes with real data. This refuses to
// continue unless DATABASE_URL points at a non-public schema, so a local run can
// never read or write production's tables by accident.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fail = (msg) => {
    console.error(`\n❌ ${msg}\n\nSee "Local development" in README.md.\n`);
    process.exit(1);
};

const raw = process.env.DATABASE_URL;
if (!raw) fail('DATABASE_URL is not set. Copy wishlist-api-node/.env.example to wishlist-api-node/.env and fill it in.');

let url;
try {
    url = new URL(raw);
} catch {
    fail('DATABASE_URL in wishlist-api-node/.env is not a valid URL.');
}

const schema = url.searchParams.get('schema');
if (!schema) fail('DATABASE_URL has no "schema=" parameter. Add "&schema=dev" to the end so local runs use the dev schema, not production.');
if (schema.toLowerCase() === 'public') fail('DATABASE_URL uses schema=public, which is PRODUCTION. Use "&schema=dev" for local development.');
if (url.searchParams.has('channel_binding')) fail('Remove "&channel_binding=require" from DATABASE_URL (Prisma does not support it).');

console.log(`✅ Local dev database: ${url.hostname}, schema "${schema}" (production data is untouched)`);
