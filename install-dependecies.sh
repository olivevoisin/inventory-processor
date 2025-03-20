#!/bin/bash
# Script to install all required testing dependencies

echo "Installing test dependencies..."

# Core testing libraries
npm install --save-dev jest supertest

# Database testing
npm install --save-dev mongodb-memory-server

# Mocking and assertions
npm install --save-dev jest-mock

# Coverage reporting
npm install --save-dev codecov

# Runtime dependencies used in tests
npm install --save compression express cors helmet tesseract.js winston

echo "Creating test directories if they don't exist..."

# Create test directories
mkdir -p __tests__/fixtures/unit/voice-processor
mkdir -p __tests__/fixtures/unit/invoice-processor
mkdir -p __tests__/fixtures/integration/routes
mkdir -p __tests__/fixtures/e2e/invoice-flow
mkdir -p __tests__/fixtures/e2e/voice-flow
mkdir -p __tests__/mocks
mkdir -p __tests__/helpers

# Copy mock implementations if they don't exist
if [ ! -f "__tests__/mocks/app.js" ]; then
  echo "Creating mock app.js..."
  cp mock-app-fix.js __tests__/mocks/app.js
fi

if [ ! -f "__tests__/mocks/tesseract.js" ]; then
  echo "Creating mock tesseract.js..."
  cp tesseract-mock.js __tests__/mocks/tesseract.js
fi

if [ ! -f "__tests__/mocks/winston.js" ]; then
  echo "Creating mock winston.js..."
  cp winston-mock.js __tests__/mocks/winston.js
fi

if [ ! -f "__tests__/mocks/logger.js" ]; then
  echo "Creating mock logger.js..."
  cp logger-mock.js __tests__/mocks/logger.js
fi

# Create test setup file if it doesn't exist
if [ ! -f "__tests__/helpers/jest.setup.js" ]; then
  echo "Creating Jest setup file..."
  cp jest-setup.js __tests__/helpers/jest.setup.js
fi

echo "Setup complete. You can now run your tests with 'npm test'"