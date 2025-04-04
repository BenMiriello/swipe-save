const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// Config
const OUTPUT_DIR = path.resolve(process.env.HOME, 'Documents/ComfyUI/output');
const LOCAL_COPY_DIR = path.resolve(process.env.HOME, 'Documents/ComfyUI/output/copies_from_swipe-save');
const DELETED_DIR = path.join(OUTPUT_DIR, 'deleted');

// Create needed directories if they don't exist
if (!fs.existsSync(DELETED_DIR)) {
  fs.mkdirSync(DELETED_DIR, { recursive: true });
}

if (!fs.existsSync(LOCAL_COPY_DIR)) {
  fs.mkdirSync(LOCAL_COPY_DIR, { recursive: true });
}

// Action history for undo functionality
const actionHistory = [];

// Serve static files from the output directory
app.use('/media', express.static(OUTPUT_DIR, {
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
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Index file not found. Check server configuration.');
  }
});

// Get list of media files
app.get('/api/files', (req, res) => {
  const mediaFiles = [];

  try {
    const entries = fs.readdirSync(OUTPUT_DIR, { withFileTypes: true });

    const mediaEntries = entries
      .filter(entry => !entry.isDirectory()) // Skip directories
      .filter(file => /\.(png|mp4|webm)$/i.test(file.name)) // Only media files
      .filter(file => !file.name.startsWith('._')); // Skip dot-underscore files

    mediaEntries.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file.name);
      const stats = fs.statSync(filePath);

      // Use encodeURIComponent to handle special characters in filenames
      const encodedFilename = encodeURIComponent(file.name);

      mediaFiles.push({
        name: file.name,
        path: `/media/${encodedFilename}`,
        size: stats.size,
        date: stats.mtime
      });
    });

    // Sort by most recent first
    mediaFiles.sort((a, b) => b.date - a.date);
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  res.json(mediaFiles);
});

// Media file handler
app.get('/media/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(OUTPUT_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      // Set headers to prevent caching issues
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'no-store');
      
      // Set content type based on file extension
      if (filename.toLowerCase().endsWith('.png')) {
        res.set('Content-Type', 'image/png');
      } else if (filename.toLowerCase().endsWith('.mp4')) {
        res.set('Content-Type', 'video/mp4');
      } else if (filename.toLowerCase().endsWith('.webm')) {
        res.set('Content-Type', 'video/webm');
      }
      
      // Stream the file
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Server error');
  }
});

// Get action history for undo
app.get('/api/history', (req, res) => {
  res.json(actionHistory);
});

// Undo last action
app.post('/api/undo', (req, res) => {
  try {
    if (actionHistory.length === 0) {
      return res.status(400).json({ error: 'No actions to undo' });
    }
    
    const lastAction = actionHistory.pop();
    
    // Reverse the last action
    if (lastAction.sourcePath && lastAction.destPath) {
      // Check if destination file still exists
      if (fs.existsSync(lastAction.destPath)) {
        // Move the file back to its original location
        fs.moveSync(lastAction.destPath, lastAction.sourcePath, { overwrite: true });
      }
    }
    
    res.json({ success: true, undoneAction: lastAction });
  } catch (error) {
    console.error('Error undoing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle file operations (swipe actions)
app.post('/api/files/action', (req, res) => {
  const { filename, action } = req.body;
  const sourcePath = path.join(OUTPUT_DIR, filename);
  
  try {
    let actionRecord = {
      action,
      filename,
      sourcePath,
      timestamp: new Date().toISOString()
    };

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
        actionRecord.destPath = destPath;
        
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
          actionRecord.copyPath = copyPath;
        }
        break;
      }
      
      case 'up': {
        // Add asterisk to filename for "super save"
        const directory = path.dirname(sourcePath);
        const starredFilename = `* ${filename}`;
        const destPath = path.join(directory, starredFilename);
        fs.renameSync(sourcePath, destPath);
        actionRecord.destPath = destPath;
        break;
      }
      
      case 'down': {
        // Move to deleted folder
        const destPath = path.join(DELETED_DIR, filename);
        fs.moveSync(sourcePath, destPath);
        actionRecord.destPath = destPath;
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Add action to history
    actionHistory.push(actionRecord);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error handling file action:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
