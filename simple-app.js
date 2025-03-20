// simple-app.js
const express = require('express');
const app = express();

// Show exactly what environment variables we have
console.log("Environment variables:");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("All env variables:", Object.keys(process.env));

app.get('/', (req, res) => {
  res.json({
    message: 'Hello World! The server is running properly.',
    env: {
      port: process.env.PORT,
      node_env: process.env.NODE_ENV
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server started successfully and listening on port ${PORT}`);
});