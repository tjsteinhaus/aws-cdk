workflow "New workflow" {
  on = "push"
  resolves = ["npm run deploy -- -vd"]
}

action "Install NPM Packages" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  runs = "npm install"
}

action "CHMOD" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  runs = "chmod -R77 ./"
}

action "npm run deploy -- -vd" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  runs = "npm run deploy -- -vd"
  secrets = ["GITHUB_TOKEN", "AWS_DEFAULT_REGION", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_OUTPUT", "AWS_REGION", "AWS_ACCESS_KEY_ID"]
  needs = ["Install NPM Packages"]
}
