#!/bin/bash
echo "Running invoice-service tests..."
npx jest __tests__/unit/modules/invoice-service.test.js --verbose

echo -e "\nRunning invoice-flow tests..."
npx jest __tests__/integration/end-to-end/invoice-flow.test.js --verbose
