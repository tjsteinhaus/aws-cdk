#!/bin/sh

# Install NPM Modules
echo "Install NPM Modules"
npm install

# Run Deploy Script
sh -c "npm run deploy -- $*"

cdk deploy
