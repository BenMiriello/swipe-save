const express = require('express');
const path = require('path');
const cors = require('cors');
const fileOps = require('./src/fileOperations');
const config = require('./src/config');
const { router } = require('./src/routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create required directories
fileOps.createRequiredDirectories();

// Serve static files from the output directory
app.use('/media', express.static(config.OUTPUT_DIR, {
  dotfiles: 'allow',
  setHeaders: (res, path) => {
    // Set proper content type based on file extension
    if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    }
  }
}));

// Serve the frontend files from the public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Add a route handler for the root path
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  res.sendFile(indexPath);
});

// Apply API routes
app.use(router);

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
