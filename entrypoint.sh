#!/bin/sh

# Export Env Vars
echo "Create .env file"

touch .env
echo "AWS_DEFAULT_OUTPUT=$AWS_DEFAULT_OUTPUT" >> .env
echo "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" >> .env
echo "AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION" >> .env
echo "AWS_REGION=$AWS_REGION" >> .env
echo "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" >> .env

# Install NPM Modules
echo "Install NPM Modules"
npm install

# Run Deploy Script
sh -c "npm run deploy -- $*"
