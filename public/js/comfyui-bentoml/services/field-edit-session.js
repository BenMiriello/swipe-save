/**
 * Field Edit Session Manager
 * Handles editing state, temporary values, and validation
 */

window.comfyUIBentoML = window.comfyUIBentoML || {};
window.comfyUIBentoML.services = window.comfyUIBentoML.services || {};

window.comfyUIBentoML.services.fieldEditSession = {
  // Current editing state
  currentSession: null,
  
  /**
   * Start editing session for a field
   */
  startEdit(field) {
    const fieldId = this.getFieldId(field);
    
    // End any existing session
    if (this.currentSession) {
      this.endSession();
    }
    
    // Create new session
    this.currentSession = {
      fieldId: fieldId,
      field: field,
      originalValue: field.currentValue,
      tempValue: this.initializeTempValue(field),
      startTime: Date.now(),
      isValid: true,
      validationErrors: []
    };
    
    console.log('Started edit session for:', fieldId);
    return this.currentSession;
  },
  
  /**
   * Update temporary value in current session
   */
  updateTempValue(value) {
    if (!this.currentSession) return false;
    
    this.currentSession.tempValue = value;
    this.validateTempValue();
    return true;
  },
  
  /**
   * Validate current temporary value
   */
  validateTempValue() {
    if (!this.currentSession) return false;
    
    const { field, tempValue } = this.currentSession;
    const errors = [];
    
    // Type-specific validation
    if (field.fieldType) {
      switch (field.fieldType.type) {
        case 'number':
          if (isNaN(parseFloat(tempValue))) {
            errors.push('Value must be a valid number');
          }
          break;
          
        case 'boolean':
          // Boolean values are always valid (true/false)
          break;
          
        default:
          // String validation
          if (typeof tempValue !== 'string') {
            errors.push('Value must be text');
          }
      }
    }
    
    // Update session validation state
    this.currentSession.isValid = errors.length === 0;
    this.currentSession.validationErrors = errors;
    
    return this.currentSession.isValid;
  },
  
  /**
   * Save current edit session
   */
  saveEdit() {
    if (!this.currentSession || !this.currentSession.isValid) {
      return { success: false, error: 'No valid session to save' };
    }
    
    const { field, tempValue } = this.currentSession;
    
    try {
      // Convert value to appropriate type
      const convertedValue = window.comfyUIBentoML.services.fieldEditorService.convertFieldValue(field, tempValue);
      
      // Update field
      field.currentValue = convertedValue;
      field.isModified = true;
      
      // Store in Alpine store
      const stored = window.comfyUIBentoML.services.fieldEditorService.storeFieldEdit(field);
      
      const result = {
        success: true,
        fieldId: this.currentSession.fieldId,
        oldValue: this.currentSession.originalValue,
        newValue: convertedValue,
        stored: stored
      };
      
      console.log('Saved edit session:', result);
      
      // End session
      this.endSession();
      
      return result;
    } catch (error) {
      console.error('Error saving edit:', error);
      return { success: false, error: error.message };
    }
  },
  
  /**
   * Cancel current edit session
   */
  cancelEdit() {
    if (!this.currentSession) return false;
    
    const fieldId = this.currentSession.fieldId;
    console.log('Cancelled edit session for:', fieldId);
    
    this.endSession();
    return true;
  },
  
  /**
   * End current session (cleanup)
   */
  endSession() {
    if (this.currentSession) {
      const duration = Date.now() - this.currentSession.startTime;
      console.log(`Edit session ended after ${duration}ms`);
      this.currentSession = null;
    }
  },
  
  /**
   * Check if currently editing a specific field
   */
  isEditingField(field) {
    if (!this.currentSession) return false;
    return this.currentSession.fieldId === this.getFieldId(field);
  },
  
  /**
   * Get current session info
   */
  getCurrentSession() {
    return this.currentSession;
  },
  
  /**
   * Get temporary value for current session
   */
  getTempValue() {
    return this.currentSession?.tempValue || '';
  },
  
  /**
   * Check if current session is valid
   */
  isSessionValid() {
    return this.currentSession?.isValid || false;
  },
  
  /**
   * Get validation errors for current session
   */
  getValidationErrors() {
    return this.currentSession?.validationErrors || [];
  },
  
  /**
   * Initialize temporary value based on field type
   */
  initializeTempValue(field) {
    if (!field.fieldType) {
      return String(field.currentValue || '');
    }
    
    switch (field.fieldType.type) {
      case 'boolean':
        return field.currentValue === true || field.currentValue === 'true';
      case 'number':
        return String(field.currentValue || 0);
      default:
        return String(field.currentValue || '');
    }
  },
  
  /**
   * Generate unique field ID for session tracking
   */
  getFieldId(field) {
    return `${field.nodeId}-${field.fieldName}`;
  },
  
  /**
   * Auto-save session data to prevent loss
   */
  createCheckpoint() {
    if (!this.currentSession) return null;
    
    return {
      fieldId: this.currentSession.fieldId,
      tempValue: this.currentSession.tempValue,
      timestamp: Date.now()
    };
  },
  
  /**
   * Restore session from checkpoint
   */
  restoreFromCheckpoint(checkpoint, field) {
    if (!checkpoint || !field) return false;
    
    if (this.getFieldId(field) === checkpoint.fieldId) {
      this.startEdit(field);
      this.updateTempValue(checkpoint.tempValue);
      return true;
    }
    
    return false;
  }
};