const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

function walk(dir, callback) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) walk(full, callback);
    else callback(full);
  });
}

const repoRoot = path.resolve(__dirname, '..');
const targets = [];

walk(repoRoot, (file) => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts') && !file.endsWith('.js') && !file.endsWith('.jsx')) return;
  if (file.includes('node_modules') || file.includes('dist') || file.includes('.git')) return;
  try {
    const buffer = fs.readFileSync(file);
    const text = buffer.toString('utf8');
    if (/[ìëêâ]/.test(text)) {
      targets.push(file);
    }
  } catch (e) {}
});

if (targets.length === 0) {
  console.log('No candidate files found for re-encoding.');
  process.exit(0);
}

console.log('Files to re-encode:', targets);

for (const f of targets) {
  try {
    const buf = fs.readFileSync(f);
    const decoded = iconv.decode(buf, 'cp949');
    fs.writeFileSync(f, decoded, 'utf8');
    console.log('Re-encoded:', f);
  } catch (e) {
    console.error('Failed:', f, e.message);
  }
}

console.log('Done. Please review changes, run tests/build, then commit.');
