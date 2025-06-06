const express = require('express');
const path = require('path');
const cors = require('cors');
const fileOps = require('./src/fileOperations');
const config = require('./src/config');
const { router } = require('./src/routes');

if (process.env.NODE_ENV !== 'production') {
  const livereload = require('livereload');
  const liveReloadServer = livereload.createServer({
    exts: ['html', 'css', 'js', 'json'],
    debug: true
  });
  liveReloadServer.watch([
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, 'src')
  ]);
  console.log('LiveReload server started');
}

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

fileOps.createRequiredDirectories();

app.use('/media', express.static(config.OUTPUT_DIR, {
  dotfiles: 'allow',
  setHeaders: (res, path) => {
    if (path.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.set('Content-Type', 'video/webm');
    }
  }
}));

// Disable caching in development
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, '..', 'public'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');
    }
  }));
} else {
  app.use(express.static(path.join(__dirname, '..', 'public')));
}

app.get('/', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    const fs = require('fs');
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace('</body>', 
      '<script src="http://localhost:35729/livereload.js?snipver=1"></script></body>');
    res.send(html);
  } else {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    res.sendFile(indexPath);
  }
});

app.use(router);

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
