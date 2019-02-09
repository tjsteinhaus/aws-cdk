const path = require( 'path' );

const BUILD_DIR = path.resolve(__dirname , "./dist");
const APP_DIR = path.resolve(__dirname, "./src/index.ts");

module.exports = {
	entry: APP_DIR,
	target: "node",
	module: {
		rules: [ 
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: [ '.tsx', '.ts', '.js' ]
	},
	output: {
		filename: 'index.js',
		path: BUILD_DIR,
		libraryTarget: 'umd'
	},
	mode: "production",
	optimization: {
		usedExports: true
	}
}