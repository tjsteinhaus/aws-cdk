#!/bin/sh

# Echo out a Secret
echo "$AWS_DEFAULT_OUTPUT"

# Install NPM Modules
npm install

# Run Deploy Script
sh -c "npm run deploy -- $*"
