// Runs after `expo export -p web` (see the build:web script).
// 1. The app now has real page URLs (/activity, /edit/123), so the links in index.html must start
//    from the site folder instead of "./", or deeper pages look for the manifest, icons and
//    service worker in the wrong place.
// 2. GitHub Pages answers unknown paths with 404.html. Making that a copy of index.html means
//    reloading or opening any page still loads the app, and the router shows the right screen.
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const base = `${(process.env.BASE_URL || '').replace(/\/$/, '')}/`;

const file = path.join(dist, 'index.html');
const html = fs.readFileSync(file, 'utf8')
  .replace(/(href|src)="\.\//g, `$1="${base}`)
  .replace(/register\('\.\/sw\.js'/g, `register('${base}sw.js'`);
fs.writeFileSync(file, html);
fs.writeFileSync(path.join(dist, '404.html'), html);
console.log(`index.html links now start at ${base}; 404.html written`);
