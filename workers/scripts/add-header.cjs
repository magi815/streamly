const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'collected-data.sql');
const outputPath = path.join(__dirname, 'data-v2.sql');

const content = fs.readFileSync(inputPath, 'utf8');
const random = Math.random().toString(36).substring(7);
const header = `-- Version: ${random} at ${new Date().toISOString()}\n`;

fs.writeFileSync(outputPath, header + content, 'utf8');
console.log('Created data-v2.sql with random:', random);
console.log('File size:', (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2), 'MB');
