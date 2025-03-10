#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist

# Copy all necessary files to dist
cp -r manifest.json src LICENSE README.md dist/

# Create placeholder icons if they don't exist
mkdir -p dist/src/images
touch dist/src/images/icon16.png
touch dist/src/images/icon48.png
touch dist/src/images/icon128.png

# Create a zip file for Chrome Web Store submission
cd dist
zip -r biasbuster.zip .

echo "Build complete! The extension package is available at dist/biasbuster.zip" 