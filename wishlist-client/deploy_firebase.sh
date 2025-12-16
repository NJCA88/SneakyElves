#!/bin/bash
echo "🚀 Starting Firebase Deployment Setup..."

# Set PATH to include Node.js
# Set PATH to include Node.js
# export PATH=/Users/chriszou/.gemini/antigravity/scratch/wishlist_app/node-v22.12.0-darwin-arm64/bin:$PATH

# Navigate to the client directory
cd "/Users/chriszou/Desktop/antigravity projects/wishlist_app/wishlist-client"

# echo "🔑 Please log in to Firebase:"
# npx firebase login

# echo "🛠  Initializing Firebase project..."
# npx firebase init hosting

echo "🏗  Building the project..."
npm run build

echo "🚀 Deploying to Firebase..."
npx firebase deploy --only hosting

echo "✅ Deployment complete!"
