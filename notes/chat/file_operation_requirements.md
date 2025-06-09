# File Operation Requirements

## Core Behavior

### When "Save copies when sorting" is OFF:
- **Archive/Saved actions**: Move file from SOURCE to DESTINATION 
- **File leaves SOURCE completely** (no longer exists there)
- **File appears in DESTINATION only**

### When "Save copies when sorting" is ON:
- **Archive/Saved actions**: Move file from SOURCE to DESTINATION 
- **PLUS create backup copy** in `SOURCE/copies/datestamp_if_on/action_folder/filename`
- **File leaves SOURCE completely** (no longer exists in original location)
- **File exists in TWO places**: DESTINATION + backup copy location

## Directory Structure
- **SOURCE**: `/Users/benmiriello/Desktop/aliens from earth` (where files start)
- **DESTINATION**: `/Users/benmiriello/Desktop/destination` (where organized files go)
- **BACKUP LOCATION**: `SOURCE/copies/datestamp_if_on/action_folder/filename`

## Action Mapping
- **Archive** (left swipe) → `DESTINATION/` or `DESTINATION/datestamp/` 
- **Saved** (right swipe) → `DESTINATION/` or `DESTINATION/datestamp/`
- **Best** (up swipe) → `DESTINATION/best/` + move original to organized location

## Undo Behavior
- **Move file back from DESTINATION to original SOURCE location**
- **Remove any backup copies that were created**
- **File should be exactly where it was before the action**

## Current Problems
1. Files are appearing in DESTINATION but NOT leaving SOURCE
2. UI shows files as moved but they're still in original location 
3. Undo operation is causing file loss
4. No "copies" directory is ever being created
5. Files are being copied instead of moved, leaving duplicates

## Expected File Flow
```
Before action: file exists in SOURCE only
After action (toggle OFF): file exists in DESTINATION only  
After action (toggle ON): file exists in DESTINATION + SOURCE/copies/action_folder/
After undo: file exists in SOURCE only (original location)
```