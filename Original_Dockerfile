FROM node:18-slim


# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Dockerfile addition for invoice scheduling
# Add this to your existing Dockerfile or adapt as needed

# Ensure we have the required dependencies
RUN npm install node-cron nodemailer --save


# Set up a volume for invoice files (if running locally)
VOLUME /app/data/invoices

# Copy the invoice processing scripts
COPY ./scripts/invoice-scheduler.js ./scripts/
COPY ./scripts/invoice-service.js ./scripts/
COPY ./scripts/process-invoices-now.js ./scripts/

# For demonstration, you could have a different entrypoint
# that runs both the main server and the scheduler
COPY ./entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Example entrypoint command
CMD [ "node", "app.js", "./entrypoint.sh"]

