const fs = require('fs');
const path = require('path');

// ============================================================
// New brand palette extracted from the Commnex logo (img/logo.png)
//   primary   #006699  -> logo azure (icon main blue)
//   secondary #333366  -> logo dark indigo (wordmark accent)
//   dark      #003366  -> logo navy (deep sections / headings)
//   light     #ECF4F8  -> soft tint of the primary azure
// ============================================================

// Explicit mapping table: original brand color -> new brand color.
// Derived shades/tints were computed from the exact boostrap
// transformations present in the compiled css.
const colorMap = {
  // ---------- Primary family (#FF5E14 -> #006699) ----------
  '#FF5E14': '#006699',
  '#ff5e14': '#006699',
  '#cc4b10': '#00527A',   // shade 80%
  '#ff7637': '#267DA8',   // tint 15%
  '#ff6e2c': '#1F78A5',   // tint 12%
  '#ff7e43': '#3385AD',   // tint 20%
  '#e65512': '#005C8A',   // shade 90%
  '#ffefe8': '#E6F0F5',   // tint 90%
  '#ffaf8a': '#80B3CC',   // tint 50%
  '#ffcfb9': '#B3D1E0',   // tint 70%
  '#ffdfd0': '#CCE0EB',   // tint 80%
  '#f2d4c6': '#BFD9E6',   // tint 75%
  '#e6c9bb': '#B0D0DF',   // tint ~69%
  '#eccec0': '#B5D1E1',   // tint ~71%
  '#99380c': '#003D5C',   // shade 60%
  '#7a2d0a': '#003149',   // shade 48%
  '%23ffaf8a': '%2380b3cc',

  // ---------- Secondary family (#5F656F -> #333366) ----------
  '#5F656F': '#333366',
  '#5f656f': '#333366',
  '#51565e': '#2B2B57',   // shade 85%
  '#4c5159': '#292952',   // shade 80%
  '#474c53': '#26264D',   // shade 75%
  '#393d43': '#1F1F3D',   // shade 60%
  '#dfe0e2': '#D6D6E0',   // tint 80%
  '#d4d5d7': '#C7C7D5',   // tint ~73%
  '#c9cacb': '#B8B8C9',   // tint ~65%
  '#cecfd1': '#C0C0D0',   // tint ~69%
  '#cfd1d4': '#C0C0D0',   // tint ~69%
  '%235F656F': '%23333366',

  // ---------- Dark family (#02245B -> #003366) ----------
  '#02245B': '#003366',
  '#02245b': '#003366',
  '#0f2f63': '#0D3D6E',   // tint 5%
  '#153467': '#134271',   // tint 7.5%
  '#1b3a6b': '#1A4775',   // tint 10%
  '#021f4d': '#002D59',   // shade 87.5%
  '#021d49': '#002A54',   // shade 82%
  '#021b44': '#00274F',   // shade 77%
  '#011637': '#001429',   // shade 40%
  '#ccd3de': '#D6DEE7',   // tint 84%
  '#b3bdce': '#BDCAD7',   // tint 74%
  '#b8bec8': '#C2CDDA',   // tint 76%

  // ---------- Light family (#F5F5F5 -> #ECF4F8) ----------
  '#F5F5F5': '#ECF4F8',
  '#f5f5f5': '#ECF4F8',
  '#e9e9e9': '#E0E8EC',   // shade 95%
  '#dddddd': '#D4DCDF',   // shade 90%
  '#ddd':    '#D4DCDF',
  '#e3e3e3': '#DAE2E5',   // shade 92.5%
  '#fdfdfd': '#FFFFFF',   // tint 95%
  '#fcfcfc': '#FFFFFF',   // tint 96%
  '%23e65512': '%23005c8a',

  // ---------- Second-pass leftovers ----------
  '#dde0e3': '#D6DEE4',   // form-control file button hover neutral
  '#e4e4e4': '#DAE2E5',   // light list-group hover
  '#f6f6f6': '#E7F1F5',   // light button border hover tint
  '#f7f7f7': '#EAF2F6'    // light button bg hover tint
};

  // rgba() conversions
  const rgbaMap = [
    ['rgba(255,94,20,0.25)', 'rgba(0,102,153,0.25)'],
    ['rgba(255,94,20,0.5)',  'rgba(0,102,153,0.5)'],
    ['rgba(217,80,17,0.5)',  'rgba(0,82,122,0.5)'],
    ['rgba(2, 36, 91, 1)',   'rgba(0, 51, 102, 1)'],
    ['rgba(2, 36, 91, 0)',   'rgba(0, 51, 102, 0)'],
    ['rgba(2, 36, 91, .7)',  'rgba(0, 51, 102, .7)'],
    // Remaining rgba shadow values (second pass)
    ['rgba(119,124,133,0.5)', 'rgba(51,51,102,0.5)'],   // secondary button shadow
    ['rgba(95,101,111,0.5)',  'rgba(51,51,102,0.5)'],   // outline-secondary shadow
    ['rgba(2,36,91,0.5)',     'rgba(0,51,102,0.5)'],    // outline-dark shadow
    ['rgba(245,245,245,0.5)', 'rgba(236,244,248,0.5)']  // outline-light shadow
  ];

const files = [
  'css/bootstrap.min.css',
  'css/style.css'
];

function transform(content) {
  // rgba replacements first (so hex regex below never mangles them)
  for (const [from, to] of rgbaMap) {
    content = content.split(from).join(to);
  }

  // hex replacements (case-insensitive, word-boundary on '#' )
  for (const [from, to] of Object.entries(colorMap)) {
    if (from.startsWith('%23')) {
      content = content.split(from).join(to);
    } else {
      // Only match '#xxxxxx' tokens (not inside urls like %23)
      const escaped = from.slice(1);
      const re = new RegExp('#' + escaped, 'gi');
      content = content.replace(re, to);
    }
  }

  return content;
}

function fixButtonTextColors(content) {
  // The new primary (#006699) is dark -> white text on primary buttons.
  const fixes = [
    [/(\.btn-primary)\{color:#000;/g, '$1{color:#fff;'],
    [/(\.btn-primary:hover)\{color:#000;/g, '$1{color:#fff;'],
    [/\.btn-check:focus\+\.btn-primary\{color:#000;/g, '.btn-check:focus+.btn-primary{color:#fff;'],
    [/\.btn-primary:focus\{color:#000;/g, '.btn-primary:focus{color:#fff;'],
    [/\.btn-primary:active\{color:#000;/g, '.btn-primary:active{color:#fff;'],
    [/\.btn-primary\.active\{color:#000;/g, '.btn-primary.active{color:#fff;'],
    [/\.btn-primary:disabled\{color:#000;/g, '.btn-primary:disabled{color:#fff;'],
    [/\.btn-primary\.disabled\{color:#000;/g, '.btn-primary.disabled{color:#fff;'],
    [/\.btn-outline-primary:hover\{color:#000;/g, '.btn-outline-primary:hover{color:#fff;'],
    [/\.btn-outline-primary:active\{color:#000;/g, '.btn-outline-primary:active{color:#fff;'],
    [/\.btn-outline-primary\.active\{color:#000;/g, '.btn-outline-primary.active{color:#fff;'],
    [/\.btn-outline-primary\.dropdown-toggle\.show\{color:#000;/g, '.btn-outline-primary.dropdown-toggle.show{color:#fff;']
  ];
  for (const [re, rep] of fixes) {
    content = content.replace(re, rep);
  }
  return content;
}

function update() {
  for (const file of files) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) {
      console.error('Missing file:', p);
      process.exit(1);
    }
    let content = fs.readFileSync(p, 'utf8');
    content = transform(content);
    if (file.includes('bootstrap.min.css')) {
      content = fixButtonTextColors(content);
    }
    fs.writeFileSync(p, content, 'utf8');
    console.log('Updated:', file);
  }

  // SCSS source variables
  const scssPath = path.join(process.cwd(), 'scss/bootstrap.scss');
  let scss = fs.readFileSync(scssPath, 'utf8');
  scss = scss
    .replace('$primary: #FF5E14;', '$primary: #006699;')
    .replace('$secondary: #5F656F;', '$secondary: #333366;')
    .replace('$light: #F5F5F5;', '$light: #ECF4F8;')
    .replace('$dark: #02245B;', '$dark: #003366;');
  fs.writeFileSync(scssPath, scss, 'utf8');
  console.log('Updated: scss/bootstrap.scss');
}

update();