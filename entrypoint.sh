#!/bin/sh

# Install NPM Modules
echo "Install NPM Modules"
npm install

# Run Deploy Script
npm run deploy -- $*
