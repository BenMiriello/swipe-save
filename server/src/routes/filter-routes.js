const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const router = express.Router();

/**
 * Filter Routes
 * API endpoints for filter presets and suggestions
 */

// Get filter storage directory
function getFilterStorageDir() {
  const os = require('os');
  const configDir = path.join(os.homedir(), '.config', 'swipe-save', 'filters');
  fs.ensureDirSync(configDir);
  fs.ensureDirSync(path.join(configDir, 'presets'));
  fs.ensureDirSync(path.join(configDir, 'filter-strings'));
  return configDir;
}

// Generate timestamp-based ID
function generatePresetId() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '').replace(/T/, '_').substring(0, 15);
}

// Slugify name for filename
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

// Get preset file path
function getPresetFilePath(id) {
  const filterDir = getFilterStorageDir();
  return path.join(filterDir, 'presets', `${id}.json`);
}

/**
 * Get all filter presets
 */
router.get('/api/filters/presets', async (req, res) => {
  try {
    const filterDir = getFilterStorageDir();
    const presetsDir = path.join(filterDir, 'presets');
    
    const files = await fs.readdir(presetsDir);
    const presets = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(presetsDir, file);
          const data = await fs.readJson(filePath);
          presets.push(data);
        } catch (error) {
          console.error(`Error reading preset file ${file}:`, error);
        }
      }
    }
    
    // Sort by last used, then by usage count
    presets.sort((a, b) => {
      const aLastUsed = new Date(a.lastUsed || 0);
      const bLastUsed = new Date(b.lastUsed || 0);
      const aUsage = a.usageCount || 0;
      const bUsage = b.usageCount || 0;
      
      // First by last used (more recent first)
      if (aLastUsed > bLastUsed) return -1;
      if (aLastUsed < bLastUsed) return 1;
      
      // Then by usage count (higher first)
      return bUsage - aUsage;
    });
    
    res.json(presets);
  } catch (error) {
    console.error('Error loading filter presets:', error);
    res.status(500).json({ error: 'Failed to load presets' });
  }
});

/**
 * Create new filter preset
 */
router.post('/api/filters/presets', async (req, res) => {
  try {
    const { name, filters, sorting, mediaTypes, includeWorkflowMetadata } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Preset name is required' });
    }
    
    const now = new Date();
    const id = `${generatePresetId()}_${slugify(name)}`;
    
    const preset = {
      id,
      name: name.trim(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      usageCount: 0,
      lastUsed: null,
      filters: filters || {},
      sorting: sorting || { field: 'date', direction: 'desc' },
      mediaTypes: mediaTypes || [],
      includeWorkflowMetadata: !!includeWorkflowMetadata
    };
    
    const filePath = getPresetFilePath(id);
    await fs.writeJson(filePath, preset, { spaces: 2 });
    
    console.log('Created filter preset:', id);
    res.json(preset);
  } catch (error) {
    console.error('Error creating filter preset:', error);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

/**
 * Update filter preset
 */
router.put('/api/filters/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const filePath = getPresetFilePath(id);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    const existingPreset = await fs.readJson(filePath);
    const now = new Date();
    
    // Handle rename - change filename if name changed
    let newFilePath = filePath;
    if (updates.name && updates.name !== existingPreset.name) {
      const newId = `${generatePresetId()}_${slugify(updates.name)}`;
      newFilePath = getPresetFilePath(newId);
      updates.id = newId;
    }
    
    const updatedPreset = {
      ...existingPreset,
      ...updates,
      updatedAt: now.toISOString()
    };
    
    // If filename changed, remove old file
    if (newFilePath !== filePath) {
      await fs.remove(filePath);
    }
    
    await fs.writeJson(newFilePath, updatedPreset, { spaces: 2 });
    
    console.log('Updated filter preset:', updatedPreset.id);
    res.json(updatedPreset);
  } catch (error) {
    console.error('Error updating filter preset:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

/**
 * Delete filter preset
 */
router.delete('/api/filters/presets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filePath = getPresetFilePath(id);
    
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    await fs.remove(filePath);
    
    console.log('Deleted filter preset:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter preset:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

/**
 * Get suggestions for a filter field
 */
router.get('/api/filters/suggestions/:field', async (req, res) => {
  try {
    const { field } = req.params;
    const filterDir = getFilterStorageDir();
    const suggestionsPath = path.join(filterDir, 'filter-strings', `${field}_suggestions.json`);
    
    if (!await fs.pathExists(suggestionsPath)) {
      return res.json([]);
    }
    
    const data = await fs.readJson(suggestionsPath);
    const suggestions = data.suggestions || [];
    
    // Sort by usage count and recency
    suggestions.sort((a, b) => {
      const aUsage = a.usageCount || 0;
      const bUsage = b.usageCount || 0;
      const aLastUsed = new Date(a.lastUsed || 0);
      const bLastUsed = new Date(b.lastUsed || 0);
      
      // Combine usage and recency score
      const aScore = aUsage * 0.7 + (aLastUsed.getTime() / 1000000000) * 0.3;
      const bScore = bUsage * 0.7 + (bLastUsed.getTime() / 1000000000) * 0.3;
      
      return bScore - aScore;
    });
    
    res.json(suggestions.slice(0, 10)); // Return top 10
  } catch (error) {
    console.error(`Error loading suggestions for ${req.params.field}:`, error);
    res.json([]);
  }
});

/**
 * Add or update suggestion usage
 */
router.post('/api/filters/suggestions/:field', async (req, res) => {
  try {
    const { field } = req.params;
    const { value } = req.body;
    
    if (!value || !value.trim()) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    const filterDir = getFilterStorageDir();
    const suggestionsPath = path.join(filterDir, 'filter-strings', `${field}_suggestions.json`);
    
    let data = { field, suggestions: [] };
    if (await fs.pathExists(suggestionsPath)) {
      data = await fs.readJson(suggestionsPath);
    }
    
    const now = new Date();
    const trimmedValue = value.trim();
    
    // Find existing suggestion or create new one
    let suggestion = data.suggestions.find(s => s.value === trimmedValue);
    if (suggestion) {
      suggestion.usageCount = (suggestion.usageCount || 0) + 1;
      suggestion.lastUsed = now.toISOString();
    } else {
      suggestion = {
        value: trimmedValue,
        usageCount: 1,
        lastUsed: now.toISOString()
      };
      data.suggestions.push(suggestion);
    }
    
    // Keep only top 50 suggestions
    data.suggestions.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    data.suggestions = data.suggestions.slice(0, 50);
    
    await fs.writeJson(suggestionsPath, data, { spaces: 2 });
    
    res.json({ success: true });
  } catch (error) {
    console.error(`Error updating suggestion for ${req.params.field}:`, error);
    res.status(500).json({ error: 'Failed to update suggestion' });
  }
});

/**
 * Save current filter state (for persistence)
 */
router.post('/api/filters/current-state', async (req, res) => {
  try {
    const filterDir = getFilterStorageDir();
    const statePath = path.join(filterDir, 'current-state.json');
    
    const state = {
      ...req.body,
      savedAt: new Date().toISOString()
    };
    
    await fs.writeJson(statePath, state, { spaces: 2 });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving current filter state:', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

/**
 * Load current filter state (for persistence)
 */
router.get('/api/filters/current-state', async (req, res) => {
  try {
    const filterDir = getFilterStorageDir();
    const statePath = path.join(filterDir, 'current-state.json');
    
    if (!await fs.pathExists(statePath)) {
      return res.json(null);
    }
    
    const state = await fs.readJson(statePath);
    res.json(state);
  } catch (error) {
    console.error('Error loading current filter state:', error);
    res.json(null);
  }
});

module.exports = router;