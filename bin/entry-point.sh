#!/bin/bash
# Entry point script to run both the main server and the invoice scheduler

# Start the invoice service in the background
node ./scripts/invoice-service.js &
INVOICE_SERVICE_PID=$!

# Start the main server
node server.js &
SERVER_PID=$!

# Function to handle shutdown
function shutdown() {
  echo "Shutting down services..."
  kill -TERM $INVOICE_SERVICE_PID
  kill -TERM $SERVER_PID
  exit 0
}

# Register the shutdown function for signals
trap shutdown SIGTERM SIGINT

# Keep the container running
wait $SERVER_PID