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

// Set paths from URL when any request comes in
app.use((req, res, next) => {
  // Set paths based on URL parameters
  config.setPathsFromUrl(req.url);
  next();
});

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

// New endpoint to get current paths
app.get('/api/config/paths', (req, res) => {
  res.json({
    fromPath: config.OUTPUT_DIR,
    toPath: config.LOCAL_COPY_DIR,
    defaultFromPath: config.DEFAULT_OUTPUT_DIR,
    defaultToPath: config.DEFAULT_SORTED_DIR
  });
});

// New endpoint to update paths
app.post('/api/config/paths', (req, res) => {
  const { fromPath, toPath } = req.body;
  
  if (fromPath) {
    config.OUTPUT_DIR = fromPath;
  }
  
  if (toPath) {
    config.LOCAL_COPY_DIR = toPath;
  }
  
  res.json({
    fromPath: config.OUTPUT_DIR,
    toPath: config.LOCAL_COPY_DIR
  });
});

// Apply API routes
app.use(router);

// Start the server
app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
