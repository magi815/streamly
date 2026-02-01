const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, 'collected-data.sql');
let sql = fs.readFileSync(sqlPath, 'utf8');

// Replace all INSERT INTO with INSERT OR IGNORE INTO
sql = sql.replace(/INSERT INTO /g, 'INSERT OR IGNORE INTO ');
sql = sql.replace(/INSERT OR REPLACE INTO /g, 'INSERT OR IGNORE INTO ');

// Remove all ON CONFLICT clauses
sql = sql.replace(/ ON CONFLICT\([^)]+\) DO UPDATE SET [^;]+/g, '');
sql = sql.replace(/ ON CONFLICT DO NOTHING/g, '');

fs.writeFileSync(sqlPath, sql, 'utf8');
console.log('SQL file fixed!');
console.log('File size:', (fs.statSync(sqlPath).size / 1024 / 1024).toFixed(2), 'MB');
