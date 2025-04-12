#!/bin/bash
# Script to fix the npm ci error by recreating the package-lock.json file

echo "Fixing npm ci issue by recreating package-lock.json..."

# Remove package-lock.json if it exists
if [ -f package-lock.json ]; then
  echo "Removing existing package-lock.json..."
  rm package-lock.json
fi

# Run npm install to regenerate package-lock.json
echo "Running npm install to regenerate package-lock.json..."
npm install

echo "Fix complete. You can now run 'npm ci' to install dependencies."
