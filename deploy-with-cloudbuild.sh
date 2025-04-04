#!/bin/bash

# Exit on any error
set -e

# Configuration - replace YOUR_PROJECT_ID with the correct ID from the list-gcloud-projects.sh output
PROJECT_ID="voices-453402"  # <-- CHANGE THIS with your actual project ID
SERVICE_NAME="inventory-processor"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Show current configuration
echo "Deploying with the following configuration:"
echo "Project ID: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"
echo "Image: $IMAGE_NAME"
echo ""

# Confirm with user
read -p "Is this configuration correct? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Deployment aborted. Please update the script with the correct project ID."
    exit 1
fi

# Ensure gcloud is configured to use the correct project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Build the image using Cloud Build
echo "Building image using Google Cloud Build..."
gcloud builds submit --tag $IMAGE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 5m \
  --set-env-vars="NODE_ENV=production" \
  --env-vars-file=.env.yaml

echo "Deployment completed successfully!"
echo "Service URL: $(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')"