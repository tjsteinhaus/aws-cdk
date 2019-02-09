#!/bin/sh

# Install NPM Modules
npm install

# Run Deploy Script
sh -c "npm run deploy -- $*"