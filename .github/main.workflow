workflow "New workflow" {
  on = "push"
  resolves = [
    "GitHub Action for npm",
  ]
}

action "Install NPM Packages" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  args = "install"
}

action "GitHub Action for npm" {
  uses = "actions/npm@3c8332795d5443adc712d30fa147db61fd520b5a"
  needs = ["Install NPM Packages"]
  args = "run deploy -- -vd "
  secrets = ["AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_DEFAULT_REGION", "AWS_DEFAULT_OUTPUT", "AWS_ACCESS_KEY_ID"]
}
