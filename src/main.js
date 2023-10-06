const core = require('@actions/core');
const exec = require('@actions/exec');

async function run() {
    const testName = core.getInput('test-name', {
        required: true
    });
    const setupCommand = core.getInput('setup-command');
    const command = core.getInput('command', {
        required: true
    });
    const timeoutStr = core.getInput('timeout');
    const timeout = timeoutStr ? parseInt(timeoutStr) * 1000 : undefined;

    console.log(`Running test: ${testName}`);

    let myOutput = '';
    let myError = '';

    try {
        if (setupCommand) {
            const setupPromise = exec.exec(setupCommand);
            console.log(`Running setup command: ${setupCommand}`);

            if (timeout) {
                await Promise.race([
                    setupPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Command timed out')), timeout))
                ]);
            } else {
                await setupPromise;
            }
        }

        console.log(`Running command: ${command}`);
        const options = {};
        options.listeners = {
            stdout: (data) => {
                myOutput += data.toString();
            },
            stderr: (data) => {
                myError += data.toString();
            }
        };

        const execPromise = exec.exec(command, [], options);

        if (timeout) {
            await Promise.race([
                execPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Command timed out')), timeout))
            ]);
        } else {
            await execPromise;
        }

        const result = {
            status: myError ? 'fail' : 'pass',
            message: myError || myOutput,
            tests: [{
                name: testName,
                status: myError ? 'fail' : 'pass',
                message: myError || myOutput
            }]
        };

        core.setOutput('result', JSON.stringify(result));
    } catch (error) {
        // Handle any error that occurs during the execution of the action
        const result = {
            status: 'fail',
            message: myError || error.message, // Include stderr in the message
            tests: [{
                name: testName,
                status: 'fail',
                message: myError || error.message // Include stderr in the message
            }]
        };
        core.setOutput('result', JSON.stringify(result));
    }
}

run();
