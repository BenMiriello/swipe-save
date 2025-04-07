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

## Installation

### Prerequisites
- Node.js and npm

### Setup
1. Clone this repository

## Roadmap
- Allow choosing which filepath to work from when sorting media
- Allow choosing projects to save to
- Allow more granular options when saving
