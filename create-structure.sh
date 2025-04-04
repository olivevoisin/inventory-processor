#!/bin/bash
# Create test directory structure
mkdir -p __tests__/unit/{modules,utils,middleware,routes}
mkdir -p __tests__/integration/{api,end-to-end}
mkdir -p __tests__/fixtures/{audio,invoices,responses}
mkdir -p __tests__/helpers
mkdir -p __mocks__/{external-libs,modules,utils}

# Create a basic README in each directory to explain its purpose
echo "# Unit Tests\nTests for individual functions and modules in isolation." > __tests__/unit/README.md
echo "# Module Tests\nTests for core business logic modules." > __tests__/unit/modules/README.md
echo "# Utility Tests\nTests for utility functions." > __tests__/unit/utils/README.md
echo "# Middleware Tests\nTests for Express middleware." > __tests__/unit/middleware/README.md
echo "# Route Tests\nTests for API route handlers." > __tests__/unit/routes/README.md
echo "# Integration Tests\nTests for interactions between modules." > __tests__/integration/README.md
echo "# API Tests\nTests for API endpoints." > __tests__/integration/api/README.md
echo "# End-to-End Tests\nTests for complete workflows." > __tests__/integration/end-to-end/README.md
echo "# Test Fixtures\nSample data for tests." > __tests__/fixtures/README.md
echo "# Test Helpers\nHelper functions and setup for tests." > __tests__/helpers/README.md
echo "# Mocks\nMock implementations for external modules." > __mocks__/README.md

echo "Directory structure created successfully!"
