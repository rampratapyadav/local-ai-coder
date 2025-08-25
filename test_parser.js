import { parseToolCall } from './cli.js';

const testCases = [
    {
        name: 'Simple tool call with no arguments',
        input: 'my_tool()',
        expected: { toolName: 'my_tool', args: [] }
    },
    {
        name: 'Tool call with one simple argument',
        input: 'my_tool(\'hello\')',
        expected: { toolName: 'my_tool', args: ["'hello'"] }
    },
    {
        name: 'Tool call with multiple simple arguments',
        input: 'my_tool(\'hello\', \'world\')',
        expected: { toolName: 'my_tool', args: ["'hello'", "'world'"] }
    },
    {
        name: 'Tool call with arguments containing spaces',
        input: 'my_tool("hello world", "another arg")',
        expected: { toolName: 'my_tool', args: ['"hello world"', '"another arg"'] }
    },
    {
        name: 'Tool call with arguments containing commas',
        input: 'my_tool("hello, world", "another, arg")',
        expected: { toolName: 'my_tool', args: ['"hello, world"', '"another, arg"'] }
    },
    {
        name: 'Tool call with nested parentheses',
        input: 'my_tool(a, (b, c))',
        expected: { toolName: 'my_tool', args: ['a', '(b, c)'] }
    },
    {
        name: 'Tool call with mixed quotes',
        input: 'my_tool("hello", \'world\')',
        expected: { toolName: 'my_tool', args: ['"hello"', "'world'"] }
    },
    {
        name: 'Invalid tool call - missing closing parenthesis',
        input: 'my_tool(a, b',
        expected: null
    },
    {
        name: 'Invalid tool call - missing opening parenthesis',
        input: 'my_tool a, b)',
        expected: null
    },
    {
        name: 'Invalid tool call - no parentheses',
        input: 'my_tool',
        expected: null
    }
];

let failed = 0;
for (const testCase of testCases) {
    const result = parseToolCall(testCase.input);
    if (JSON.stringify(result) !== JSON.stringify(testCase.expected)) {
        console.error(`Test case failed: ${testCase.name}`);
        console.error(`Input: ${testCase.input}`);
        console.error(`Expected: ${JSON.stringify(testCase.expected)}`);
        console.error(`Got: ${JSON.stringify(result)}`);
        failed++;
    }
}

if (failed === 0) {
    console.log('All test cases passed!');
} else {
    console.error(`${failed} test cases failed.`);
}
