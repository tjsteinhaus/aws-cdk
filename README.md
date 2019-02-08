# Important Notes
When using the deploy script, you will need to make sure your stack grouping and stack names are setup. Currently it's setup using an environment based format, however it can be setup however you'd like. Default deploys all stacks.

# Custom Commands
**Usage \<command\> \<option\>**<br /><br />
**Where \<command\> is one of:**<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-d, --deploy&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Build the Lambda's (NPM Install and Webpack) and Deploy the CDK<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-l, --lambda&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Build the Lambda's (NPM Install and Webpack)<br />
<br />
**Where \<option\> is one of:**<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-v, --verbose&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Verbose Output<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;--stack=\<stack\>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Optional. Deploy specific stack (default: all)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;--env=\<env\>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Optional. Deploy to specific environment(default: aws default)<br />
<br />
npm run deploy -- \<command\><br />
npm run deploy -- \<command\> \<option\><br />
npm run deploy -- --help<br />

# Default commands
 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
