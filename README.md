# ComfyUI Media Viewer

A web interface to view and manage media files from ComfyUI outputs.

## Features
- View PNG, MP4, and WEBM files from ComfyUI outputs
- Multiple classification options:
  - Archive (good/bad/neutral)
  - Save (complete/WIP)
  - Super Save (complete/WIP)
  - Delete
- Navigation with keyboard, swipe, or tap zones
- Image pinch-zoom support
- Custom file naming
- File organization by creation date
- Detailed metadata extraction and logging
- Undo functionality
- Custom source and destination paths

## Usage

### Setting Custom Paths
- Use URL parameters to set custom paths:
  - `fromPath`: The directory to sort media from (default: `~/Documents/ComfyUI/output`)
  - `toPath`: The directory to sort media to (default: `~/Documents/sorted`)
  - Example: `http://localhost:8081/?fromPath=~/Pictures/AI&toPath=~/Pictures/Sorted`

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

## Installation

### Prerequisites
- Node.js and npm

### Setup
1. Clone this repository
2. Run `npm install` in the server directory
3. Start the server with `npm start`
4. Access the application at `http://localhost:8081`

## Roadmap
- [x] Allow choosing which filepath to work from when sorting media
- [x] Allow choosing projects to save to
- [ ] Verify TO and FROM paths already exist, or notify before creating
- [ ] Allow more granular options when saving

## Notes for Windows Users
The default paths are set for Linux/Mac environments. Windows users may need to modify the paths in the source code or use the URL parameters to set appropriate Windows paths.
