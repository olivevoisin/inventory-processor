#!/bin/bash

# Remove all mock files that might be causing conflicts
rm -rf modules/invoice-processor-stub.js modules/translation-service-mock.js
rm -rf __mocks__/modules __mocks__/utils
rm -rf __mocks__/tesseract.js __mocks__/node-cron.js __mocks__/fs.js

# Clean up old config mock if it exists
rm -f __mocks__/config.js
