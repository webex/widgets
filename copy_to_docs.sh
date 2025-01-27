#!/bin/bash

# Copy the index.html file to the docs directory
cp ./widgets-samples/index.html docs/

# Copy specific files and directories from samples-cc-wc-app to the docs directory
mkdir -p docs/samples-cc-wc-app
cp -r ./widgets-samples/cc/samples-cc-wc-app/dist docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/app.js docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/bundle.js docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/index.html docs/samples-cc-wc-app/

# Update the hrefs in the copied index.html file
sed -i '' 's|http://localhost:4000/|./samples-cc-wc-app/index.html|g' docs/index.html
sed -i '' 's|http://localhost:3000/|./samples-cc-react-app/index.html|g' docs/index.html
sed -i '' 's|https://localhost:9000/|./samples-meeting-app/index.html|g' docs/index.html

echo "All dist folders, specific files from samples-cc-wc-app, and index.html from widgets-samples have been copied to the docs directory, and hrefs have been updated."
