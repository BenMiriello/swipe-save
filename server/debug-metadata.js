#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const extractChunks = require('png-chunks-extract');
const textChunk = require('png-chunk-text');

// Find a recent file to test
async function findRecentFile() {
  // Check common output directories for recent files
  const possibleDirs = [
    '/home/simonsays/Documents/ComfyUI/output',
    '/home/simonsays/Documents/Data/Images/Text2Img',
    '/home/simonsays/Documents/Data/Images/Text2Img/WAN/I2V'
  ];
  
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith('.png'))
        .map(f => ({
          name: f,
          path: path.join(dir, f),
          mtime: fs.statSync(path.join(dir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime); // newest first
      
      if (files.length > 0) {
        console.log(`Found ${files.length} PNG files in ${dir}`);
        console.log(`Most recent: ${files[0].name} (${files[0].mtime})`);
        return files[0].path;
      }
    }
  }
  
  return null;
}

async function debugMetadata(filePath) {
  console.log(`\n=== DEBUG METADATA FOR ${path.basename(filePath)} ===`);
  console.log(`Full path: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ File does not exist!');
    return;
  }
  
  const stats = fs.statSync(filePath);
  console.log(`File size: ${stats.size} bytes`);
  console.log(`Modified: ${stats.mtime}`);
  
  try {
    // Read PNG file
    const buffer = fs.readFileSync(filePath);
    console.log(`Read ${buffer.length} bytes from file`);
    
    // Check PNG signature
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const isValidPNG = buffer.subarray(0, 8).equals(pngSignature);
    console.log(`Valid PNG signature: ${isValidPNG}`);
    
    if (!isValidPNG) {
      console.log('❌ Not a valid PNG file!');
      return;
    }
    
    // Extract chunks
    const chunks = extractChunks(buffer);
    console.log(`\nFound ${chunks.length} PNG chunks:`);
    
    const chunkTypes = {};
    chunks.forEach(chunk => {
      chunkTypes[chunk.name] = (chunkTypes[chunk.name] || 0) + 1;
    });
    
    Object.entries(chunkTypes).forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    });
    
    // Look specifically for text chunks
    console.log(`\n=== TEXT CHUNKS ===`);
    let foundWorkflow = false;
    let foundPrompt = false;
    
    chunks.forEach((chunk, i) => {
      if (chunk.name === 'tEXt') {
        try {
          const textData = textChunk.decode(chunk.data);
          console.log(`\nChunk ${i + 1}: tEXt`);
          console.log(`  Keyword: "${textData.keyword}"`);
          console.log(`  Text length: ${textData.text.length} chars`);
          console.log(`  Text preview: ${textData.text.substring(0, 100)}...`);
          
          if (textData.keyword === 'workflow') {
            foundWorkflow = true;
            try {
              const parsed = JSON.parse(textData.text);
              console.log(`  ✅ Valid workflow JSON with ${Object.keys(parsed).length} keys`);
              
              // Check workflow format
              if (parsed.nodes && Array.isArray(parsed.nodes)) {
                console.log(`  📋 GUI format workflow with ${parsed.nodes.length} nodes`);
              } else {
                console.log(`  🔧 API format workflow with ${Object.keys(parsed).length} node keys`);
              }
            } catch (parseError) {
              console.log(`  ❌ Invalid workflow JSON: ${parseError.message}`);
            }
          } else if (textData.keyword === 'prompt') {
            foundPrompt = true;
            try {
              const parsed = JSON.parse(textData.text);
              console.log(`  ✅ Valid prompt JSON with ${Object.keys(parsed).length} keys`);
            } catch (parseError) {
              console.log(`  ❌ Invalid prompt JSON: ${parseError.message}`);
            }
          }
        } catch (textError) {
          console.log(`  ❌ Error parsing text chunk: ${textError.message}`);
        }
      }
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Workflow found: ${foundWorkflow ? '✅' : '❌'}`);
    console.log(`Prompt found: ${foundPrompt ? '✅' : '❌'}`);
    
    if (!foundWorkflow && !foundPrompt) {
      console.log(`\n⚠️  NO COMFYUI METADATA FOUND!`);
      console.log(`This explains why no editable fields are detected.`);
    }
    
  } catch (error) {
    console.error('Error reading file:', error.message);
  }
}

async function main() {
  console.log('🔍 Searching for recent PNG files...');
  
  const testFile = await findRecentFile();
  
  if (!testFile) {
    console.log('❌ No PNG files found in output directories');
    process.exit(1);
  }
  
  await debugMetadata(testFile);
}

main().catch(console.error);