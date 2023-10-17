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

    const timeout = parseFloat(core.getInput('timeout')) * 60000; // Convert to ms

    console.log(`Running test: ${testName}`);

    let myOutput = '';
    let myError = '';
    let startTime;

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
        startTime = new Date();
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

        const endTime = new Date();
        const result = {
            version: 1,
            status: myError ? 'fail' : 'pass',
            tests: [{
                name: testName,
                status: myError ? 'fail' : 'pass',
                message: myError || myOutput,
                test_code: `${command}`,
                filename: "",
                line_no: 0,
                duration: endTime - startTime
            }]
        }

        core.setOutput('result', btoa(JSON.stringify(result)));
    } catch (error) {
        // Handle any error that occurs during the execution of the action
        const endTime = new Date();
        const result = {
            version: 1,
            status: 'fail',
            tests: [{
                name: testName,
                status: 'fail',
                message: myError || error.message,
                test_code: `${command}`,
                filename: "",
                line_no: 0,
                duration: endTime - startTime
            }]
        }

        core.setOutput('result', btoa(JSON.stringify(result)));
    }
}

run();
