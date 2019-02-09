#!/usr/bin/env node

//const { promisify } = require( 'util' );
const figlet = require( 'figlet' );
const chalk = require( 'chalk' );
const { readdirSync, existsSync, readFileSync } = require( 'fs' );
const { resolve, join } = require( 'path' );
const { spawnSync } = require( 'child_process' );
require( 'dotenv' ).config();

console.log( process.env );

// Lambda Folder Path
const lambda_path = resolve( __dirname, '../code/lambda/' );

// Root Folder
const root_path = resolve( __dirname, '../' );

// Passed Arguments
const argv = process.argv.slice( 2 );

class DeployClass {
	verbose: Boolean = false;
	args: any = {};

	constructor() {
		this.parseArguments();
		this.commandHelp();
		this.checkVerbose();
		this.runCommands();
	}

	private commandHelp() {
		console.log( chalk.yellow( figlet.textSync( 'DeployJS', { horizontalLayout: 'full' } ) ) + '\n' );
		if( this.args.help || Object.keys( this.args ).length <= 0  ) {			
			console.log( `Usage <command> <option>\n` );
			console.log( `Where <command> is one of:\n` );
			console.log( `\t-d, --deploy   Build the Lambda's (NPM Install and Webpack) and Deploy the CDK` );
			console.log( `\t-l, --lambda   Build the Lambda's (NPM Install and Webpack)` );
			console.log( `` );
			console.log( `Where <option> is one of:\n` );
			console.log( `\t-v, --verbose   Verbose Output` );
			console.log( `\t-s, --skiplambda   Skip the lambda builds` );
			console.log( '\t--stack=<stack>   Optional. Deploy specific stack (default: all)')
			console.log( '\t--env=<env>   Optional. Deploy to specific environment(default: aws default)' );
			console.log( ` ` );
			console.log('npm run deploy -- <command>');
            console.log('npm run deploy -- <command> <option>');
            console.log('npm run deploy -- --help');
			console.log( ` ` );
		}
	}

	/**
	 * Figures out which commands to run
	 *
	 * @private
	 * @returns
	 * @memberof DeployClass
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus <tjsteinhaus@gmail.com>
	 */
	private async runCommands(): Promise<void> {
		if( this.args.length <= 0 ) {
			console.log( chalk.red( `No commands were found` ) );
			return;
		}

		const args = Object.keys( this.args );

		// Run Lambda Build
		if( !( args.includes( 's' ) || args.includes( 'skiplambda' ) ) && ( args.includes( 'lambda' ) || args.includes( 'l' ) || args.includes( 'deploy' ) || args.includes( 'd' ) ) ) {
			await this.lambdaBuilds();
		}

		// Run CDK
		if( args.includes( 'deploy' ) || args.includes( 'd' ) ) {
			await this.CdkDeploy();
		}
	}

	/**
	 * Installs the NPM Modules and webpacks the lambda's
	 *
	 * @returns {Promise<void>}
	 * @memberof DeployClass
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus <tjsteinhaus@gmail.com>
	 */
	async lambdaBuilds(): Promise<void> {
		console.log( chalk.underline.bold( 'A) Install Node Packages for Lambda\'s and run Webpack to bundle our Lambda\'s' ) );
	
		let folder_count = 1;
		await readdirSync( lambda_path ).forEach( async ( folder: any ) => {
			let verbose = 'ignore';
			const folderPath = join( lambda_path, folder );
			const packageJsonPath = join( folderPath, 'package.json' );

			// Check for package.json, if nothing is there, return
			if( !existsSync( packageJsonPath  ) ) return;

			const readPackageJson = JSON.parse( readFileSync( packageJsonPath ) );

			console.log( `   ${folder_count}) Lambda: ${readPackageJson.name}` );
			folder_count++;

			if( this.verbose ) {
				verbose = 'inherit';
			}
			
			// Install NPM Modules;
			console.log( chalk.magenta( `      a) Install Node Modules` ) );
			await spawnSync( 'npm', [ 'install' ], { env: process.env, cwd: folderPath, stdio: verbose } );

			// Run Webpack
			console.log( chalk.magenta( `      b) Run Webpack` ) );
			await spawnSync( 'npm', [ 'run', 'build' ], { env: process.env, cwd: folderPath, stdio: verbose } );
		} );
	}

	/**
	 * Runs Typescript and transpiles our application so we can deploy
	 * to AWS using the CDK.
	 *
	 * @returns {Promise<void>}
	 * @memberof DeployClass
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus <tjsteinhaus@gmail.com>
	 */
	async CdkDeploy(): Promise<void> {
		console.log( chalk.underline.bold( 'B) Compile Typescript for CDK and Deploy The Application' ) );

		let verbose = 'ignore';

		if( this.verbose ) {
			verbose = 'inherit';
		}



		console.log( chalk.magenta( `      a) Build CDK Typescript` ) );
		await spawnSync( 'npm', [ 'run', 'build' ], { env: process.env, cwd: root_path, stdio: verbose } );

		console.log( chalk.magenta( `      b) Deploy CDK` ) );
		
		// Get Stack Items
		const stack = this.getStackItems();

		// Get Deploy Env
		const deploy_env = this.getDeployEnv();
		let profile: Array<String> = [];
		if( deploy_env != '' ) {
			profile.push( '--profile' );
			profile.push( deploy_env );
		}

		if( stack.length > 0 ) {
			// Loop through our stack items and deploy them
			await asyncForEach( stack, async ( item: Object ) => {
				await spawnSync( 'cdk', [ 'deploy', item, ...profile ], { env: process.env, cwd: root_path, stdio: verbose } );
			} );
		} else {
			await spawnSync( 'cdk', [ 'deploy', ...profile ], { env: process.env, cwd: root_path, stdio: verbose } );
		}
	}

	/**
	 * Get the stack items from the stacks.json file
	 *
	 * @private
	 * @returns {object}
	 * @memberof DeployClass
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus
	 */
	private getStackItems(): Array<string> {
		const readStackJSON = JSON.parse( readFileSync( join( root_path, 'stacks.json' ) ) );

		if( 'stack' in this.args && this.args.stack != '' && this.args.stack != 'all' ) {
			let stack = this.args.stack;

			return readStackJSON[stack];
		}

		return [];
	}

	/**
	 * Get the deploy environment
	 *
	 * @private
	 * @returns {string}
	 * @memberof DeployClass
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus
	 */
	private getDeployEnv(): string {
		if( 'env' in this.args && this.args.env != '' ) {
			return this.args.env;
		}

		return '';
	}

	/**
	 * Check and set verbose mode
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus <tjsteinhaus@gmail.com>
	 */
	private checkVerbose(): void {
		if( 'verbose' in this.args && this.args.verbose ) {
			this.verbose = true;
			console.log( chalk.red( 'Verbose Mode Enabled\n' ) );
		}
	}

	/**
	 * Parse all the arguments into the args var
	 *
	 * @private
	 * @returns
	 * @memberof DeployClass
	 * 
	 * @since 1.0.0
	 * @author Tyler Steinhaus <tjsteinhaus@gmail.com>
	 */
	private parseArguments(): void {
		if( argv.length <= 0 ) return;

		argv.forEach( ( arg ) => {
			if( this.character_count( arg, '-' ) == 1 ) {
				let key = arg.replace( /-/g, '' ).split("");
				
				key.forEach( a => {
					if( a == 'v' ) a = 'verbose';

					this.args[a] = true;
				} );
			} else if( this.character_count( arg, '-' ) == 2 ) {
				const split: any = arg.split( '=' );
				const key = split[0].replace( /-/g, '' );
				let value = split[1];

				if( value == '' || value == undefined ) {
					value = true;
				}

				this.args[key] = value;
			}
		} );
	}

	/**
	 * Counts how many times a character is in a string
	 *
	 * @private
	 * @param {string} string
	 * @param {string} char
	 * @param {number} [ptr=0]
	 * @param {number} [count=0]
	 * @returns
	 * @memberof DeployClass
	 */
	private character_count( string: string, char: string, ptr: number = 0, count: number = 0) {
		while( ptr = string.indexOf( char, ptr ) + 1 ) { count++ }
		
		return count;
	}
}

( async () => {
	new DeployClass();
} )();

/**
 * Async version of foreach
 *
 * @param {*} array
 * @param {Function} callback
 */
async function asyncForEach(array: any, callback: Function) {
	for (let index = 0; index < array.length; index++) {
	  await callback(array[index], index, array);
	}
  }