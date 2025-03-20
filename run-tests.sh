#!/bin/bash

# Set NODE_ENV to test to ensure consistent behavior
export NODE_ENV=test

# Clear Jest cache
echo "Clearing Jest cache..."
npx jest --clearCache

# Run invoice-service.test.js with --no-cache to prevent caching issues
echo "Running invoice-service tests..."
npx jest __tests__/unit/modules/invoice-service.test.js --no-cache --verbose

# If successful, run invoice-flow.test.js
if [ $? -eq 0 ]; then
  echo -e "\nRunning invoice-flow tests..."
  npx jest __tests__/integration/end-to-end/invoice-flow.test.js --no-cache --verbose
fi
