#!/bin/bash
echo "🚀 Starting Backend Deployment to Cloud Run..."

# Add gcloud to PATH
export PATH="/Users/chriszou/Downloads/google-cloud-sdk/bin:$PATH"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed or not in PATH."
    exit 1
fi

PROJECT_ID="allmygifts"
REGION="us-central1"
SERVICE_NAME="wishlist-api"

echo "👉 Using Project: $PROJECT_ID"
echo "👉 Using Region: $REGION"

# DATABASE_URL is NOT set here. It lives only in the Cloud Run service settings
# (Neon). Deploys keep the existing value via --update-env-vars below.

echo "🏗  Submitting build to Cloud Build..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME --project $PROJECT_ID

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --project $PROJECT_ID \
  --allow-unauthenticated \
  --min-instances 0 \
  --timeout 300 \
  --cpu-boost \
  --update-env-vars GOOGLE_CLIENT_ID="496031209257-7kjroq2tihte2mc8a29slolbi75ukcn7.apps.googleusercontent.com"

echo "✅ Deployment complete!"
