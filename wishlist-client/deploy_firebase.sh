#!/bin/bash
# Build the site with .env.production and deploy it to Firebase Hosting.
set -euo pipefail
cd "$(dirname "$0")"

echo "🏗  Building..."
npm ci --silent
npm run build

echo "🚀 Deploying to Firebase Hosting..."
# Bill API calls to the Firebase project itself (Cloud Shell otherwise uses
# "allmygifts", where the Firebase Management API is disabled).
CLOUDSDK_CORE_PROJECT=wishlist-app-416ee GOOGLE_CLOUD_QUOTA_PROJECT=wishlist-app-416ee \
  npx -y firebase-tools deploy --only hosting --project wishlist-app-416ee

echo "✅ Deployment complete!"
