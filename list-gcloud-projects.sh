#!/bin/bash

# List all projects accessible to your account
echo "Listing all Google Cloud projects you have access to:"
gcloud projects list

# The output will show project names and their IDs
# Copy the correct project ID for your inventory application