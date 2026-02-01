const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'collected-data.sql');
const content = fs.readFileSync(inputPath, 'utf8');

const lines = content.split('\n');
const chunkSize = 500;  // lines per file
let fileIndex = 0;
let currentChunk = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() && !line.startsWith('--')) {
    currentChunk.push(line);
  }

  if (currentChunk.length >= chunkSize || i === lines.length - 1) {
    if (currentChunk.length > 0) {
      const outPath = path.join(__dirname, `chunk-${fileIndex.toString().padStart(3, '0')}.sql`);
      fs.writeFileSync(outPath, currentChunk.join('\n'), 'utf8');
      console.log(`Created ${outPath} (${currentChunk.length} statements)`);
      fileIndex++;
      currentChunk = [];
    }
  }
}

console.log(`\nTotal files: ${fileIndex}`);
