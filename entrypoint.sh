#!/bin/sh

# Export Env Vars
AWS_DEFAULT_OUTPUT = "$AWS_DEFAULT_OUTPUT"
AWS_ACCESS_KEY_ID = "$AWS_ACCESS_KEY_ID"
AWS_DEFAULT_REGION = "$AWS_DEFAULT_REGION"
AWS_REGION = "$AWS_REGION"
AWS_SECRET_ACCESS_KEY = "$AWS_SECRET_ACCESS_KEY"

# Install NPM Modules
npm install

# Run Deploy Script
sh -c "npm run deploy -- $*"
