import cdk = require('@aws-cdk/cdk');
import lambda = require('@aws-cdk/aws-lambda');
import apigateway = require('@aws-cdk/aws-apigateway');
import path = require('path');

export class LambdaApiStack extends cdk.Stack {
	lambda: any;
	api: any;

	constructor(scope: cdk.App, id: string, props ? : cdk.StackProps) {
		super(scope, id, props);

		this.lambda = new lambda.Function(this, 'Test', {
			runtime: lambda.Runtime.NodeJS810,
			handler: 'index.handler',
			code: lambda.Code.asset(path.join(__dirname, '../../../code/lambda/test-lambda/dist'))
		});

		this.api = new apigateway.RestApi(this, 'test-api2');

		const test = this.api.root.addResource('test');
		this.addOPTIONS( test, 'OPTIONS,GET' )
		test.addMethod('GET', new apigateway.LambdaIntegration(this.lambda))
	}

	addOPTIONS(sessionsResource: any, methods: any) {

        // The MOCK integration for OPTIONS
        const optionsMethod = sessionsResource.addMethod(
            'OPTIONS',
            new apigateway.MockIntegration({
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': `'${[
                                // These are the headers added by the API Gateway console by default. They may not all be needed for this
                                // particular API.
                                'Authorization',
                                'Content-Type',
                                'X-Amz-Date',
                                'X-Amz-Security-Token',
                                'X-Api-Key',

                                // This is a custom header needed for this API.
                                'x-code',
                            ].join()}'`,
                            'method.response.header.Access-Control-Allow-Methods': `'${methods}'`,
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                        },
                        responseTemplates: {
                            'application/json': '',
                        },
                    },
                ],
                passthroughBehavior: apigateway.PassthroughBehavior.Never,
                requestTemplates: {
                    'application/json': '{"statusCode": 200}',
                },
            }),
        );

        // https://stackoverflow.com/questions/52752201/enabling-cors-for-aws-api-gateway-with-the-aws-cdk
        // since "methodResponses" is not supported by apigw.Method (https://github.com/awslabs/aws-cdk/issues/905)
        // we will need to use an escape hatch to override the property

        const optionsMethodResource = optionsMethod.node.findChild('Resource'); // as apigw.cloudformation.MethodResource;
        optionsMethodResource.propertyOverrides.methodResponses = [
            {
                statusCode: '200',
                responseModels: {
                    'application/json': 'Empty',
                },
                responseParameters: {
                    'method.response.header.Access-Control-Allow-Headers': true,
                    'method.response.header.Access-Control-Allow-Methods': true,
                    'method.response.header.Access-Control-Allow-Origin': true,
                },
            },
        ];
}
}