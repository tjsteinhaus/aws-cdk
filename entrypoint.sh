#!/bin/sh

# Export Env Vars
export AWS_DEFAULT_OUTPUT = "$AWS_DEFAULT_OUTPUT"
export AWS_ACCESS_KEY_ID = "$AWS_ACCESS_KEY_ID"
export AWS_DEFAULT_REGION = "$AWS_DEFAULT_REGION"
export AWS_REGION = "$AWS_REGION"
export AWS_SECRET_ACCESS_KEY = "$AWS_SECRET_ACCESS_KEY"

# Install NPM Modules
npm install

# Run Deploy Script
sh -c "npm run deploy -- $*"
