#!/bin/bash

# Copy the index.html file to the docs directory
cp ./widgets-samples/index.html docs/
cp ./widgets-samples/chat-client.html docs/
cp ./widgets-samples/chat-client-e2e.html docs/
cp ./widgets-samples/chat-client-e2e-2.html docs/
# Copy specific files and directories from samples-cc-wc-app to the docs directory
mkdir -p docs/samples-cc-wc-app
cp -r ./widgets-samples/cc/samples-cc-wc-app/dist docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/app.js docs/samples-cc-wc-app/
cp ./widgets-samples/cc/samples-cc-wc-app/index.html docs/samples-cc-wc-app/

echo "Samples created"
