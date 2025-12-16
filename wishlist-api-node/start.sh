echo "Pushing schema to database (forcing sync)..."
npx prisma db push --accept-data-loss

echo "Seeding database..."
npx prisma db seed || true

echo "Starting application..."
node index.js
