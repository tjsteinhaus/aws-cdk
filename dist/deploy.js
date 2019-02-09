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
            await spawnSync('npm', ['build'], { env: process.env, cwd: folderPath, stdio: verbose });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2RlcGxveS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBRSxRQUFRLENBQUUsQ0FBQztBQUNuQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUUsT0FBTyxDQUFFLENBQUM7QUFDakMsTUFBTSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFFLElBQUksQ0FBRSxDQUFDO0FBQ2xFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsT0FBTyxDQUFFLE1BQU0sQ0FBRSxDQUFDO0FBQzVDLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUUsZUFBZSxDQUFFLENBQUM7QUFFakQscUJBQXFCO0FBQ3JCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUUsQ0FBQztBQUU1RCxjQUFjO0FBQ2QsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFFLFNBQVMsRUFBRSxLQUFLLENBQUUsQ0FBQztBQUU5QyxtQkFBbUI7QUFDbkIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUUsQ0FBQyxDQUFFLENBQUM7QUFFckMsTUFBTSxXQUFXO0lBSWhCO1FBSEEsWUFBTyxHQUFZLEtBQUssQ0FBQztRQUN6QixTQUFJLEdBQVEsRUFBRSxDQUFDO1FBR2QsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDcEIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFTyxXQUFXO1FBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBRSxNQUFNLENBQUMsUUFBUSxDQUFFLFVBQVUsRUFB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QUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7YUFDdkI7UUFDRixDQUFDLENBQUUsQ0FBQztJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7OztPQVVHO0lBQ0ssZUFBZSxDQUFFLE1BQWMsRUFBRSxJQUFZLEVBQUUsTUFBYyxDQUFDLEVBQUUsUUFBZ0IsQ0FBQztRQUN4RixPQUFPLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFFLElBQUksRUFBRSxHQUFHLENBQUUsR0FBRyxDQUFDLEVBQUc7WUFBRSxLQUFLLEVBQUUsQ0FBQTtTQUFFO1FBRTFELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEO0FBRUQsQ0FBRSxLQUFLLElBQUksRUFBRTtJQUNaLElBQUksV0FBVyxFQUFFLENBQUM7QUFDbkIsQ0FBQyxDQUFFLEVBQUUsQ0FBQztBQUVOOzs7OztHQUtHO0FBQ0gsS0FBSyxVQUFVLFlBQVksQ0FBQyxLQUFVLEVBQUUsUUFBa0I7SUFDekQsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDakQsTUFBTSxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM1QztBQUNBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcblxyXG4vL2NvbnN0IHsgcHJvbWlzaWZ5IH0gPSByZXF1aXJlKCAndXRpbCcgKTtcclxuY29uc3QgZmlnbGV0ID0gcmVxdWlyZSggJ2ZpZ2xldCcgKTtcclxuY29uc3QgY2hhbGsgPSByZXF1aXJlKCAnY2hhbGsnICk7XHJcbmNvbnN0IHsgcmVhZGRpclN5bmMsIGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9ID0gcmVxdWlyZSggJ2ZzJyApO1xyXG5jb25zdCB7IHJlc29sdmUsIGpvaW4gfSA9IHJlcXVpcmUoICdwYXRoJyApO1xyXG5jb25zdCB7IHNwYXduU3luYyB9ID0gcmVxdWlyZSggJ2NoaWxkX3Byb2Nlc3MnICk7XHJcblxyXG4vLyBMYW1iZGEgRm9sZGVyIFBhdGhcclxuY29uc3QgbGFtYmRhX3BhdGggPSByZXNvbHZlKCBfX2Rpcm5hbWUsICcuLi9jb2RlL2xhbWJkYS8nICk7XHJcblxyXG4vLyBSb290IEZvbGRlclxyXG5jb25zdCByb290X3BhdGggPSByZXNvbHZlKCBfX2Rpcm5hbWUsICcuLi8nICk7XHJcblxyXG4vLyBQYXNzZWQgQXJndW1lbnRzXHJcbmNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoIDIgKTtcclxuXHJcbmNsYXNzIERlcGxveUNsYXNzIHtcclxuXHR2ZXJib3NlOiBCb29sZWFuID0gZmFsc2U7XHJcblx0YXJnczogYW55ID0ge307XHJcblxyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5wYXJzZUFyZ3VtZW50cygpO1xyXG5cdFx0dGhpcy5jb21tYW5kSGVscCgpO1xyXG5cdFx0dGhpcy5jaGVja1ZlcmJvc2UoKTtcclxuXHRcdHRoaXMucnVuQ29tbWFuZHMoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY29tbWFuZEhlbHAoKSB7XHJcblx0XHRjb25zb2xlLmxvZyggY2hhbGsueWVsbG93KCBmaWdsZXQudGV4dFN5bmMoICdEZXBsb3lKUycsIHsgaG9yaXpvbnRhbExheW91dDogJ2Z1bGwnIH0gKSApICsgJ1xcbicgKTtcclxuXHRcdGlmKCB0aGlzLmFyZ3MuaGVscCB8fCBPYmplY3Qua2V5cyggdGhpcy5hcmdzICkubGVuZ3RoIDw9IDAgICkge1x0XHRcdFxyXG5cdFx0XHRjb25zb2xlLmxvZyggYFVzYWdlIDxjb21tYW5kPiA8b3B0aW9uPlxcbmAgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coIGBXaGVyZSA8Y29tbWFuZD4gaXMgb25lIG9mOlxcbmAgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coIGBcXHQtZCwgLS1kZXBsb3kgICBCdWlsZCB0aGUgTGFtYmRhJ3MgKE5QTSBJbnN0YWxsIGFuZCBXZWJwYWNrKSBhbmQgRGVwbG95IHRoZSBDREtgICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgXFx0LWwsIC0tbGFtYmRhICAgQnVpbGQgdGhlIExhbWJkYSdzIChOUE0gSW5zdGFsbCBhbmQgV2VicGFjaylgICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgYCApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggYFdoZXJlIDxvcHRpb24+IGlzIG9uZSBvZjpcXG5gICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgXFx0LXYsIC0tdmVyYm9zZSAgIFZlcmJvc2UgT3V0cHV0YCApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggYFxcdC1zLCAtLXNraXBsYW1iZGEgICBTa2lwIHRoZSBsYW1iZGEgYnVpbGRzYCApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyggJ1xcdC0tc3RhY2s9PHN0YWNrPiAgIE9wdGlvbmFsLiBEZXBsb3kgc3BlY2lmaWMgc3RhY2sgKGRlZmF1bHQ6IGFsbCknKVxyXG5cdFx0XHRjb25zb2xlLmxvZyggJ1xcdC0tZW52PTxlbnY+ICAgT3B0aW9uYWwuIERlcGxveSB0byBzcGVjaWZpYyBlbnZpcm9ubWVudChkZWZhdWx0OiBhd3MgZGVmYXVsdCknICk7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBgIGAgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coJ25wbSBydW4gZGVwbG95IC0tIDxjb21tYW5kPicpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbnBtIHJ1biBkZXBsb3kgLS0gPGNvbW1hbmQ+IDxvcHRpb24+Jyk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCducG0gcnVuIGRlcGxveSAtLSAtLWhlbHAnKTtcclxuXHRcdFx0Y29uc29sZS5sb2coIGAgYCApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmlndXJlcyBvdXQgd2hpY2ggY29tbWFuZHMgdG8gcnVuXHJcblx0ICpcclxuXHQgKiBAcHJpdmF0ZVxyXG5cdCAqIEByZXR1cm5zXHJcblx0ICogQG1lbWJlcm9mIERlcGxveUNsYXNzXHJcblx0ICogXHJcblx0ICogQHNpbmNlIDEuMC4wXHJcblx0ICogQGF1dGhvciBUeWxlciBTdGVpbmhhdXMgPHRqc3RlaW5oYXVzQGdtYWlsLmNvbT5cclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHJ1bkNvbW1hbmRzKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYoIHRoaXMuYXJncy5sZW5ndGggPD0gMCApIHtcclxuXHRcdFx0Y29uc29sZS5sb2coIGNoYWxrLnJlZCggYE5vIGNvbW1hbmRzIHdlcmUgZm91bmRgICkgKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGFyZ3MgPSBPYmplY3Qua2V5cyggdGhpcy5hcmdzICk7XHJcblxyXG5cdFx0Ly8gUnVuIExhbWJkYSBCdWlsZFxyXG5cdFx0aWYoICEoIGFyZ3MuaW5jbHVkZXMoICdzJyApIHx8IGFyZ3MuaW5jbHVkZXMoICdza2lwbGFtYmRhJyApICkgJiYgKCBhcmdzLmluY2x1ZGVzKCAnbGFtYmRhJyApIHx8IGFyZ3MuaW5jbHVkZXMoICdsJyApIHx8IGFyZ3MuaW5jbHVkZXMoICdkZXBsb3knICkgfHwgYXJncy5pbmNsdWRlcyggJ2QnICkgKSApIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5sYW1iZGFCdWlsZHMoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSdW4gQ0RLXHJcblx0XHRpZiggYXJncy5pbmNsdWRlcyggJ2RlcGxveScgKSB8fCBhcmdzLmluY2x1ZGVzKCAnZCcgKSApIHtcclxuXHRcdFx0YXdhaXQgdGhpcy5DZGtEZXBsb3koKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEluc3RhbGxzIHRoZSBOUE0gTW9kdWxlcyBhbmQgd2VicGFja3MgdGhlIGxhbWJkYSdzXHJcblx0ICpcclxuXHQgKiBAcmV0dXJucyB7UHJvbWlzZTx2b2lkPn1cclxuXHQgKiBAbWVtYmVyb2YgRGVwbG95Q2xhc3NcclxuXHQgKiBcclxuXHQgKiBAc2luY2UgMS4wLjBcclxuXHQgKiBAYXV0aG9yIFR5bGVyIFN0ZWluaGF1cyA8dGpzdGVpbmhhdXNAZ21haWwuY29tPlxyXG5cdCAqL1xyXG5cdGFzeW5jIGxhbWJkYUJ1aWxkcygpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnNvbGUubG9nKCBjaGFsay51bmRlcmxpbmUuYm9sZCggJ0EpIEluc3RhbGwgTm9kZSBQYWNrYWdlcyBmb3IgTGFtYmRhXFwncyBhbmQgcnVuIFdlYnBhY2sgdG8gYnVuZGxlIG91ciBMYW1iZGFcXCdzJyApICk7XHJcblx0XHJcblx0XHRsZXQgZm9sZGVyX2NvdW50ID0gMTtcclxuXHRcdHJlYWRkaXJTeW5jKCBsYW1iZGFfcGF0aCApLmZvckVhY2goIGFzeW5jICggZm9sZGVyOiBhbnkgKSA9PiB7XHJcblx0XHRcdGxldCB2ZXJib3NlID0gJ2lnbm9yZSc7XHJcblx0XHRcdGNvbnN0IGZvbGRlclBhdGggPSBqb2luKCBsYW1iZGFfcGF0aCwgZm9sZGVyICk7XHJcblx0XHRcdGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4oIGZvbGRlclBhdGgsICdwYWNrYWdlLmpzb24nICk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBmb3IgcGFja2FnZS5qc29uLCBpZiBub3RoaW5nIGlzIHRoZXJlLCByZXR1cm5cclxuXHRcdFx0aWYoICFleGlzdHNTeW5jKCBwYWNrYWdlSnNvblBhdGggICkgKSByZXR1cm47XHJcblxyXG5cdFx0XHRjb25zdCByZWFkUGFja2FnZUpzb24gPSBKU09OLnBhcnNlKCByZWFkRmlsZVN5bmMoIHBhY2thZ2VKc29uUGF0aCApICk7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyggYCAgICR7Zm9sZGVyX2NvdW50fSkgTGFtYmRhOiAke3JlYWRQYWNrYWdlSnNvbi5uYW1lfWAgKTtcclxuXHRcdFx0Zm9sZGVyX2NvdW50Kys7XHJcblxyXG5cdFx0XHRpZiggdGhpcy52ZXJib3NlICkge1xyXG5cdFx0XHRcdHZlcmJvc2UgPSAnaW5oZXJpdCc7XHJcblx0XHRcdH1cclxuXHRcdFx0XHJcblx0XHRcdC8vIEluc3RhbGwgTlBNIE1vZHVsZXM7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBjaGFsay5tYWdlbnRhKCBgICAgICAgYSkgSW5zdGFsbCBOb2RlIE1vZHVsZXNgICkgKTtcclxuXHRcdFx0YXdhaXQgc3Bhd25TeW5jKCAnbnBtJywgWyAnaW5zdGFsbCcgXSwgeyBlbnY6IHByb2Nlc3MuZW52LCBjd2Q6IGZvbGRlclBhdGgsIHN0ZGlvOiB2ZXJib3NlIH0gKTtcclxuXHJcblx0XHRcdC8vIFJ1biBXZWJwYWNrXHJcblx0XHRcdGNvbnNvbGUubG9nKCBjaGFsay5tYWdlbnRhKCBgICAgICAgYikgUnVuIFdlYnBhY2tgICkgKTtcclxuXHRcdFx0YXdhaXQgc3Bhd25TeW5jKCAnbnBtJywgWyAnYnVpbGQnIF0sIHsgZW52OiBwcm9jZXNzLmVudiwgY3dkOiBmb2xkZXJQYXRoLCBzdGRpbzogdmVyYm9zZSB9ICk7XHJcblx0XHR9ICk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSdW5zIFR5cGVzY3JpcHQgYW5kIHRyYW5zcGlsZXMgb3VyIGFwcGxpY2F0aW9uIHNvIHdlIGNhbiBkZXBsb3lcclxuXHQgKiB0byBBV1MgdXNpbmcgdGhlIENESy5cclxuXHQgKlxyXG5cdCAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+fVxyXG5cdCAqIEBtZW1iZXJvZiBEZXBsb3lDbGFzc1xyXG5cdCAqIFxyXG5cdCAqIEBzaW5jZSAxLjAuMFxyXG5cdCAqIEBhdXRob3IgVHlsZXIgU3RlaW5oYXVzIDx0anN0ZWluaGF1c0BnbWFpbC5jb20+XHJcblx0ICovXHJcblx0YXN5bmMgQ2RrRGVwbG95KCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc29sZS5sb2coIGNoYWxrLnVuZGVybGluZS5ib2xkKCAnQikgQ29tcGlsZSBUeXBlc2NyaXB0IGZvciBDREsgYW5kIERlcGxveSBUaGUgQXBwbGljYXRpb24nICkgKTtcclxuXHJcblx0XHRsZXQgdmVyYm9zZSA9ICdpZ25vcmUnO1xyXG5cclxuXHRcdGlmKCB0aGlzLnZlcmJvc2UgKSB7XHJcblx0XHRcdHZlcmJvc2UgPSAnaW5oZXJpdCc7XHJcblx0XHR9XHJcblxyXG5cclxuXHJcblx0XHRjb25zb2xlLmxvZyggY2hhbGsubWFnZW50YSggYCAgICAgIGEpIEJ1aWxkIENESyBUeXBlc2NyaXB0YCApICk7XHJcblx0XHRhd2FpdCBzcGF3blN5bmMoICducG0nLCBbICdydW4nLCAnYnVpbGQnIF0sIHsgZW52OiBwcm9jZXNzLmVudiwgY3dkOiByb290X3BhdGgsIHN0ZGlvOiB2ZXJib3NlIH0gKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyggY2hhbGsubWFnZW50YSggYCAgICAgIGIpIERlcGxveSBDREtgICkgKTtcclxuXHRcdFxyXG5cdFx0Ly8gR2V0IFN0YWNrIEl0ZW1zXHJcblx0XHRjb25zdCBzdGFjayA9IHRoaXMuZ2V0U3RhY2tJdGVtcygpO1xyXG5cclxuXHRcdC8vIEdldCBEZXBsb3kgRW52XHJcblx0XHRjb25zdCBkZXBsb3lfZW52ID0gdGhpcy5nZXREZXBsb3lFbnYoKTtcclxuXHRcdGxldCBwcm9maWxlOiBBcnJheTxTdHJpbmc+ID0gW107XHJcblx0XHRpZiggZGVwbG95X2VudiAhPSAnJyApIHtcclxuXHRcdFx0cHJvZmlsZS5wdXNoKCAnLS1wcm9maWxlJyApO1xyXG5cdFx0XHRwcm9maWxlLnB1c2goIGRlcGxveV9lbnYgKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiggc3RhY2subGVuZ3RoID4gMCApIHtcclxuXHRcdFx0Ly8gTG9vcCB0aHJvdWdoIG91ciBzdGFjayBpdGVtcyBhbmQgZGVwbG95IHRoZW1cclxuXHRcdFx0YXdhaXQgYXN5bmNGb3JFYWNoKCBzdGFjaywgYXN5bmMgKCBpdGVtOiBPYmplY3QgKSA9PiB7XHJcblx0XHRcdFx0YXdhaXQgc3Bhd25TeW5jKCAnY2RrJywgWyAnZGVwbG95JywgaXRlbSwgLi4ucHJvZmlsZSBdLCB7IGVudjogcHJvY2Vzcy5lbnYsIGN3ZDogcm9vdF9wYXRoLCBzdGRpbzogdmVyYm9zZSB9ICk7XHJcblx0XHRcdH0gKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGF3YWl0IHNwYXduU3luYyggJ2NkaycsIFsgJ2RlcGxveScsIC4uLnByb2ZpbGUgXSwgeyBlbnY6IHByb2Nlc3MuZW52LCBjd2Q6IHJvb3RfcGF0aCwgc3RkaW86IHZlcmJvc2UgfSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBzdGFjayBpdGVtcyBmcm9tIHRoZSBzdGFja3MuanNvbiBmaWxlXHJcblx0ICpcclxuXHQgKiBAcHJpdmF0ZVxyXG5cdCAqIEByZXR1cm5zIHtvYmplY3R9XHJcblx0ICogQG1lbWJlcm9mIERlcGxveUNsYXNzXHJcblx0ICogXHJcblx0ICogQHNpbmNlIDEuMC4wXHJcblx0ICogQGF1dGhvciBUeWxlciBTdGVpbmhhdXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFN0YWNrSXRlbXMoKTogQXJyYXk8c3RyaW5nPiB7XHJcblx0XHRjb25zdCByZWFkU3RhY2tKU09OID0gSlNPTi5wYXJzZSggcmVhZEZpbGVTeW5jKCBqb2luKCByb290X3BhdGgsICdzdGFja3MuanNvbicgKSApICk7XHJcblxyXG5cdFx0aWYoICdzdGFjaycgaW4gdGhpcy5hcmdzICYmIHRoaXMuYXJncy5zdGFjayAhPSAnJyAmJiB0aGlzLmFyZ3Muc3RhY2sgIT0gJ2FsbCcgKSB7XHJcblx0XHRcdGxldCBzdGFjayA9IHRoaXMuYXJncy5zdGFjaztcclxuXHJcblx0XHRcdHJldHVybiByZWFkU3RhY2tKU09OW3N0YWNrXTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gW107XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGhlIGRlcGxveSBlbnZpcm9ubWVudFxyXG5cdCAqXHJcblx0ICogQHByaXZhdGVcclxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxyXG5cdCAqIEBtZW1iZXJvZiBEZXBsb3lDbGFzc1xyXG5cdCAqIFxyXG5cdCAqIEBzaW5jZSAxLjAuMFxyXG5cdCAqIEBhdXRob3IgVHlsZXIgU3RlaW5oYXVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXREZXBsb3lFbnYoKTogc3RyaW5nIHtcclxuXHRcdGlmKCAnZW52JyBpbiB0aGlzLmFyZ3MgJiYgdGhpcy5hcmdzLmVudiAhPSAnJyApIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuYXJncy5lbnY7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuICcnO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgYW5kIHNldCB2ZXJib3NlIG1vZGVcclxuXHQgKiBcclxuXHQgKiBAc2luY2UgMS4wLjBcclxuXHQgKiBAYXV0aG9yIFR5bGVyIFN0ZWluaGF1cyA8dGpzdGVpbmhhdXNAZ21haWwuY29tPlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2hlY2tWZXJib3NlKCk6IHZvaWQge1xyXG5cdFx0aWYoICd2ZXJib3NlJyBpbiB0aGlzLmFyZ3MgJiYgdGhpcy5hcmdzLnZlcmJvc2UgKSB7XHJcblx0XHRcdHRoaXMudmVyYm9zZSA9IHRydWU7XHJcblx0XHRcdGNvbnNvbGUubG9nKCBjaGFsay5yZWQoICdWZXJib3NlIE1vZGUgRW5hYmxlZFxcbicgKSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgYWxsIHRoZSBhcmd1bWVudHMgaW50byB0aGUgYXJncyB2YXJcclxuXHQgKlxyXG5cdCAqIEBwcml2YXRlXHJcblx0ICogQHJldHVybnNcclxuXHQgKiBAbWVtYmVyb2YgRGVwbG95Q2xhc3NcclxuXHQgKiBcclxuXHQgKiBAc2luY2UgMS4wLjBcclxuXHQgKiBAYXV0aG9yIFR5bGVyIFN0ZWluaGF1cyA8dGpzdGVpbmhhdXNAZ21haWwuY29tPlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VBcmd1bWVudHMoKTogdm9pZCB7XHJcblx0XHRpZiggYXJndi5sZW5ndGggPD0gMCApIHJldHVybjtcclxuXHJcblx0XHRhcmd2LmZvckVhY2goICggYXJnICkgPT4ge1xyXG5cdFx0XHRpZiggdGhpcy5jaGFyYWN0ZXJfY291bnQoIGFyZywgJy0nICkgPT0gMSApIHtcclxuXHRcdFx0XHRsZXQga2V5ID0gYXJnLnJlcGxhY2UoIC8tL2csICcnICkuc3BsaXQoXCJcIik7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0a2V5LmZvckVhY2goIGEgPT4ge1xyXG5cdFx0XHRcdFx0aWYoIGEgPT0gJ3YnICkgYSA9ICd2ZXJib3NlJztcclxuXHJcblx0XHRcdFx0XHR0aGlzLmFyZ3NbYV0gPSB0cnVlO1xyXG5cdFx0XHRcdH0gKTtcclxuXHRcdFx0fSBlbHNlIGlmKCB0aGlzLmNoYXJhY3Rlcl9jb3VudCggYXJnLCAnLScgKSA9PSAyICkge1xyXG5cdFx0XHRcdGNvbnN0IHNwbGl0OiBhbnkgPSBhcmcuc3BsaXQoICc9JyApO1xyXG5cdFx0XHRcdGNvbnN0IGtleSA9IHNwbGl0WzBdLnJlcGxhY2UoIC8tL2csICcnICk7XHJcblx0XHRcdFx0bGV0IHZhbHVlID0gc3BsaXRbMV07XHJcblxyXG5cdFx0XHRcdGlmKCB2YWx1ZSA9PSAnJyB8fCB2YWx1ZSA9PSB1bmRlZmluZWQgKSB7XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGlzLmFyZ3Nba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHR9XHJcblx0XHR9ICk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb3VudHMgaG93IG1hbnkgdGltZXMgYSBjaGFyYWN0ZXIgaXMgaW4gYSBzdHJpbmdcclxuXHQgKlxyXG5cdCAqIEBwcml2YXRlXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZ1xyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBjaGFyXHJcblx0ICogQHBhcmFtIHtudW1iZXJ9IFtwdHI9MF1cclxuXHQgKiBAcGFyYW0ge251bWJlcn0gW2NvdW50PTBdXHJcblx0ICogQHJldHVybnNcclxuXHQgKiBAbWVtYmVyb2YgRGVwbG95Q2xhc3NcclxuXHQgKi9cclxuXHRwcml2YXRlIGNoYXJhY3Rlcl9jb3VudCggc3RyaW5nOiBzdHJpbmcsIGNoYXI6IHN0cmluZywgcHRyOiBudW1iZXIgPSAwLCBjb3VudDogbnVtYmVyID0gMCkge1xyXG5cdFx0d2hpbGUoIHB0ciA9IHN0cmluZy5pbmRleE9mKCBjaGFyLCBwdHIgKSArIDEgKSB7IGNvdW50KysgfVxyXG5cdFx0XHJcblx0XHRyZXR1cm4gY291bnQ7XHJcblx0fVxyXG59XHJcblxyXG4oIGFzeW5jICgpID0+IHtcclxuXHRuZXcgRGVwbG95Q2xhc3MoKTtcclxufSApKCk7XHJcblxyXG4vKipcclxuICogQXN5bmMgdmVyc2lvbiBvZiBmb3JlYWNoXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gYXJyYXlcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGFzeW5jRm9yRWFjaChhcnJheTogYW55LCBjYWxsYmFjazogRnVuY3Rpb24pIHtcclxuXHRmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgYXJyYXkubGVuZ3RoOyBpbmRleCsrKSB7XHJcblx0ICBhd2FpdCBjYWxsYmFjayhhcnJheVtpbmRleF0sIGluZGV4LCBhcnJheSk7XHJcblx0fVxyXG4gIH0iXX0=