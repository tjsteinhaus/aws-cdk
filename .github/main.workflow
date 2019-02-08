workflow "New workflow" {
  on = "push"
  resolves = [
    "Install NPM Packages",
    "npm run deploy -- -vd",
  ]
}

action "Install NPM Packages" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  runs = "npm install"
}

action "chmod directory to 0777" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  needs = ["Install NPM Packages"]
  runs = "chmod -R 0777 ./*"
}

action "npm run deploy -- -vd" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  secrets = ["AWS_ACCESS_KEY_ID", "AWS_DEFAULT_OUTPUT", "AWS_DEFAULT_REGION", "AWS_REGION", "AWS_SECRET_ACCESS_KEY"]
  runs = "npm run deploy -- -vd"
  needs = ["chmod directory to 0777"]
}
