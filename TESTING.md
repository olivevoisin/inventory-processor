# Inventory Management System Testing Strategy

## Overview

This document outlines our testing strategy for the Inventory Management System, which includes voice processing, invoice OCR, Google Sheets integration, and scheduled tasks.

## Test Structure

Our tests are organized into three categories:

1. **Unit Tests** - Test individual functions and modules in isolation
2. **Integration Tests** - Test interactions between modules
3. **End-to-End Tests** - Test complete workflows

## Test Directory Structure
## Running Tests

```bash
# Run all tests
npm test

# Run with continuous monitoring
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only end-to-end tests
npm run test:e2e

# Run a specific test file
npx jest path/to/test.js

bash


bash
npm test
