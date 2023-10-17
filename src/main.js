const core = require('@actions/core');
const {
    execSync
} = require('child_process');

function btoa(str) {
    return Buffer.from(str).toString('base64');
}

function run() {
    const testName = core.getInput('test-name', {
        required: true
    });
    const setupCommand = core.getInput('setup-command');
    const command = core.getInput('command', {
        required: true
    });

    const timeout = parseFloat(core.getInput('timeout')) * 60000; // Convert to ms

    let myOutput = '';
    let startTime;

    try {
        if (setupCommand) {
            execSync(setupCommand, {
                timeout: timeout
            });
        }

        startTime = new Date();
        myOutput = execSync(command, {
            timeout: timeout
        }).toString();

        const endTime = new Date();
        const result = {
            version: 1,
            status: 'pass',
            tests: [{
                name: testName,
                status: 'pass',
                message: myOutput,
                test_code: `${command}`,
                filename: "",
                line_no: 0,
                duration: endTime - startTime
            }]
        }

        core.setOutput('result', btoa(JSON.stringify(result)));

    } catch (error) {
        let message = error.message;

        if (message.includes("ETIMEDOUT")) {
            message = "Command timed out";
        } else if (message.includes("command not found")) {
            message = "Unable to locate executable file: " + command;
        } else if (message.includes("Command failed")) {
            message = "failed with exit code 1"
        }
        const endTime = new Date();
        const result = {
            version: 1,
            status: 'fail',
            tests: [{
                name: testName,
                status: 'fail',
                message: message,
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