#!/bin/bash

# Remove the docs directory if it exists
rm -rf docs

# Create the docs directory if it doesn't exist
mkdir -p docs

# Copy the index.html file to the docs directory
cp ./widgets-samples/index.html docs/

# Find and copy all dist folders to the docs directory, renaming them to their parent folder names, excluding node_modules
find ./widgets-samples/ -type d -name 'dist' -not -path "**/node_modules/**" | while read dist_dir; do
  parent_dir=$(basename $(dirname $dist_dir))
  cp -r $dist_dir docs/$parent_dir
done

# Copy specific files and directories from samples-cc-wc-app to the docs directory
mkdir -p docs/samples-cc-wc-app
cp -r ./widgets-samples/cc/samples-cc-wc-app/dist docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/app.js docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/bundle.js docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/index.html docs/samples-cc-wc-app/

# Update the hrefs in the copied index.html file
sed -i '' 's|http://localhost:3000/|./samples-cc-react-app/index.html|g' docs/index.html
sed -i '' 's|https://localhost:9000/|./samples-meeting-app/index.html|g' docs/index.html

echo "All dist folders, specific files from samples-cc-wc-app, and index.html from widgets-samples have been copied to the docs directory, and hrefs have been updated."
