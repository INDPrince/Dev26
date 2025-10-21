const sharp = require('sharp');
const fs = require('fs');

// SVG templates
const mainSVG192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#10b981" rx="40"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">Q</text>
</svg>`;

const mainSVG512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#10b981" rx="80"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">Q</text>
</svg>`;

const adminSVG192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#3b82f6" rx="40"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">A</text>
</svg>`;

const adminSVG512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6" rx="80"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">A</text>
</svg>`;

async function generateIcons() {
  try {
    // Generate main app icons
    await sharp(Buffer.from(mainSVG192))
      .png()
      .toFile('public/icon-192.png');
    console.log('✅ Generated icon-192.png');

    await sharp(Buffer.from(mainSVG512))
      .png()
      .toFile('public/icon-512.png');
    console.log('✅ Generated icon-512.png');

    // Generate admin icons
    await sharp(Buffer.from(adminSVG192))
      .png()
      .toFile('public/icon-admin-192.png');
    console.log('✅ Generated icon-admin-192.png');

    await sharp(Buffer.from(adminSVG512))
      .png()
      .toFile('public/icon-admin-512.png');
    console.log('✅ Generated icon-admin-512.png');

    console.log('\n🎉 All PNG icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
