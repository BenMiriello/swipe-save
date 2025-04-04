const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process');
const moment = require('moment');

const app = express();
app.use(cors());
app.use(express.json());

// Config
const OUTPUT_DIR = path.resolve(process.env.HOME, 'Documents/ComfyUI/outputs');
const MAC_DESTINATION = '/Volumes/Secure_Storage';

// Serve static files from the outputs directory
app.use('/media', express.static(OUTPUT_DIR));

// Get list of media files
app.get('/api/files', (req, res) => {
  const mediaFiles = [];
  
  fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })
    .filter(entry => !entry.isDirectory())
    .filter(file => /\.(png|mp4|webm)$/i.test(file.name))
    .forEach(file => {
      const stats = fs.statSync(path.join(OUTPUT_DIR, file.name));
      mediaFiles.push({
        name: file.name,
        path: `/media/${file.name}`,
        size: stats.size,
        date: stats.mtime
      });
    });
  
  res.json(mediaFiles);
});

// Handle file operations (swipe actions)
app.post('/api/files/action', (req, res) => {
  const { filename, action } = req.body;
  const sourcePath = path.join(OUTPUT_DIR, filename);
  
  // Create date folder
  const dateFolder = moment().format('YYYYMMDD');
  const dateFolderPath = path.join(OUTPUT_DIR, dateFolder);
  
  if (!fs.existsSync(dateFolderPath)) {
    fs.mkdirSync(dateFolderPath);
  }
  
  try {
    // Move to date folder
    const destPath = path.join(dateFolderPath, filename);
    fs.moveSync(sourcePath, destPath);
    
    // If swiped right, also copy to Mac
    if (action === 'right') {
      const macPath = path.join(MAC_DESTINATION, filename);
      fs.copySync(destPath, macPath);
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
});
