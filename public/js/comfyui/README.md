# ComfyUI Module - Alpine.js Integration

This module encapsulates all ComfyUI functionality using Alpine.js for reactive state management and component-based architecture.

## Architecture

### Directory Structure
```
js/comfyui/
├── index.js                 # Main module entry point
├── components/
│   └── workflow-modal.js    # Alpine.js components
├── services/
│   ├── api-client.js        # ComfyUI API interactions
│   └── storage-service.js   # Local storage management
├── utils/
│   ├── workflow-analyzer.js # Workflow analysis utilities
│   └── validation.js       # Parameter validation
├── styles/
│   ├── modal.css           # Modal-specific styles
│   └── components.css      # Reusable component styles
└── templates/
    └── modal.html          # Reference template (not loaded)
```

### Key Components

#### 1. Main Module (`index.js`)
- Initializes Alpine.js integration
- Sets up global stores for state management
- Provides public API for opening/closing modal

#### 2. Alpine.js Stores
- **comfyWorkflow**: Manages workflow state, settings, and results
- **comfyDestinations**: Manages ComfyUI destination URLs

#### 3. Services
- **apiClient**: Handles all ComfyUI API calls
- **storage**: Manages localStorage operations

#### 4. Utilities
- **workflowAnalyzer**: Foundation for future text editing features
- **validation**: Parameter and workflow validation

## Usage

### Opening the Modal
```javascript
// From the main app
const currentFile = getCurrentFile();
window.comfyUIModule.openWorkflowModal(currentFile);
```

### Accessing Store Data
```javascript
// In Alpine.js components
this.$store.comfyWorkflow.settings.quantity
this.$store.comfyDestinations.selectedDestination
```

### API Calls
```javascript
// Queue workflow
await window.comfyUIServices.apiClient.queueWorkflow(
  file, 
  modifySeeds, 
  controlAfterGenerate, 
  comfyUrl
);
```

## State Management

### Workflow Store Structure
```javascript
{
  currentFile: null,
  isModalOpen: false,
  settings: {
    quantity: 1,
    modifySeeds: true,
    controlAfterGenerate: 'increment',
    comfyUrl: 'http://localhost:8188'
  },
  results: [
    {
      message: 'Queued workflow...',
      isError: false,
      timestamp: '10:30:45 AM'
    }
  ]
}
```

### Destinations Store Structure
```javascript
{
  destinations: ['http://localhost:8188'],
  selectedDestination: 'http://localhost:8188',
  showMoreOptions: false
}
```

## Styling System

### CSS Custom Properties
The module uses CSS custom properties for consistent theming:

```css
:root {
  --comfy-primary: #007bff;
  --comfy-success: #28a745;
  --comfy-error: #dc3545;
  --comfy-bg-primary: #ffffff;
  --comfy-text-primary: #333333;
  /* ... more variables */
}
```

### Component Classes
- `comfy-btn` - Standard button styling
- `comfy-input` - Input field styling
- `comfy-toggle` - Toggle switch styling
- `comfy-setting-container` - Setting row container

## Future Extensions

### Text Field Editing
The workflow analyzer provides foundation for text field detection:

```javascript
// Analyze workflow for text fields
const analysis = window.comfyUIServices.workflowAnalyzer.analyzeWorkflow(workflow);
console.log(analysis.textFields); // Array of editable text fields
```

### Node Ordering
Implement topological sorting for logical node order:

```javascript
// Order nodes for editing interface
const orderedNodes = window.comfyUIServices.workflowAnalyzer.orderNodesForEditing(
  analysis.nodes,
  analysis.connections
);
```

### Adding New Components
1. Create component function in `components/workflow-modal.js`
2. Register with Alpine: `Alpine.data('componentName', componentFunction)`
3. Use in HTML: `<div x-data="componentName()">`

### Adding New Services
1. Create service file in `services/`
2. Add to `window.comfyUIServices` namespace
3. Import in `index.html` before `index.js`

## Integration Points

### With Main App
- `window.comfyUIModule.openWorkflowModal(file)` - Open modal
- `window.comfyUIModule.isModalOpen` - Check modal state

### With Existing Code
- Old ComfyUI functions are stubbed for compatibility
- App controller methods are kept but do nothing
- New Alpine.js modal replaces old vanilla JS modal

## Best Practices

### File Size Guidelines
- Keep components under 150 lines
- Split complex logic into separate utilities
- Use small, focused service files

### State Management
- Use Alpine stores for cross-component state
- Keep component-specific state in component data
- Validate all user inputs before updating state

### Error Handling
- Always validate parameters before API calls
- Display user-friendly error messages
- Log detailed errors to console for debugging

### Styling
- Use CSS custom properties for theming
- Create reusable component classes
- Follow existing naming conventions (`comfy-*`)

## Migration Notes

### What Changed
- Modal HTML completely rewritten for Alpine.js
- State management moved to Alpine stores
- API calls moved to dedicated service
- Old vanilla JS files backed up with `.backup` extension

### Compatibility
- Old API methods are stubbed to prevent errors
- App controller maintains same public interface
- All functionality equivalent to previous implementation

### Performance
- Alpine.js adds ~15KB gzipped
- No build step required
- Reactive updates more efficient than manual DOM manipulation

## Troubleshooting

### Common Issues
1. **Modal not opening**: Check that Alpine.js is loaded and `window.comfyUIModule` exists
2. **Store not updating**: Ensure Alpine.js is fully initialized before accessing stores
3. **Styles not applying**: Verify CSS files are loaded after main styles

### Debug Commands
```javascript
// Check module status
console.log(window.comfyUIModule.isInitialized);

// Check store state
console.log(Alpine.store('comfyWorkflow'));

// Test API client
window.comfyUIServices.apiClient.getDefaultComfyUIUrl();
```

This modular architecture provides a solid foundation for extending ComfyUI functionality while maintaining clean separation of concerns and excellent developer experience.
