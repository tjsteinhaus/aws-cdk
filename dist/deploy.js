#!/usr/bin/env node
"use strict";
const figlet = require('figlet');
const chalk = require('chalk');
const { readdirSync, existsSync, readFileSync } = require('fs');
const { resolve, join } = require('path');
const { spawnSync } = require('child_process');
// Lambda Folder Path
const lambda_path = resolve(__dirname, '../code/lambda/');
// Root Folder
const root_path = resolve(__dirname, '../');
// Passed Arguments
const argv = process.argv.slice(2);
class DeployClass {
    constructor() {
        this.verbose = false;
        this.args = {};
        this.parseArguments();
        this.commandHelp();
        this.checkVerbose();
        this.runCommands();
    }
    commandHelp() {
        console.log(chalk.yellow(figlet.textSync('DeployJS', { horizontalLayout: 'full' })) + '\n');
        if (this.args.help || Object.keys(this.args).length <= 0) {
            console.log(`Usage <command> <option>\n`);
            console.log(`Where <command> is one of:\n`);
            console.log(`\t-d, --deploy   Build the Lambda's (NPM Install and Webpack) and Deploy the CDK`);
            console.log(`\t-l, --lambda   Build the Lambda's (NPM Install and Webpack)`);
            console.log(``);
            console.log(`Where <option> is one of:\n`);
            console.log(`\t-v, --verbose   Verbose Output`);
            console.log(`\t-s, --skiplambda   Skip the lambda builds`);
            console.log('\t--stack=<stack>   Optional. Deploy specific stack (default: all)');
            console.log('\t--env=<env>   Optional. Deploy to specific environment(default: aws default)');
            console.log(` `);
            console.log('npm run deploy -- <command>');
            console.log('npm run deploy -- <command> <option>');
            console.log('npm run deploy -- --help');
            console.log(` `);
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
    async runCommands() {
        if (this.args.length <= 0) {
            console.log(chalk.red(`No commands were found`));
            return;
        }
        const args = Object.keys(this.args);
        // Run Lambda Build
        if (!(args.includes('s') || args.includes('skiplambda')) && (args.includes('lambda') || args.includes('l') || args.includes('deploy') || args.includes('d'))) {
            await this.lambdaBuilds();
        }
        // Run CDK
        if (args.includes('deploy') || args.includes('d')) {
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
    async lambdaBuilds() {
        console.log(chalk.underline.bold('A) Install Node Packages for Lambda\'s and run Webpack to bundle our Lambda\'s'));
        let folder_count = 1;
        readdirSync(lambda_path).forEach(async (folder) => {
            let verbose = 'ignore';
            const folderPath = join(lambda_path, folder);
            const packageJsonPath = join(folderPath, 'package.json');
            // Check for package.json, if nothing is there, return
            if (!existsSync(packageJsonPath))
                return;
            const readPackageJson = JSON.parse(readFileSync(packageJsonPath));
            console.log(`   ${folder_count}) Lambda: ${readPackageJson.name}`);
            folder_count++;
            if (this.verbose) {
                verbose = 'inherit';
            }
            // Install NPM Modules;
            console.log(chalk.magenta(`      a) Install Node Modules`));
            await spawnSync('npm', ['install'], { env: process.env, cwd: folderPath, stdio: verbose });
            // Run Webpack
            console.log(chalk.magenta(`      b) Run Webpack`));
            await spawnSync('webpack', { env: process.env, cwd: folderPath, stdio: verbose });
        });
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
    async CdkDeploy() {
        console.log(chalk.underline.bold('B) Compile Typescript for CDK and Deploy The Application'));
        let verbose = 'ignore';
        if (this.verbose) {
            verbose = 'inherit';
        }
        console.log(chalk.magenta(`      a) Build CDK Typescript`));
        await spawnSync('npm', ['run', 'build'], { env: process.env, cwd: root_path, stdio: verbose });
        console.log(chalk.magenta(`      b) Deploy CDK`));
        // Get Stack Items
        const stack = this.getStackItems();
        // Get Deploy Env
        const deploy_env = this.getDeployEnv();
        let profile = [];
        if (deploy_env != '') {
            profile.push('--profile');
            profile.push(deploy_env);
        }
        if (stack.length > 0) {
            // Loop through our stack items and deploy them
            await asyncForEach(stack, async (item) => {
                await spawnSync('cdk', ['deploy', item, ...profile], { env: process.env, cwd: root_path, stdio: verbose });
            });
        }
        else {
            await spawnSync('cdk', ['deploy', ...profile], { env: process.env, cwd: root_path, stdio: verbose });
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
    getStackItems() {
        const readStackJSON = JSON.parse(readFileSync(join(root_path, 'stacks.json')));
        if ('stack' in this.args && this.args.stack != '' && this.args.stack != 'all') {
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
    getDeployEnv() {
        if ('env' in this.args && this.args.env != '') {
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
    checkVerbose() {
        if ('verbose' in this.args && this.args.verbose) {
            this.verbose = true;
            console.log(chalk.red('Verbose Mode Enabled\n'));
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
    parseArguments() {
        if (argv.length <= 0)
            return;
        argv.forEach((arg) => {
            if (this.character_count(arg, '-') == 1) {
                let key = arg.replace(/-/g, '').split("");
                key.forEach(a => {
                    if (a == 'v')
                        a = 'verbose';
                    this.args[a] = true;
                });
            }
            else if (this.character_count(arg, '-') == 2) {
                const split = arg.split('=');
                const key = split[0].replace(/-/g, '');
                let value = split[1];
                if (value == '' || value == undefined) {
                    value = true;
                }
                this.args[key] = value;
            }
        });
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
    character_count(string, char, ptr = 0, count = 0) {
        while (ptr = string.indexOf(char, ptr) + 1) {
            count++;
        }
        return count;
    }
}
(async () => {
    new DeployClass();
})();
/**
 * Async version of foreach
 *
 * @param {*} array
 * @param {Function} callback
 */
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2RlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBRSxRQUFRLENBQUUsQ0FBQztBQUNuQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7QUFDakMsTUFBTSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFFLElBQUksQ0FBRSxDQUFDO0FBQ2xFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFFLE1BQU0sQ0FBRSxDQUFDO0FBQzVDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUUsZUFBZSxDQUFFLENBQUM7QUFFakQscUJBQXFCO0FBQ3JCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUUsQ0FBQztBQUU1RCxjQUFjO0FBQ2QsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFFLFNBQVMsRUFBRSxLQUFLLENBQUUsQ0FBQztBQUU5QyxtQkFBbUI7QUFDbkIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFFLENBQUM7QUFFckMsTUFBTSxXQUFXO0lBSWhCO1FBSEEsWUFBTyxHQUFZLEtBQUssQ0FBQztRQUN6QixTQUFJLEdBQVEsRUFBRSxDQUFDO1FBR2QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxXQUFXO1FBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBRSxNQUFNLENBQUMsUUFBUSxDQUFFLFVBQVUsRUFB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QUFDLEdBQUcsS0FBSyxDQUFDO2FBQ3ZCO1FBQ0YsQ0FBQyxDQUFFLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNLLGVBQWUsQ0FBRSxNQUFjLEVBQUUsSUFBWSxFQUFFLE1BQWMsQ0FBQyxFQUFFLFFBQWdCLENBQUM7UUFDeEYsT0FBTyxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBRSxJQUFJLEVBQUUsR0FBRyxDQUFFLEdBQUcsQ0FBQyxFQUFHO1lBQUUsS0FBSyxFQUFFLENBQUE7U0FBRTtRQUUxRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVELENBQUUsS0FBSyxJQUFJLEVBQUU7SUFDWixJQUFJLFdBQVcsRUFBRSxDQUFDO0FBQ25CLENBQUMsQ0FBRSxFQUFFLENBQUM7QUFFTjs7Ozs7R0FLRztBQUNILEtBQUssVUFBVSxZQUFZLENBQUMsS0FBVSxFQUFFLFFBQWtCO0lBQ3pELEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ2pELE1BQU0sUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7S0FDNUM7QUFDQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5cclxuLy9jb25zdCB7IHByb21pc2lmeSB9ID0gcmVxdWlyZSggJ3V0aWwnICk7XHJcbmNvbnN0IGZpZ2xldCA9IHJlcXVpcmUoICdmaWdsZXQnICk7XHJcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSggJ2NoYWxrJyApO1xyXG5jb25zdCB7IHJlYWRkaXJTeW5jLCBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSA9IHJlcXVpcmUoICdmcycgKTtcclxuY29uc3QgeyByZXNvbHZlLCBqb2luIH0gPSByZXF1aXJlKCAncGF0aCcgKTtcclxuY29uc3QgeyBzcGF3blN5bmMgfSA9IHJlcXVpcmUoICdjaGlsZF9wcm9jZXNzJyApO1xyXG5cclxuLy8gTGFtYmRhIEZvbGRlciBQYXRoXHJcbmNvbnN0IGxhbWJkYV9wYXRoID0gcmVzb2x2ZSggX19kaXJuYW1lLCAnLi4vY29kZS9sYW1iZGEvJyApO1xyXG5cclxuLy8gUm9vdCBGb2xkZXJcclxuY29uc3Qgcm9vdF9wYXRoID0gcmVzb2x2ZSggX19kaXJuYW1lLCAnLi4vJyApO1xyXG5cclxuLy8gUGFzc2VkIEFyZ3VtZW50c1xyXG5jb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKCAyICk7XHJcblxyXG5jbGFzcyBEZXBsb3lDbGFzcyB7XHJcblx0dmVyYm9zZTogQm9vbGVhbiA9IGZhbHNlO1xyXG5cdGFyZ3M6IGFueSA9IHt9O1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMucGFyc2VBcmd1bWVudHMoKTtcclxuXHRcdHRoaXMuY29tbWFuZEhlbHAoKTtcclxuXHRcdHRoaXMuY2hlY2tWZXJib3NlKCk7XHJcblx0XHR0aGlzLnJ1bkNvbW1hbmRzKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNvbW1hbmRIZWxwKCkge1xyXG5cdFx0Y29uc29sZS5sb2coIGNoYWxrLnllbGxvdyggZmlnbGV0LnRleHRTeW5jKCAnRGVwbG95SlMnLCB7IGhvcml6b250YWxMYXlvdXQ6ICdmdWxsJyB9ICkgKSArICdcXG4nICk7XHJcblx0XHRpZiggdGhpcy5hcmdzLmhlbHAgfHwgT2JqZWN0LmtleXMoIHRoaXMuYXJncyApLmxlbmd0aCA8PSAwICApIHtcdFx0XHRcclxuXHRcdFx0Y29uc29sZS5sb2coIGBVc2FnZSA8Y29tbWFuZD4gPG9wdGlvbj5cXG5gICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgV2hlcmUgPGNvbW1hbmQ+IGlzIG9uZSBvZjpcXG5gICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgXFx0LWQsIC0tZGVwbG95ICAgQnVpbGQgdGhlIExhbWJkYSdzIChOUE0gSW5zdGFsbCBhbmQgV2VicGFjaykgYW5kIERlcGxveSB0aGUgQ0RLYCApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggYFxcdC1sLCAtLWxhbWJkYSAgIEJ1aWxkIHRoZSBMYW1iZGEncyAoTlBNIEluc3RhbGwgYW5kIFdlYnBhY2spYCApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggYGAgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coIGBXaGVyZSA8b3B0aW9uPiBpcyBvbmUgb2Y6XFxuYCApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggYFxcdC12LCAtLXZlcmJvc2UgICBWZXJib3NlIE91dHB1dGAgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coIGBcXHQtcywgLS1za2lwbGFtYmRhICAgU2tpcCB0aGUgbGFtYmRhIGJ1aWxkc2AgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coICdcXHQtLXN0YWNrPTxzdGFjaz4gICBPcHRpb25hbC4gRGVwbG95IHNwZWNpZmljIHN0YWNrIChkZWZhdWx0OiBhbGwpJylcclxuXHRcdFx0Y29uc29sZS5sb2coICdcXHQtLWVudj08ZW52PiAgIE9wdGlvbmFsLiBEZXBsb3kgdG8gc3BlY2lmaWMgZW52aXJvbm1lbnQoZGVmYXVsdDogYXdzIGRlZmF1bHQpJyApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggYCBgICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCducG0gcnVuIGRlcGxveSAtLSA8Y29tbWFuZD4nKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ25wbSBydW4gZGVwbG95IC0tIDxjb21tYW5kPiA8b3B0aW9uPicpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbnBtIHJ1biBkZXBsb3kgLS0gLS1oZWxwJyk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgIGAgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZpZ3VyZXMgb3V0IHdoaWNoIGNvbW1hbmRzIHRvIHJ1blxyXG5cdCAqXHJcblx0ICogQHByaXZhdGVcclxuXHQgKiBAcmV0dXJuc1xyXG5cdCAqIEBtZW1iZXJvZiBEZXBsb3lDbGFzc1xyXG5cdCAqIFxyXG5cdCAqIEBzaW5jZSAxLjAuMFxyXG5cdCAqIEBhdXRob3IgVHlsZXIgU3RlaW5oYXVzIDx0anN0ZWluaGF1c0BnbWFpbC5jb20+XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBydW5Db21tYW5kcygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmKCB0aGlzLmFyZ3MubGVuZ3RoIDw9IDAgKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBjaGFsay5yZWQoIGBObyBjb21tYW5kcyB3ZXJlIGZvdW5kYCApICk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBhcmdzID0gT2JqZWN0LmtleXMoIHRoaXMuYXJncyApO1xyXG5cclxuXHRcdC8vIFJ1biBMYW1iZGEgQnVpbGRcclxuXHRcdGlmKCAhKCBhcmdzLmluY2x1ZGVzKCAncycgKSB8fCBhcmdzLmluY2x1ZGVzKCAnc2tpcGxhbWJkYScgKSApICYmICggYXJncy5pbmNsdWRlcyggJ2xhbWJkYScgKSB8fCBhcmdzLmluY2x1ZGVzKCAnbCcgKSB8fCBhcmdzLmluY2x1ZGVzKCAnZGVwbG95JyApIHx8IGFyZ3MuaW5jbHVkZXMoICdkJyApICkgKSB7XHJcblx0XHRcdGF3YWl0IHRoaXMubGFtYmRhQnVpbGRzKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUnVuIENES1xyXG5cdFx0aWYoIGFyZ3MuaW5jbHVkZXMoICdkZXBsb3knICkgfHwgYXJncy5pbmNsdWRlcyggJ2QnICkgKSB7XHJcblx0XHRcdGF3YWl0IHRoaXMuQ2RrRGVwbG95KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBJbnN0YWxscyB0aGUgTlBNIE1vZHVsZXMgYW5kIHdlYnBhY2tzIHRoZSBsYW1iZGEnc1xyXG5cdCAqXHJcblx0ICogQHJldHVybnMge1Byb21pc2U8dm9pZD59XHJcblx0ICogQG1lbWJlcm9mIERlcGxveUNsYXNzXHJcblx0ICogXHJcblx0ICogQHNpbmNlIDEuMC4wXHJcblx0ICogQGF1dGhvciBUeWxlciBTdGVpbmhhdXMgPHRqc3RlaW5oYXVzQGdtYWlsLmNvbT5cclxuXHQgKi9cclxuXHRhc3luYyBsYW1iZGFCdWlsZHMoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zb2xlLmxvZyggY2hhbGsudW5kZXJsaW5lLmJvbGQoICdBKSBJbnN0YWxsIE5vZGUgUGFja2FnZXMgZm9yIExhbWJkYVxcJ3MgYW5kIHJ1biBXZWJwYWNrIHRvIGJ1bmRsZSBvdXIgTGFtYmRhXFwncycgKSApO1xyXG5cdFxyXG5cdFx0bGV0IGZvbGRlcl9jb3VudCA9IDE7XHJcblx0XHRyZWFkZGlyU3luYyggbGFtYmRhX3BhdGggKS5mb3JFYWNoKCBhc3luYyAoIGZvbGRlcjogYW55ICkgPT4ge1xyXG5cdFx0XHRsZXQgdmVyYm9zZSA9ICdpZ25vcmUnO1xyXG5cdFx0XHRjb25zdCBmb2xkZXJQYXRoID0gam9pbiggbGFtYmRhX3BhdGgsIGZvbGRlciApO1xyXG5cdFx0XHRjb25zdCBwYWNrYWdlSnNvblBhdGggPSBqb2luKCBmb2xkZXJQYXRoLCAncGFja2FnZS5qc29uJyApO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIHBhY2thZ2UuanNvbiwgaWYgbm90aGluZyBpcyB0aGVyZSwgcmV0dXJuXHJcblx0XHRcdGlmKCAhZXhpc3RzU3luYyggcGFja2FnZUpzb25QYXRoICApICkgcmV0dXJuO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVhZFBhY2thZ2VKc29uID0gSlNPTi5wYXJzZSggcmVhZEZpbGVTeW5jKCBwYWNrYWdlSnNvblBhdGggKSApO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coIGAgICAke2ZvbGRlcl9jb3VudH0pIExhbWJkYTogJHtyZWFkUGFja2FnZUpzb24ubmFtZX1gICk7XHJcblx0XHRcdGZvbGRlcl9jb3VudCsrO1xyXG5cclxuXHRcdFx0aWYoIHRoaXMudmVyYm9zZSApIHtcclxuXHRcdFx0XHR2ZXJib3NlID0gJ2luaGVyaXQnO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBJbnN0YWxsIE5QTSBNb2R1bGVzO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggY2hhbGsubWFnZW50YSggYCAgICAgIGEpIEluc3RhbGwgTm9kZSBNb2R1bGVzYCApICk7XHJcblx0XHRcdGF3YWl0IHNwYXduU3luYyggJ25wbScsIFsgJ2luc3RhbGwnIF0sIHsgZW52OiBwcm9jZXNzLmVudiwgY3dkOiBmb2xkZXJQYXRoLCBzdGRpbzogdmVyYm9zZSB9ICk7XHJcblxyXG5cdFx0XHQvLyBSdW4gV2VicGFja1xyXG5cdFx0XHRjb25zb2xlLmxvZyggY2hhbGsubWFnZW50YSggYCAgICAgIGIpIFJ1biBXZWJwYWNrYCApICk7XHJcblx0XHRcdGF3YWl0IHNwYXduU3luYyggJ3dlYnBhY2snLCB7IGVudjogcHJvY2Vzcy5lbnYsIGN3ZDogZm9sZGVyUGF0aCwgc3RkaW86IHZlcmJvc2UgfSApO1xyXG5cdFx0fSApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUnVucyBUeXBlc2NyaXB0IGFuZCB0cmFuc3BpbGVzIG91ciBhcHBsaWNhdGlvbiBzbyB3ZSBjYW4gZGVwbG95XHJcblx0ICogdG8gQVdTIHVzaW5nIHRoZSBDREsuXHJcblx0ICpcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cclxuXHQgKiBAbWVtYmVyb2YgRGVwbG95Q2xhc3NcclxuXHQgKiBcclxuXHQgKiBAc2luY2UgMS4wLjBcclxuXHQgKiBAYXV0aG9yIFR5bGVyIFN0ZWluaGF1cyA8dGpzdGVpbmhhdXNAZ21haWwuY29tPlxyXG5cdCAqL1xyXG5cdGFzeW5jIENka0RlcGxveSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnNvbGUubG9nKCBjaGFsay51bmRlcmxpbmUuYm9sZCggJ0IpIENvbXBpbGUgVHlwZXNjcmlwdCBmb3IgQ0RLIGFuZCBEZXBsb3kgVGhlIEFwcGxpY2F0aW9uJyApICk7XHJcblxyXG5cdFx0bGV0IHZlcmJvc2UgPSAnaWdub3JlJztcclxuXHJcblx0XHRpZiggdGhpcy52ZXJib3NlICkge1xyXG5cdFx0XHR2ZXJib3NlID0gJ2luaGVyaXQnO1xyXG5cdFx0fVxyXG5cclxuXHJcblxyXG5cdFx0Y29uc29sZS5sb2coIGNoYWxrLm1hZ2VudGEoIGAgICAgICBhKSBCdWlsZCBDREsgVHlwZXNjcmlwdGAgKSApO1xyXG5cdFx0YXdhaXQgc3Bhd25TeW5jKCAnbnBtJywgWyAncnVuJywgJ2J1aWxkJyBdLCB7IGVudjogcHJvY2Vzcy5lbnYsIGN3ZDogcm9vdF9wYXRoLCBzdGRpbzogdmVyYm9zZSB9ICk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coIGNoYWxrLm1hZ2VudGEoIGAgICAgICBiKSBEZXBsb3kgQ0RLYCApICk7XHJcblx0XHRcclxuXHRcdC8vIEdldCBTdGFjayBJdGVtc1xyXG5cdFx0Y29uc3Qgc3RhY2sgPSB0aGlzLmdldFN0YWNrSXRlbXMoKTtcclxuXHJcblx0XHQvLyBHZXQgRGVwbG95IEVudlxyXG5cdFx0Y29uc3QgZGVwbG95X2VudiA9IHRoaXMuZ2V0RGVwbG95RW52KCk7XHJcblx0XHRsZXQgcHJvZmlsZTogQXJyYXk8U3RyaW5nPiA9IFtdO1xyXG5cdFx0aWYoIGRlcGxveV9lbnYgIT0gJycgKSB7XHJcblx0XHRcdHByb2ZpbGUucHVzaCggJy0tcHJvZmlsZScgKTtcclxuXHRcdFx0cHJvZmlsZS5wdXNoKCBkZXBsb3lfZW52ICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoIHN0YWNrLmxlbmd0aCA+IDAgKSB7XHJcblx0XHRcdC8vIExvb3AgdGhyb3VnaCBvdXIgc3RhY2sgaXRlbXMgYW5kIGRlcGxveSB0aGVtXHJcblx0XHRcdGF3YWl0IGFzeW5jRm9yRWFjaCggc3RhY2ssIGFzeW5jICggaXRlbTogT2JqZWN0ICkgPT4ge1xyXG5cdFx0XHRcdGF3YWl0IHNwYXduU3luYyggJ2NkaycsIFsgJ2RlcGxveScsIGl0ZW0sIC4uLnByb2ZpbGUgXSwgeyBlbnY6IHByb2Nlc3MuZW52LCBjd2Q6IHJvb3RfcGF0aCwgc3RkaW86IHZlcmJvc2UgfSApO1xyXG5cdFx0XHR9ICk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRhd2FpdCBzcGF3blN5bmMoICdjZGsnLCBbICdkZXBsb3knLCAuLi5wcm9maWxlIF0sIHsgZW52OiBwcm9jZXNzLmVudiwgY3dkOiByb290X3BhdGgsIHN0ZGlvOiB2ZXJib3NlIH0gKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgc3RhY2sgaXRlbXMgZnJvbSB0aGUgc3RhY2tzLmpzb24gZmlsZVxyXG5cdCAqXHJcblx0ICogQHByaXZhdGVcclxuXHQgKiBAcmV0dXJucyB7b2JqZWN0fVxyXG5cdCAqIEBtZW1iZXJvZiBEZXBsb3lDbGFzc1xyXG5cdCAqIFxyXG5cdCAqIEBzaW5jZSAxLjAuMFxyXG5cdCAqIEBhdXRob3IgVHlsZXIgU3RlaW5oYXVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRTdGFja0l0ZW1zKCk6IEFycmF5PHN0cmluZz4ge1xyXG5cdFx0Y29uc3QgcmVhZFN0YWNrSlNPTiA9IEpTT04ucGFyc2UoIHJlYWRGaWxlU3luYyggam9pbiggcm9vdF9wYXRoLCAnc3RhY2tzLmpzb24nICkgKSApO1xyXG5cclxuXHRcdGlmKCAnc3RhY2snIGluIHRoaXMuYXJncyAmJiB0aGlzLmFyZ3Muc3RhY2sgIT0gJycgJiYgdGhpcy5hcmdzLnN0YWNrICE9ICdhbGwnICkge1xyXG5cdFx0XHRsZXQgc3RhY2sgPSB0aGlzLmFyZ3Muc3RhY2s7XHJcblxyXG5cdFx0XHRyZXR1cm4gcmVhZFN0YWNrSlNPTltzdGFja107XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIFtdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBkZXBsb3kgZW52aXJvbm1lbnRcclxuXHQgKlxyXG5cdCAqIEBwcml2YXRlXHJcblx0ICogQHJldHVybnMge3N0cmluZ31cclxuXHQgKiBAbWVtYmVyb2YgRGVwbG95Q2xhc3NcclxuXHQgKiBcclxuXHQgKiBAc2luY2UgMS4wLjBcclxuXHQgKiBAYXV0aG9yIFR5bGVyIFN0ZWluaGF1c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0RGVwbG95RW52KCk6IHN0cmluZyB7XHJcblx0XHRpZiggJ2VudicgaW4gdGhpcy5hcmdzICYmIHRoaXMuYXJncy5lbnYgIT0gJycgKSB7XHJcblx0XHRcdHJldHVybiB0aGlzLmFyZ3MuZW52O1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiAnJztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGFuZCBzZXQgdmVyYm9zZSBtb2RlXHJcblx0ICogXHJcblx0ICogQHNpbmNlIDEuMC4wXHJcblx0ICogQGF1dGhvciBUeWxlciBTdGVpbmhhdXMgPHRqc3RlaW5oYXVzQGdtYWlsLmNvbT5cclxuXHQgKi9cclxuXHRwcml2YXRlIGNoZWNrVmVyYm9zZSgpOiB2b2lkIHtcclxuXHRcdGlmKCAndmVyYm9zZScgaW4gdGhpcy5hcmdzICYmIHRoaXMuYXJncy52ZXJib3NlICkge1xyXG5cdFx0XHR0aGlzLnZlcmJvc2UgPSB0cnVlO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggY2hhbGsucmVkKCAnVmVyYm9zZSBNb2RlIEVuYWJsZWRcXG4nICkgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBhcnNlIGFsbCB0aGUgYXJndW1lbnRzIGludG8gdGhlIGFyZ3MgdmFyXHJcblx0ICpcclxuXHQgKiBAcHJpdmF0ZVxyXG5cdCAqIEByZXR1cm5zXHJcblx0ICogQG1lbWJlcm9mIERlcGxveUNsYXNzXHJcblx0ICogXHJcblx0ICogQHNpbmNlIDEuMC4wXHJcblx0ICogQGF1dGhvciBUeWxlciBTdGVpbmhhdXMgPHRqc3RlaW5oYXVzQGdtYWlsLmNvbT5cclxuXHQgKi9cclxuXHRwcml2YXRlIHBhcnNlQXJndW1lbnRzKCk6IHZvaWQge1xyXG5cdFx0aWYoIGFyZ3YubGVuZ3RoIDw9IDAgKSByZXR1cm47XHJcblxyXG5cdFx0YXJndi5mb3JFYWNoKCAoIGFyZyApID0+IHtcclxuXHRcdFx0aWYoIHRoaXMuY2hhcmFjdGVyX2NvdW50KCBhcmcsICctJyApID09IDEgKSB7XHJcblx0XHRcdFx0bGV0IGtleSA9IGFyZy5yZXBsYWNlKCAvLS9nLCAnJyApLnNwbGl0KFwiXCIpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGtleS5mb3JFYWNoKCBhID0+IHtcclxuXHRcdFx0XHRcdGlmKCBhID09ICd2JyApIGEgPSAndmVyYm9zZSc7XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5hcmdzW2FdID0gdHJ1ZTtcclxuXHRcdFx0XHR9ICk7XHJcblx0XHRcdH0gZWxzZSBpZiggdGhpcy5jaGFyYWN0ZXJfY291bnQoIGFyZywgJy0nICkgPT0gMiApIHtcclxuXHRcdFx0XHRjb25zdCBzcGxpdDogYW55ID0gYXJnLnNwbGl0KCAnPScgKTtcclxuXHRcdFx0XHRjb25zdCBrZXkgPSBzcGxpdFswXS5yZXBsYWNlKCAvLS9nLCAnJyApO1xyXG5cdFx0XHRcdGxldCB2YWx1ZSA9IHNwbGl0WzFdO1xyXG5cclxuXHRcdFx0XHRpZiggdmFsdWUgPT0gJycgfHwgdmFsdWUgPT0gdW5kZWZpbmVkICkge1xyXG5cdFx0XHRcdFx0dmFsdWUgPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGhpcy5hcmdzW2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fSApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ291bnRzIGhvdyBtYW55IHRpbWVzIGEgY2hhcmFjdGVyIGlzIGluIGEgc3RyaW5nXHJcblx0ICpcclxuXHQgKiBAcHJpdmF0ZVxyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmdcclxuXHQgKiBAcGFyYW0ge3N0cmluZ30gY2hhclxyXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBbcHRyPTBdXHJcblx0ICogQHBhcmFtIHtudW1iZXJ9IFtjb3VudD0wXVxyXG5cdCAqIEByZXR1cm5zXHJcblx0ICogQG1lbWJlcm9mIERlcGxveUNsYXNzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjaGFyYWN0ZXJfY291bnQoIHN0cmluZzogc3RyaW5nLCBjaGFyOiBzdHJpbmcsIHB0cjogbnVtYmVyID0gMCwgY291bnQ6IG51bWJlciA9IDApIHtcclxuXHRcdHdoaWxlKCBwdHIgPSBzdHJpbmcuaW5kZXhPZiggY2hhciwgcHRyICkgKyAxICkgeyBjb3VudCsrIH1cclxuXHRcdFxyXG5cdFx0cmV0dXJuIGNvdW50O1xyXG5cdH1cclxufVxyXG5cclxuKCBhc3luYyAoKSA9PiB7XHJcblx0bmV3IERlcGxveUNsYXNzKCk7XHJcbn0gKSgpO1xyXG5cclxuLyoqXHJcbiAqIEFzeW5jIHZlcnNpb24gb2YgZm9yZWFjaFxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IGFycmF5XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBhc3luY0ZvckVhY2goYXJyYXk6IGFueSwgY2FsbGJhY2s6IEZ1bmN0aW9uKSB7XHJcblx0Zm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGFycmF5Lmxlbmd0aDsgaW5kZXgrKykge1xyXG5cdCAgYXdhaXQgY2FsbGJhY2soYXJyYXlbaW5kZXhdLCBpbmRleCwgYXJyYXkpO1xyXG5cdH1cclxuICB9Il19