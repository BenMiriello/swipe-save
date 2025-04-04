const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// Config
const OUTPUT_DIR = path.resolve(process.env.HOME, 'Documents/ComfyUI/outputs');
const LOCAL_COPY_DIR = path.resolve(process.env.HOME, 'Documents/copies_from_swipe-save');
const DELETED_DIR = path.join(OUTPUT_DIR, 'deleted');

// Create needed directories if they don't exist
if (!fs.existsSync(DELETED_DIR)) {
  fs.mkdirSync(DELETED_DIR, { recursive: true });
}

if (!fs.existsSync(LOCAL_COPY_DIR)) {
  fs.mkdirSync(LOCAL_COPY_DIR, { recursive: true });
}

// Serve static files from the outputs directory
app.use('/media', express.static(OUTPUT_DIR));

// Serve the frontend files from the public directory
// Note the '..' to go up one directory level
app.use(express.static(path.join(__dirname, '..', 'public')));

// Add a route handler for the root path specifically
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  console.log('Trying to serve index from:', indexPath);
  console.log('File exists?', fs.existsSync(indexPath));
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Index file not found. Check server configuration.');
  }
});

// Get list of media files
app.get('/api/files', (req, res) => {
  const mediaFiles = [];
  
  fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter(entry => !entry.isDirectory()) // Skip directories
    .filter(file => /\.(png|mp4|webm)$/i.test(file.name)) // Only media files
    .forEach(file => {
      const stats = fs.statSync(path.join(OUTPUT_DIR, file.name));
      mediaFiles.push({
        name: file.name,
        path: `/media/${file.name}`,
        size: stats.size,
        date: stats.mtime
      });
    });
  
  // Sort by most recent first
  mediaFiles.sort((a, b) => b.date - a.date);
  
  res.json(mediaFiles);
});

// Handle file operations (swipe actions)
app.post('/api/files/action', (req, res) => {
  const { filename, action } = req.body;
  const sourcePath = path.join(OUTPUT_DIR, filename);
  
  try {
    switch(action) {
      case 'left':
      case 'right': {
        // Create date folder
        const dateFolder = moment().format('YYYYMMDD');
        const dateFolderPath = path.join(OUTPUT_DIR, dateFolder);
        
        if (!fs.existsSync(dateFolderPath)) {
          fs.mkdirSync(dateFolderPath, { recursive: true });
        }
        
        // Move to date folder
        const destPath = path.join(dateFolderPath, filename);
        fs.moveSync(sourcePath, destPath);
        
        // If swiped right, also copy to local directory
        if (action === 'right') {
          // Create date folder in local copy directory too
          const copyDateFolder = path.join(LOCAL_COPY_DIR, dateFolder);
          if (!fs.existsSync(copyDateFolder)) {
            fs.mkdirSync(copyDateFolder, { recursive: true });
          }
          
          // Copy with the same filename
          const copyPath = path.join(copyDateFolder, filename);
          fs.copySync(destPath, copyPath);
        }
        break;
      }
      
      case 'up': {
        // Add asterisk to filename for "super save"
        const directory = path.dirname(sourcePath);
        const starredFilename = `* ${filename}`;
        const destPath = path.join(directory, starredFilename);
        fs.renameSync(sourcePath, destPath);
        break;
      }
      
      case 'down': {
        // Move to deleted folder
        const destPath = path.join(DELETED_DIR, filename);
        fs.moveSync(sourcePath, destPath);
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling file action:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`View the app at http://localhost:${PORT}`);
});
