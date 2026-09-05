const fs = require('fs');

const patterns = [
  // Old primary family
  'FF5E14', 'ff5e14', 'cc4b10', 'ff7637', 'ff6e2c', 'ff7e43',
  'e65512', 'ffefe8', 'ffaf8a', 'ffcfb9', 'ffdfd0', 'f2d4c6',
  'e6c9bb', 'eccec0', '99380c', '7a2d0a',
  '255,94,20', '217,80,17', '230,85,18',
  // Old secondary family
  '5F656F', '5f656f', '51565e', '4c5159', '474c53', '393d43',
  'dfe0e2', 'd4d5d7', 'c9cacb', 'cecfd1', 'cfd1d4',
  '119,124,133', '95,101,111',
  // Old dark family
  '02245B', '02245b', '0f2f63', '153467', '1b3a6b',
  '021f4d', '021d49', '021b44', '011637', 'ccd3de', 'b3bdce', 'b8bec8',
  '2,36,91',
  // Old light family
  'F5F5F5', 'f5f5f5', 'e9e9e9', 'dddddd', 'ddd', 'e3e3e3',
  'fdfdfd', 'fcfcfc', '245,245,245',
  // Legacy subtle tints that were distinct
  'e4e4e4', 'f6f6f6', 'f7f7f7', 'dde0e3'
];

const files = ['css/bootstrap.min.css', 'css/style.css', 'scss/bootstrap.scss'];
let hadMatches = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lower = content.toLowerCase();
  const found = new Set();

  for (const pat of patterns) {
    const p = pat.toLowerCase();
    if (lower.includes(p)) {
      // Skip if part of a different hex that happens to contain the substring
      // e.g. 'ddd' inside '#dddddd' etc. We accept the full-substring check.
      found.add(pat);
    }
  }

  if (found.size > 0) {
    hadMatches = true;
    console.log(`\n${file}: ${found.size} remaining old-brand patterns:`);
    for (const f of [...found].sort()) {
      console.log('  -', f);
    }
  } else {
    console.log(`${file}: CLEAN ✓`);
  }
}

if (!hadMatches) {
  console.log('\nAll old brand colors fully removed.');
} else {
  console.log('\nRemaining matches found — need cleanup.');
}