workflow "New workflow" {
  on = "push"
  resolves = [
    " Run AWK CDK Deploy",
  ]
}

action " Run AWK CDK Deploy" {
  uses = "./"
  args = "-vd"
  secrets = ["AWS_ACCESS_KEY_ID", "AWS_DEFAULT_OUTPUT", "AWS_DEFAULT_REGION", "AWS_REGION", "AWS_SECRET_ACCESS_KEY"]
}
