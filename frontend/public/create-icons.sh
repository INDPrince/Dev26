#!/bin/bash

# Create a simple 192x192 icon for main app (green theme)
cat > icon-192.svg << 'SVGEOF'
<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#10b981" rx="40"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">Q</text>
</svg>
SVGEOF

# Create a simple 512x512 icon for main app
cat > icon-512.svg << 'SVGEOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#10b981" rx="80"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">Q</text>
</svg>
SVGEOF

# Create admin icons (blue theme)
cat > icon-admin-192.svg << 'SVGEOF'
<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#3b82f6" rx="40"/>
  <text x="96" y="130" font-size="100" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">A</text>
</svg>
SVGEOF

cat > icon-admin-512.svg << 'SVGEOF'
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#3b82f6" rx="80"/>
  <text x="256" y="340" font-size="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">A</text>
</svg>
SVGEOF

echo "SVG icons created successfully"
