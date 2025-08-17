# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComfyUI Media Viewer - A web interface for viewing, managing, and organizing media files from ComfyUI outputs with integrated workflow queuing capabilities.

**Architecture**: Node.js Express server with vanilla JavaScript frontend, transitioning to Alpine.js for complex UI components (specifically ComfyUI integration).

## Development Commands

### Server Operations
```bash
cd server
npm install          # Install dependencies
npm start           # Production server (port 8081)
npm run dev         # Development with nodemon hot reload
```

### Project Structure
- `server/` - Express.js backend with API routes and file operations
- `public/` - Frontend assets served statically
- `public/js/comfyui/` - Alpine.js-based ComfyUI integration module
- `notes/chat/` - Technical documentation and feature planning

## Key Technologies

**Backend**: Express.js, fs-extra, moment, node-fetch, PNG metadata extraction
**Frontend**: Vanilla JavaScript transitioning to Alpine.js, Web Components approach
**ComfyUI Integration**: External batching system with workflow metadata extraction

## Architecture Details

### Frontend State Management
- **Legacy Components**: Vanilla JS with manual DOM manipulation
- **New Components**: Alpine.js for complex state (ComfyUI workflow editor)
- **Migration Strategy**: Incremental adoption, HTML-first approach

### ComfyUI Integration Approach
- **External Batching**: Multiple API calls vs ComfyUI's internal batching
- **Workflow Extraction**: PNG metadata parsing (API format preferred)
- **Parameter Modification**: Random seed generation, control_after_generate settings
- **File Structure**: `public/js/comfyui/` contains modular Alpine.js components

### File Operations Flow
1. **Source**: `~/Documents/ComfyUI/output` (configurable)
2. **Processing**: Sort, classify, queue workflows
3. **Destination**: `~/Documents/ComfyUI/output/swipe-save` (configurable)
4. **Logging**: `~/Documents/swipe-save/logs`

## Development Guidelines

### Code Organization
- Prefer editing existing files over creating new ones
- Follow modular structure in `public/js/comfyui/` for new ComfyUI features
- Use Alpine.js patterns for complex interactive components
- Maintain vanilla JS for simple UI interactions

### ComfyUI Integration Patterns
- Extract workflow from PNG metadata using `png-chunks-extract`
- Modify workflows in-memory before queuing
- Use conservative seed ranges (1 to 2,147,483,647)
- Implement external batching for custom seed progression

### API Endpoints
- `/api/media` - File listing and management
- `/api/config` - Configuration settings
- `/api/queue-workflow` - ComfyUI workflow queuing
- `/media/*` - Static media file serving

### CORS Considerations:
- ComfyUI API calls must be proxied through our Express server to avoid CORS errors

## Current Development Focus

**Active Branch**: `alpine-comfyui-integration`
- ✅ ComfyUI components migrated to Alpine.js with proper initialization
- Implementing comprehensive workflow text editor
- Improving state management for complex UI interactions

### Alpine.js Integration Status
- ✅ Store registration and timing fixed
- ✅ Modal opening functionality restored
- ✅ Proper script loading order with `defer` attributes
- ✅ Fallback initialization for race conditions

### Pending Features (Roadmap Context)
- Advanced workflow text field editing with syntax highlighting
- Improved batch operations and multi-file selection
- Enhanced tagging and categorization system
- Dark mode and UI improvements

## Technical Debt & Migration Notes

- **State Management**: Transitioning from manual DOM to Alpine.js reactive patterns
- **Component Architecture**: Moving toward modular, testable components
- **Framework Choice**: Alpine.js selected for progressive enhancement without build complexity
- **Documentation**: Extensive technical docs in `notes/chat/` for ComfyUI integration patterns

- Use "panel" cli command to manage service swipe-save - as in "panel info" "panel status swipe-save" "panel restart swipe-save"
- use "mv" to move things into notes/trash instead of using rm