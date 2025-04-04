FROM node:14

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
RUN npm install express csv-parser

# Create necessary directories for reports
RUN mkdir -p reports

# Copy application code
COPY ./src ./src
COPY sample-data.json .

# Expose the port the app runs on
EXPOSE 8080

# Command to run the application
CMD ["node", "src/index.js"]