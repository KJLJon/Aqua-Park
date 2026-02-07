/**
 * Generate placeholder PWA icons as simple SVG-based PNGs.
 * Run: node scripts/generate-icons.js
 */
const fs = require('fs');
const path = require('path');

function createSVGIcon(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0077B6"/>
      <stop offset="100%" style="stop-color:#00B4D8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bg)"/>
  <text x="${size / 2}" y="${size * 0.42}" font-family="Arial,sans-serif" font-size="${size * 0.18}" font-weight="bold" fill="white" text-anchor="middle">AQUA</text>
  <text x="${size / 2}" y="${size * 0.62}" font-family="Arial,sans-serif" font-size="${size * 0.18}" font-weight="bold" fill="#FFD700" text-anchor="middle">PARK</text>
  <text x="${size / 2}" y="${size * 0.82}" font-family="Arial,sans-serif" font-size="${size * 0.08}" fill="#CAF0F8" text-anchor="middle">~water slide~</text>
</svg>`;
}

const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(__dirname, '..', 'src', 'assets', 'images');

[publicDir, assetsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Write SVG icons (browsers will render these for PWA)
[192, 512].forEach(size => {
  const svg = createSVGIcon(size);
  fs.writeFileSync(path.join(publicDir, `icon-${size}.svg`), svg);
  // Also save as .png extension (it's actually SVG but will work for dev)
  fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), svg);
  if (size === 192) {
    fs.writeFileSync(path.join(assetsDir, `icon-${size}.png`), svg);
  }
});

console.log('Icons generated in public/ and src/assets/images/');
