const process = require('process')
const cp = require('child_process')
const path = require('path')

const np = process.execPath
const ip = path.join(__dirname, '..', 'src', 'main.js')

function runTestWithEnv(env) {
  const options = {
    env: {
      ...process.env,
      ...env,
    },
    encoding: 'utf-8',
  }
  const child = cp.spawnSync(np, [ip], options)
  const stdout = child.stdout.toString()
  const encodedResult = stdout.split('::set-output name=result::')[1].trim()
  return JSON.parse(atob(encodedResult))
}

function atob(str) {
  return Buffer.from(str, 'base64').toString('utf8')
}

test('test runs', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'echo Hello, World!',
    INPUT_TIMEOUT: '5',
  })

  expect(result.status).toBe('pass')
  expect(result.tests[0].name).toBe('Test 1')
  expect(result.tests[0].status).toBe('pass')
  expect(result.tests[0].message).toContain('Hello, World!\n')
})

test('contains pre-set environment variables', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'env',
    'INPUT_EXPECTED-OUTPUT': 'Failing on purpose',
    'INPUT_COMPARISON-METHOD': 'exact',
  })

  expect(result.tests[0].message).toContain(`PATH=${process.env.PATH}`)
  expect(result.tests[0].message).toContain('FORCE_COLOR=true')
  expect(result.tests[0].message).toContain('DOTNET_CLI_HOME=/tmp')
  expect(result.tests[0].message).toContain('DOTNET_NOLOGO=true')
  expect(result.tests[0].message).toContain(`HOME=${process.env.HOME}`)
})

test('awards score if provided', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'echo Hello, World!',
    'INPUT_MAX-SCORE': '100',
  })

  expect(result.max_score).toBe(100)
  expect(result.tests[0].score).toBe(100)
})

test('falls back to 0 points if none provided', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 1',
    INPUT_COMMAND: 'echo Hello, World!',
  })

  expect(result.max_score).toBe(0)
  expect(result.tests[0].score).toBe(0)
})

test('test fails on bad logic', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 2',
    INPUT_COMMAND: 'node -e "process.exit(1);"',
  })

  expect(result.status).toBe('fail')
  expect(result.tests[0].name).toBe('Test 2')
  expect(result.tests[0].status).toBe('fail')
  expect(result.tests[0].message).toContain('failed with exit code 1')
})

test('awards no points if test fails', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 2',
    INPUT_COMMAND: 'node -e "process.exit(1);"',
    'INPUT_MAX-SCORE': '100',
  })

  expect(result.max_score).toBe(100)
  expect(result.tests[0].score).toBe(0)
})

test('test fails on bad code', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 3',
    INPUT_COMMAND: 'node -e "console.log(a);"',
  })

  // Asserting on specific properties of the result
  expect(result.status).toBe('fail')
  expect(result.tests[0].name).toBe('Test 3')
  expect(result.tests[0].status).toBe('fail')
  expect(result.tests[0].message).toContain('failed with exit code 1')
})

test('test fails on non-existent executable', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 4',
    INPUT_COMMAND: 'nonexistentcommand',
  })

  expect(result.status).toBe('error')
  expect(result.tests[0].name).toBe('Test 4')
  expect(result.tests[0].status).toBe('error')
  expect(result.tests[0].message).toContain('Unable to locate executable file: nonexistentcommand')
})

test('test fails on command timeout', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Timeout Test',
    INPUT_COMMAND: 'sleep 3',
    INPUT_TIMEOUT: '0.01', // ~ 1 second
  })

  expect(result.status).toBe('error')
  expect(result.tests[0].name).toBe('Timeout Test')
  expect(result.tests[0].status).toBe('error')
  expect(result.tests[0].message).toContain('Command timed out')
})

test('test passes when command completes before timeout', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Timeout Success Test',
    INPUT_COMMAND: 'sleep 1',
    INPUT_TIMEOUT: '5', // minutes
  })

  expect(result.status).toBe('pass')
  expect(result.tests[0].name).toBe('Timeout Success Test')
  expect(result.tests[0].status).toBe('pass')
})

test('test fails on setup command timeout', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Setup Timeout Test',
    'INPUT_SETUP-COMMAND': 'sleep 3',
    INPUT_COMMAND: 'echo Hello, World!',
    INPUT_TIMEOUT: '0.01', // ~ 1 second
  })

  expect(result.status).toBe('error')
  expect(result.tests[0].name).toBe('Setup Timeout Test')
  expect(result.tests[0].status).toBe('error')
  expect(result.tests[0].message).toContain('Command timed out')
})

test('awards no points if test errors', () => {
  const result = runTestWithEnv({
    'INPUT_TEST-NAME': 'Test 4',
    INPUT_COMMAND: 'nonexistentcommand',
    'INPUT_MAX-SCORE': '100',
  })

  expect(result.max_score).toBe(100)
  expect(result.tests[0].score).toBe(0)
})
