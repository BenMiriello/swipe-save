# ComfyUI Media Viewer

A web interface to view and manage media files from ComfyUI outputs.

## Features
- View PNG, MP4, and WEBM files from ComfyUI outputs
- Sort files between custom source and destination directories
- Multiple classification options:
  - Archive (good/bad/neutral)
  - Save (complete/WIP)
  - Super Save (complete/WIP)
  - Delete
- Save files with custom filenames
- Navigation with keyboard, swipe, or tap zones
- File organization by creation date
- Queue workflows in ComfyUI with custom parameters (seed, quantity)
- Custom To and From paths
- Custom ComfyUI destination URL
- Metadata extraction and logging
- Ability to undo sorting actions

## Usage

### Swipe Actions
- **Left swipe**: Archive
- **Right swipe**: Save
- **Up swipe**: Super Save - Complete
- **Down swipe**: Delete

### Tap Zones
The image is divided into a 3x3 grid of tap zones:
- **Top Left**: Archive - Good
- **Top Middle**: Super Save - Complete
- **Top Right**: Super Save - WIP
- **Middle Left**: Archive
- **Middle Right**: Save
- **Bottom Left**: Archive - Bad
- **Bottom Middle**: Delete
- **Bottom Right**: Save - WIP

### Keyboard Controls
- **Left Arrow**: Archive
- **Right Arrow**: Save
- **Up Arrow**: Super Save - Complete
- **Down Arrow**: Delete

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone this repository
2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```

### Starting the Application
1. Start the server:
   ```bash
   cd server
   npm start
   ```
   Server will run on http://localhost:8081

2. Open your browser to http://localhost:8081

### Configuration
The app defaults to:
- **Source directory:** `~/Documents/ComfyUI/output`
- **Destination directory:** `~/Documents/ComfyUI/output/swipe-save`
- **Logs:** `~/Documents/swipe-save/logs`

You can change source and destination directories using the Options menu (top left).

## Roadmap

### Completed
- [x] Allow setting custom filename
- [x] Add keyboard controls and key mappings
- [x] Allow viewing and downloading file through center click and icon in top right
- [x] Add file browser
- [x] Allow setting custom to and from file paths
- [x] Add initial logging of metadata and decisions taken for future use and training
- [x] Improved file browsing within directory with slider and page picker
- [x] Allow forwarding (queueing) workflow in comfyui
- [x] Allow modifying a few parameters (seed and quantity) when queueing
- [x] Allow changing and saving the comfyui path to forward to
- [x] Show log of actions taken, successful or not, in 'Run Workflow' modal

### UI Improvements
- [ ] Improve and clean up UI
- [ ] Dark mode

### Sorting
- [ ] Ability to turn logging on and off
- [ ] Ability to set custom categories, directories or filenames to cardinal directions
- [ ] Ability to select and perform sorting actions on multiple files using updated file picker
- [ ] Update file browser, including to allow viewing files
- [ ] Generalize process of setting source and destination directories away from comfyui
- [ ] Sort by additional parameters

### Tagging
- [ ] Allow suggesting tags based on workflow prompt metadata
- [ ] Allow choosing and creating tags for projects, categories, etc
- [ ] Allow setting tags in filenames
- [ ] Allow setting tags in metadata

### ComfyUI Integration
- [ ] Allow modifying more fields in the workflow when queueing, such as prompts, steps
- [ ] Allow loading a workflow in comfyui (not just queueing and linking)
- [ ] Allow adding simple nodes and connections such as importing an image (such as the current image) and using that as the source and setting the denoising level
- [ ] Allow inpainting
- [ ] Develop more advanced workflow editing and simplified view of workflows
- [ ] Show syntax highlighting for prompt editing
- [ ] Allow saving prompt snippets
- [ ] Allow sorting and suggesting prompt snippets based on model, project, other context
- [ ] Integrate improved wildcard system in prompting

### General Use & Deployment
- [ ] Generalize features to work just for photo sorting as well
- [ ] Develop plan for easy linking of file system to hosted instance

### Automated Sorting
- [ ] Develop mvp plan for an auto-sorting tool which uses selections users make to train a model that learns their preferences, and which can run sorting for them on their permission and review
- [ ] Develop plan for review system and continuous learning for automated sorting actions taken
- [ ] Dynamic category and project detection and suggestions
