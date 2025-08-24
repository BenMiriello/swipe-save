/**
 * Input Database Service
 * Handles all database operations for managed input files
 */

window.InputManager = window.InputManager || {};
window.InputManager.core = window.InputManager.core || {};

window.InputManager.core.InputDatabase = {
  
  /**
   * Initialize database schema for input files
   */
  async initializeSchema() {
    const db = window.AppDatabase;
    if (!db) {
      throw new Error('AppDatabase not available');
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS input_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sha256 TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        original_path TEXT,
        input_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        width INTEGER,
        height INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP,
        usage_count INTEGER DEFAULT 0
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_input_sha256 ON input_files(sha256)',
      'CREATE INDEX IF NOT EXISTS idx_input_created ON input_files(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_input_filename ON input_files(filename)'
    ];

    try {
      await db.run(createTableSQL);
      for (const indexSQL of createIndexes) {
        await db.run(indexSQL);
      }
      console.log('Input files database schema initialized');
    } catch (error) {
      console.error('Failed to initialize input database schema:', error);
      throw error;
    }
  },

  /**
   * Insert new managed input file record
   */
  async insertInputFile(record) {
    const db = window.AppDatabase;
    const sql = `
      INSERT INTO input_files 
      (sha256, filename, original_path, input_path, mime_type, file_size, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      record.sha256,
      record.filename,
      record.original_path,
      record.input_path,
      record.mime_type,
      record.file_size,
      record.width || null,
      record.height || null
    ];

    try {
      const result = await db.run(sql, params);
      console.log('Inserted input file:', record.filename, 'ID:', result.lastID);
      return result.lastID;
    } catch (error) {
      console.error('Failed to insert input file:', error);
      throw error;
    }
  },

  /**
   * Find existing file by SHA256 hash
   */
  async findBySHA(sha256) {
    const db = window.AppDatabase;
    const sql = 'SELECT * FROM input_files WHERE sha256 = ?';
    
    try {
      const result = await db.get(sql, [sha256]);
      return result || null;
    } catch (error) {
      console.error('Failed to find file by SHA:', error);
      throw error;
    }
  },

  /**
   * List all input files with sorting
   */
  async listAll(sortBy = 'created_at', order = 'DESC', limit = null, offset = 0) {
    const db = window.AppDatabase;
    const validSortColumns = ['filename', 'created_at', 'last_used_at', 'usage_count', 'file_size'];
    const validOrder = ['ASC', 'DESC'];
    
    if (!validSortColumns.includes(sortBy)) {
      sortBy = 'created_at';
    }
    if (!validOrder.includes(order.toUpperCase())) {
      order = 'DESC';
    }

    let sql = `SELECT * FROM input_files ORDER BY ${sortBy} ${order}`;
    const params = [];

    if (limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    try {
      const results = await db.all(sql, params);
      return results;
    } catch (error) {
      console.error('Failed to list input files:', error);
      throw error;
    }
  },

  /**
   * Update usage statistics when file is used
   */
  async updateUsage(id) {
    const db = window.AppDatabase;
    const sql = `
      UPDATE input_files 
      SET usage_count = usage_count + 1, 
          last_used_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    try {
      const result = await db.run(sql, [id]);
      if (result.changes === 0) {
        console.warn('No input file found with ID:', id);
      }
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to update usage for input file:', error);
      throw error;
    }
  },

  /**
   * Delete input file record by ID
   */
  async deleteById(id) {
    const db = window.AppDatabase;
    const sql = 'DELETE FROM input_files WHERE id = ?';

    try {
      const result = await db.run(sql, [id]);
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete input file:', error);
      throw error;
    }
  },

  /**
   * Get total count of input files
   */
  async getCount() {
    const db = window.AppDatabase;
    const sql = 'SELECT COUNT(*) as count FROM input_files';

    try {
      const result = await db.get(sql);
      return result.count;
    } catch (error) {
      console.error('Failed to get input files count:', error);
      throw error;
    }
  }
};