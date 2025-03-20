#!/bin/bash
npx jest __tests__/unit/modules/invoice-service.test.js __tests__/integration/end-to-end/invoice-flow.test.js --verbose
