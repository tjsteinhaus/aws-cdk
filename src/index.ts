#!/usr/bin/env node
import 'source-map-support/register';
import cdk = require('@aws-cdk/cdk');
import { LambdaStack } from './lib/stacks/lamba';
import { ApiGatewayStack } from './lib/stacks/api-gateway';
import { LambdaApiStack } from './lib/stacks/lambda-api';

class MyApp extends cdk.App {
	//stackLambda: any;

	constructor() {
		super();

		// Test Stacks 1
		var devStackLambda = new LambdaStack( this, 'lambda-stack' );
		devStackLambda.templateOptions.description = 'Lambda Stack';
		
		var devStackApiGateway = new ApiGatewayStack( this, 'api-stack', {
			lambda: devStackLambda.lambda
		} );
		devStackApiGateway.templateOptions.description = 'API Stack';

		// Test Stacks 2
		var testStackLambda = new LambdaApiStack( this, 'lambda-api-stack' );
		testStackLambda.templateOptions.description = 'Lambda and API Stack';
	}
}

new MyApp().run();
