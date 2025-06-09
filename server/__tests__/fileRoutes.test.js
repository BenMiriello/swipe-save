const request = require('supertest');
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Mock the config to use test directories
const mockConfig = {
  OUTPUT_DIR: '',
  LOCAL_COPY_DIR: '',
  LOG_DIR: '',
  getCurrentConfig: () => ({ useDatestampFolders: false })
};

jest.mock('../src/config', () => mockConfig);

const { router } = require('../src/routes/file-routes');

describe('File Routes', () => {
  let app;
  let testDir;
  let sourceDir;
  let destDir;
  let testFile;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use(router);
  });

  beforeEach(async () => {
    // Create temporary directories for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'routes-test-'));
    sourceDir = path.join(testDir, 'source');
    destDir = path.join(testDir, 'dest');
    
    await fs.ensureDir(sourceDir);
    await fs.ensureDir(destDir);
    
    // Update mock config
    mockConfig.OUTPUT_DIR = sourceDir;
    mockConfig.LOCAL_COPY_DIR = destDir;
    mockConfig.LOG_DIR = path.join(testDir, 'logs');
    
    // Create a test file
    testFile = 'test.png';
    await fs.writeFile(path.join(sourceDir, testFile), 'test image content');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('POST /api/files/action', () => {
    test('should move file on archive action (left)', async () => {
      const response = await request(app)
        .post('/api/files/action')
        .send({
          filename: testFile,
          action: 'left'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // File should be moved from source to destination
      expect(fs.existsSync(path.join(sourceDir, testFile))).toBe(false);
      expect(fs.existsSync(path.join(destDir, testFile))).toBe(true);
    });

    test('should move file on saved action (right)', async () => {
      const response = await request(app)
        .post('/api/files/action')
        .send({
          filename: testFile,
          action: 'right'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // File should be moved from source to destination
      expect(fs.existsSync(path.join(sourceDir, testFile))).toBe(false);
      expect(fs.existsSync(path.join(destDir, testFile))).toBe(true);
    });

    test('should return 404 if file does not exist', async () => {
      const response = await request(app)
        .post('/api/files/action')
        .send({
          filename: 'nonexistent.png',
          action: 'left'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    test('should handle custom filename', async () => {
      const customName = 'custom-name.png';
      
      const response = await request(app)
        .post('/api/files/action')
        .send({
          filename: testFile,
          action: 'left',
          customFilename: customName
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // File should be moved with custom name
      expect(fs.existsSync(path.join(sourceDir, testFile))).toBe(false);
      expect(fs.existsSync(path.join(destDir, customName))).toBe(true);
    });
  });

  describe('POST /api/undo', () => {
    test('should undo last action', async () => {
      // First perform an action
      await request(app)
        .post('/api/files/action')
        .send({
          filename: testFile,
          action: 'left'
        });

      // Verify file was moved
      expect(fs.existsSync(path.join(sourceDir, testFile))).toBe(false);
      expect(fs.existsSync(path.join(destDir, testFile))).toBe(true);

      // Now undo
      const response = await request(app)
        .post('/api/undo');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // File should be back in source
      expect(fs.existsSync(path.join(sourceDir, testFile))).toBe(true);
      expect(fs.existsSync(path.join(destDir, testFile))).toBe(false);
    });

    test('should return error if no actions to undo', async () => {
      const response = await request(app)
        .post('/api/undo');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No actions to undo');
    });
  });
});