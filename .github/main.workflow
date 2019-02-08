workflow "New workflow" {
  on = "push"
  resolves = ["GitHub Action for npm-1"]
}

action "GitHub Action for npm" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  runs = "npm install"
}

action "GitHub Action for npm-1" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  needs = ["GitHub Action for npm"]
  runs = "npm run deploy -- -vd"
  secrets = ["GITHUB_TOKEN", "AWS_DEFAULT_REGION", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_OUTPUT", "AWS_REGION", "AWS_ACCESS_KEY_ID"]
}
