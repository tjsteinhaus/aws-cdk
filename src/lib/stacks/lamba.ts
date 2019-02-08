import cdk = require('@aws-cdk/cdk');
import lambda = require('@aws-cdk/aws-lambda');
import path = require('path');

export class LambdaStack extends cdk.Stack {
	lambda: any;
	constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		this.lambda = new lambda.Function(this, 'Test', {
			runtime: lambda.Runtime.NodeJS810,
			handler: 'index.handler',
			code: lambda.Code.asset(path.join(__dirname, '../../../code/lambda/test-lambda/dist'))
		})
	}
}