import { Handler, Context, Callback } from 'aws-lambda';

import { find } from 'lodash';

interface Response {
	statusCode: Number;
	headers: Object;
	body: String
}

class TestLambda {
	event: any;
	context: Context;
	callback: Callback;

	constructor( event: any = {}, context: Context, callback: Callback ) {
		this.event = event;
		this.context = context;
		this.callback = callback;
		
		const test_array = [
			{ id: 'test' },
			{ id: 'test2', first_name: 'Tyler', last_name: 'Steinhaus' },
			{ id: 'test3' },
			{ id: 'test4' }
		];

		const n = find( test_array, ( o: { id: String } ) => o.id == 'test2' ) ;

		console.log( n );

		
	}

	routing(): Response {
		var R = { // Setup the default response
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin":"*"
			},
			body: JSON.stringify( this.event )
		};

		return R;
	}
}

export const handler: Handler = async function( event: any = {}, context: Context, callback: Callback ) {
	const c = new TestLambda( event, context, callback );
	return c.routing();
}
