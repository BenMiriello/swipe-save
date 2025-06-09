const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const fileOps = require('../src/fileOperations');

describe('File Operations', () => {
  let testDir;
  let sourceFile;
  let destFile;

  beforeEach(async () => {
    // Create a temporary directory for each test
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-ops-test-'));
    sourceFile = path.join(testDir, 'source.txt');
    destFile = path.join(testDir, 'dest.txt');
    
    // Create a test file
    await fs.writeFile(sourceFile, 'test content');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  describe('moveFile', () => {
    test('should move file from source to destination', () => {
      const result = fileOps.moveFile(sourceFile, destFile);
      
      expect(result).toBe(true);
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(destFile)).toBe(true);
    });

    test('should create destination directory if it does not exist', () => {
      const destDir = path.join(testDir, 'new-dir');
      const destInNewDir = path.join(destDir, 'dest.txt');
      
      const result = fileOps.moveFile(sourceFile, destInNewDir);
      
      expect(result).toBe(true);
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(destInNewDir)).toBe(true);
    });

    test('should return false if source file does not exist', () => {
      const nonExistentFile = path.join(testDir, 'nonexistent.txt');
      
      const result = fileOps.moveFile(nonExistentFile, destFile);
      
      expect(result).toBe(false);
    });

    test('should overwrite existing destination file', async () => {
      // Create a file at destination first
      await fs.writeFile(destFile, 'existing content');
      
      const result = fileOps.moveFile(sourceFile, destFile);
      
      expect(result).toBe(true);
      expect(fs.existsSync(sourceFile)).toBe(false);
      expect(fs.existsSync(destFile)).toBe(true);
      
      const content = await fs.readFile(destFile, 'utf8');
      expect(content).toBe('test content');
    });
  });

  describe('copyFile', () => {
    test('should copy file from source to destination', () => {
      const result = fileOps.copyFile(sourceFile, destFile);
      
      expect(result).toBe(true);
      expect(fs.existsSync(sourceFile)).toBe(true);
      expect(fs.existsSync(destFile)).toBe(true);
    });
  });
});