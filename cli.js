#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import readline from 'readline';

const program = new Command();

program
    .name('local-ai-coder')
    .description('CLI for your local AI coding assistant powered by Ollama with tool use and interactive sessions')
    .version('1.0.0');

// --- Tool Definitions ---

async function readFileTool(filePath) {
    if (!filePath) {
        return { success: false, error: 'Error: a file path must be provided.' };
    }
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, output: content };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { success: false, error: `Error reading file: ${filePath} not found.` };
        } else {
            return { success: false, error: `Error reading file ${filePath}: ${error.message}` };
        }
    }
}

async function writeFileTool(filePath, content, rl) {
    if (!filePath || !content) {
        return { success: false, error: 'Error: a file path and content must be provided.' };
    }
    try {
        await new Promise((resolve, reject) => {
            rl.question(`Are you sure you want to write to ${filePath}? (y/n): `, (answer) => {
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    resolve();
                } else {
                    reject(new Error('Write operation cancelled by user.'));
                }
            });
        });

        await fs.writeFile(filePath, content, 'utf8');
        return { success: true, output: `File ${filePath} written successfully.` };
    } catch (error) {
        return { success: false, error: `Error writing file ${filePath}: ${error.message}` };
    }
}

async function listDirectoryTool(dirPath, filter = null) {
    if (!dirPath) {
        return { success: false, error: 'Error: a directory path must be provided.' };
    }
    try {
        let files = await fs.readdir(dirPath);
        if (filter) {
            const regex = new RegExp(filter);
            files = files.filter(file => regex.test(file));
        }
        return { success: true, output: files.join('\n') };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return { success: false, error: `Error listing directory: ${dirPath} not found.` };
        } else {
            return { success: false, error: `Error listing directory ${dirPath}: ${error.message}` };
        }
    }
}

async function runShellCommandTool(command, rl) {
    if (!command) {
        return { success: false, error: 'Error: a command must be provided.' };
    }
    return new Promise((resolve) => {
        rl.question(`Are you sure you want to run the command: "${command}"? (y/n): `, (answer) => {
            if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        resolve({ success: false, error: `Command failed: ${error.message}\nStderr: ${stderr}` });
                        return;
                    }
                    if (stderr) {
                        resolve({ success: true, output: `Stderr: ${stderr}\nStdout: ${stdout}` });
                        return;
                    }
                    resolve({ success: true, output: stdout });
                });
            } else {
                resolve({ success: false, error: 'Command execution cancelled by user.' });
            }
        });
    });
}

async function searchFileContentTool(filePath, pattern) {
    if (!filePath || !pattern) {
        return { success: false, error: 'Error: a file path and pattern must be provided.' };
    }
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const regex = new RegExp(pattern, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            const lineStart = content.lastIndexOf('\n', match.index) + 1;
            const lineEnd = content.indexOf('\n', match.index);
            const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
            matches.push(`Line ${content.substring(0, match.index).split('\n').length}: ${line.trim()}`);
        }
        if (matches.length === 0) {
            return { success: true, output: `No matches found for pattern '${pattern}' in ${filePath}.` };
        }
        return { success: true, output: `Matches in ${filePath}:\n${matches.join('\n')}` };
    } catch (error) {
        return { success: false, error: `Error searching file ${filePath}: ${error.message}` };
    }
}

async function createDirectoryTool(dirPath) {
    if (!dirPath) {
        return { success: false, error: 'Error: a directory path must be provided.' };
    }
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true, output: `Directory ${dirPath} created successfully.` };
    } catch (error) {
        return { success: false, error: `Error creating directory ${dirPath}: ${error.message}` };
    }
}

async function replaceInFileTool(filePath, oldString, newString, rl) {
    if (!filePath || !oldString || !newString) {
        return { success: false, error: 'Error: a file path, old string, and new string must be provided.' };
    }
    try {
        await new Promise((resolve, reject) => {
            rl.question(`Are you sure you want to replace in ${filePath}? (y/n): `, (answer) => {
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    resolve();
                } else {
                    reject(new Error('Replace operation cancelled by user.'));
                }
            });
        });

        let content = await fs.readFile(filePath, 'utf8');
        const originalContent = content;
        content = content.replace(new RegExp(oldString, 'g'), newString);
        if (content === originalContent) {
            return { success: true, output: `No occurrences of '${oldString}' found in ${filePath}.` };
        }
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true, output: `Replaced all occurrences of '${oldString}' with '${newString}' in ${filePath}.` };
    } catch (error) {
        return { success: false, error: `Error replacing in file ${filePath}: ${error.message}` };
    }
}

async function getProjectContextTool() {
    let context = {};
    const projectRoot = process.cwd(); // Get the current working directory

    try {
        const packageJsonPath = `${projectRoot}/package.json`;
        const readmePath = `${projectRoot}/README.md`;

        // Read package.json
        try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
            context['package.json'] = JSON.parse(packageJsonContent);
        } catch (error) {
            context['package.json'] = `Error reading package.json: ${error.message}`;
        }

        // Read README.md
        try {
            const readmeContent = await fs.readFile(readmePath, 'utf8');
            context['README.md'] = readmeContent;
        } catch (error) {
            context['README.md'] = `Error reading README.md: ${error.message}`;
        }

        // List top-level directory contents
        try {
            const files = await fs.readdir(projectRoot, { withFileTypes: true });
            const dirContents = files.map(dirent =>
                dirent.isDirectory() ? `${dirent.name}/` : dirent.name
            ).join('\n');
            context['root_directory_contents'] = dirContents;
        } catch (error) {
            context['root_directory_contents'] = `Error listing root directory: ${error.message}`;
        }

        return { success: true, output: JSON.stringify(context, null, 2) };
    } catch (error) {
        return { success: false, error: `Error getting project context: ${error.message}` };
    }
}

// --- AI Interaction Loop with Tool Use ---

const systemMessage = 'You are a helpful AI coding assistant.\n\n**Functionality:**\n- You can use tools to read, write, and list files, run shell commands, and more.\n- For complex tasks, you must create a structured plan to break down the problem.\n\n**Instructions:**\n1.  **Analyze the Request:** Understand the user\'s goal.\n2.  **Create a Plan:** If the task requires multiple steps or tools, respond with a JSON object inside a <plan> block.\n    *   The plan should be a list of steps, each with a description, a tool to use, and arguments.\n    *   If a step doesn\'t require a tool, set "tool": null.\n    *   Use "output_variable": "variable_name" to store the output of a tool for later use.\n    *   Use "iterate_on": "variable_name" to indicate that the step should be executed for each item in the specified variable (which should be an array). When iterating, use `"${item}"` in the arguments to refer to the current item.\n3.  **Execute the Plan:** I will execute the plan step by step and provide the output for each tool.\n4.  **Respond:** Once the plan is complete or if no plan is needed, provide a final answer.\n\n**Tool Definitions:**\n<tool_code>\n// Read a file\nfunction read_file(filePath: string): string;\n\n// Write content to a file\nfunction write_file(filePath: string, content: string): string;\n\n// List contents of a directory\nfunction list_directory(dirPath: string, filter?: string): string;\n\n// Run a shell command\nfunction run_shell_command(command: string): string;\n\n// Search for a pattern within a file\'s content\nfunction search_file_content(filePath: string, pattern: string): string;\n\n// Create a new directory (recursive)\nfunction create_directory(dirPath: string): string;\n\n// Replace all occurrences of a string in a file\nfunction replace_in_file(filePath: string, oldString: string, newString: string): string;\n\n// Get comprehensive project context (package.json, README.md, root directory contents)\nfunction get_project_context(): string;\n</tool_code>\n\n**JSON Plan Format:**\n<plan>\n{\n  "plan": [\n    {\n      "step": 1,\n      "description": "List all JavaScript files in the current directory",\n      "tool": "list_directory",\n      "args": ["./", ".*\\.js$"], // dirPath, filter (regex for .js files)\n      "output_variable": "js_files"\n    },\n    {\n      "step": 2,\n      "description": "Read each JavaScript file\'s contents",\n      "tool": "read_file",\n      "iterate_on": "js_files",\n      "args": ["${item}"],\n      "output_variable": "file_content"\n    },\n    {\n      "step": 3,\n      "description": "Combine all file contents into a single output",\n      "tool": null,\n      "args": [],\n      "input_variable": "file_content"\n    }\n  ]\n}\n</plan>\n\n5.  **Handle Errors & Self-Correction:** If a tool execution fails, I will provide the error output. You should analyze the error and, if possible, generate a new plan or modify the current one to correct the issue and retry.\n\nBegin.'

const HISTORY_FILE = 'conversation_history.json';

async function loadHistory() {
    try {
        const data = await fs.readFile(HISTORY_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File not found, return default messages including system message
            return [{ role: 'system', content: systemMessage }];
        } else {
            console.error(`Error loading conversation history: ${error.message}`);
            return [{ role: 'system', content: systemMessage }];
        }
    }
}

async function saveHistory(messages) {
    try {
        // Filter out the system message before saving, as it's always re-added on load
        const historyToSave = messages.filter(msg => msg.role !== 'system');
        await fs.writeFile(HISTORY_FILE, JSON.stringify(historyToSave, null, 2));
    } catch (error) {
        console.error(`Error saving conversation history: ${error.message}`);
    }
}

function parseToolCall(toolCall) {
    const match = toolCall.match(/(\w+)\((.*)\)/);
    if (!match) {
        return null;
    }

    const toolName = match[1];
    const argsString = match[2];

    const args = [];
    // Regex to match arguments: either a quoted string or a sequence of non-comma characters
    // This regex is still simplified and might not handle all edge cases like escaped quotes within strings
    const argRegex = /(?:'([^']*)'|"([^"]*)"|([^,]+))/g;
    let argMatch;

    while ((argMatch = argRegex.exec(argsString)) !== null) {
        // Prioritize quoted strings, then unquoted
        if (argMatch[1] !== undefined) { // Single quoted
            args.push(argMatch[1]);
        } else if (argMatch[2] !== undefined) { // Double quoted
            args.push(argMatch[2]);
        } else if (argMatch[3] !== undefined) { // Unquoted
            args.push(argMatch[3].trim());
        }
    }

    return { toolName, args };
}

function validatePlan(plan) {
    if (!plan || !plan.plan || !Array.isArray(plan.plan)) {
        console.error("Plan validation failed: Missing 'plan' array or invalid structure.");
        return false;
    }

    const validTools = [
        'read_file', 'write_file', 'list_directory', 'run_shell_command',
        'search_file_content', 'create_directory', 'replace_in_file',
        'get_project_context'
    ];

    for (let i = 0; i < plan.plan.length; i++) {
        const step = plan.plan[i];
        if (typeof step.step !== 'number' || typeof step.description !== 'string') {
            console.error(`Plan validation failed: Step ${i} missing 'step' number or 'description' string.`);
            return false;
        }

        if (step.tool !== null) { // If a tool is specified
            if (typeof step.tool !== 'string' || !validTools.includes(step.tool)) {
                console.error(`Plan validation failed: Step ${i} has invalid or unknown tool '${step.tool}'.`);
                return false;
            }
            if (!Array.isArray(step.args)) {
                console.error(`Plan validation failed: Step ${i} tool '${step.tool}' missing 'args' array.`);
                return false;
            }
        }

        if (step.output_variable && typeof step.output_variable !== 'string') {
            console.error(`Plan validation failed: Step ${i} has invalid 'output_variable'.`);
            return false;
        }

        if (step.iterate_on && typeof step.iterate_on !== 'string') {
            console.error(`Plan validation failed: Step ${i} has invalid 'iterate_on'.`);
            return false;
        }
    }
    return true;
}

async function processMessage(userMessage, messages, rl) {
    if (userMessage) {
        messages.push({ role: 'user', content: userMessage });
    }

    let finalAnswer = false;
    let interactionLog = { user_prompt: userMessage, ai_responses: [], tool_executions: [] };
    let context = {}; // New context object to store results

    while (!finalAnswer) {
        try {
            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'codellama',
                    messages: messages,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponseContent = data.message.content;

            const planMatch = aiResponseContent.match(/<plan>([\s\S]*?)<\/plan>/);
            const cleanedAiResponseContent = aiResponseContent.replace(/<plan>[\s\S]*?<\/plan>/g, '').trim();

            console.log(`AI: ${cleanedAiResponseContent}`);
            messages.push({ role: 'assistant', content: aiResponseContent });
            interactionLog.ai_responses.push(aiResponseContent);

            if (planMatch) {
                const planJson = planMatch[1].trim();
                try {
                    const plan = JSON.parse(planJson);
                    if (validatePlan(plan)) { // Add validation here
                        console.log(`
--- AI's Plan ---
${JSON.stringify(plan, null, 2)}
-------------------`);
                        for (let i = 0; i < plan.plan.length; i++) {
                            const step = plan.plan[i];
                            console.log(`
--- Executing Step ${step.step}: ${step.description} ---`);

                            let itemsToIterate = [];
                            if (step.iterate_on) {
                                const iterable = context[step.iterate_on];
                                if (Array.isArray(iterable)) {
                                    itemsToIterate = iterable;
                                } else if (typeof iterable === 'string') {
                                    itemsToIterate = iterable.split('\n').filter(f => f.length > 0);
                                }
                            } else {
                                itemsToIterate = [null]; // Execute once if not iterating
                            }

                            let stepOutput = [];
                            for (const item of itemsToIterate) {
                                if (step.tool) {
                                    const { tool, args } = step;
                                    let resolvedArgs = args.map(arg => {
                                        // Resolve placeholders like ${variable_name} or ${item}
                                        if (typeof arg === 'string') {
                                            if (arg === '${item}') {
                                                return item;
                                            }
                                            const varMatch = arg.match(/^\$\{(.*)\}$/);
                                            if (varMatch) {
                                                const varName = varMatch[1];
                                                return context[varName] || arg;
                                            }
                                        }
                                        return arg;
                                    });

                                    let result;
                                    if (tool === 'list_directory' && resolvedArgs.length > 1) { // If filter is provided
                                        result = await listDirectoryTool(resolvedArgs[0], resolvedArgs[1]);
                                    } else {
                                        switch (tool) {
                                            case 'read_file':
                                                result = await readFileTool(resolvedArgs[0]);
                                                break;
                                            case 'write_file':
                                                result = await writeFileTool(resolvedArgs[0], resolvedArgs[1], rl);
                                                break;
                                            case 'list_directory':
                                                result = await listDirectoryTool(resolvedArgs[0]);
                                                break;
                                            case 'run_shell_command':
                                                result = await runShellCommandTool(resolvedArgs[0], rl);
                                                break;
                                            case 'search_file_content':
                                                result = await searchFileContentTool(resolvedArgs[0], resolvedArgs[1]);
                                                break;
                                            case 'create_directory':
                                                result = await createDirectoryTool(resolvedArgs[0]);
                                                break;
                                            case 'replace_in_file':
                                                result = await replaceInFileTool(resolvedArgs[0], resolvedArgs[1], resolvedArgs[2], rl);
                                                break;
                                            case 'get_project_context':
                                                result = await getProjectContextTool();
                                                break;
                                            default:
                                                result = { success: false, error: `Unknown tool: ${tool}` };
                                        }
                                    }

                                    const outputMessage = result.success ? `<tool_output>${result.output}</tool_output>` : `<tool_output_error>${result.error}</tool_output_error>`;
                                    console.log(`--- Tool Output --- ${result.output || result.error}-------------------`);
                                    messages.push({ role: 'tool', content: outputMessage });
                                    interactionLog.tool_executions.push({ tool_call: `${tool}(${resolvedArgs.join(', ')})`, tool_output: outputMessage });

                                    if (result.success) {
                                        stepOutput.push(result.output);
                                    }
                                } else {
                                    // If no tool, but input_variable is present, use it as output
                                    if (step.input_variable && context[step.input_variable]) {
                                        stepOutput.push(context[step.input_variable]);
                                    }
                                }
                            }

                            if (step.output_variable && stepOutput.length > 0) {
                                context[step.output_variable] = stepOutput.length === 1 ? stepOutput[0] : stepOutput;
                            }
                        }
                    } else {
                        console.error("Invalid plan received from AI. Skipping plan execution.");
                        // Optionally, send a message back to the AI about the invalid plan
                        messages.push({ role: 'tool', content: '<tool_output_error>Invalid plan received. Please provide a valid JSON plan.</tool_output_error>' });
                    }
                } catch (error) {
                    console.error(`Error parsing or executing plan: ${error.message}`);
                }
            } else {
                const toolCodeMatches = aiResponseContent.matchAll(/<tool_code>([\s\S]*?)<\/tool_code>/g);
                let toolCalls = Array.from(toolCodeMatches).map(match => match[1].trim());

                if (toolCalls.length > 0) {
                    for (const toolCallWithComments of toolCalls) {
                        const toolCall = toolCallWithComments.replace(/\/\/.*\n/g, '').trim();
                        const parsedTool = parseToolCall(toolCall);

                        if (parsedTool) {
                            const { toolName, args } = parsedTool;
                            console.log(`\n--- Executing Tool: ${toolName} with args: ${args.join(', ')} ---`);
                            let result;

                            switch (toolName) {
                                case 'read_file':
                                    result = await readFileTool(args[0]);
                                    break;
                                case 'write_file':
                                    result = await writeFileTool(args[0], args[1], rl);
                                    break;
                                case 'list_directory':
                                    result = await listDirectoryTool(args[0]);
                                    break;
                                case 'run_shell_command':
                                    result = await runShellCommandTool(args[0], rl);
                                    break;
                                case 'search_file_content':
                                    result = await searchFileContentTool(args[0], args[1]);
                                    break;
                                case 'create_directory':
                                    result = await createDirectoryTool(args[0]);
                                    break;
                                case 'replace_in_file':
                                    result = await replaceInFileTool(args[0], args[1], args[2], rl);
                                    break;
                                case 'get_project_context':
                                    result = await getProjectContextTool();
                                    break;
                                default:
                                    result = { success: false, error: `Unknown tool: ${toolName}` };
                            }

                            const outputMessage = result.success ? `<tool_output>${result.output}<\/tool_output>` : `<tool_output_error>${result.error}<\/tool_output_error>`;
                            console.log(`--- Tool Output ---\n${result.output || result.error}\n-------------------`);
                            messages.push({ role: 'tool', content: outputMessage });
                            interactionLog.tool_executions.push({ tool_call: toolCall, tool_output: outputMessage });
                        } else {
                            const outputMessage = `<tool_output_error>Unknown tool call: ${toolCall}<\/tool_output_error>`;
                            console.log(`--- Tool Output ---\nUnknown tool call: ${toolCall}\n-------------------`);
                            messages.push({ role: 'tool', content: outputMessage });
                            interactionLog.tool_executions.push({ tool_call: toolCall, tool_output: outputMessage });
                        }
                    }
                } else {
                    finalAnswer = true; // No tool calls, so AI is done or asking for clarification
                }
            }
        } catch (error) {
            console.error(`\nError in AI interaction loop: ${error.message}`);
            console.error('Please ensure Ollama is running and the \'codellama\' model is available.');
            finalAnswer = true; // Exit loop on error
        }
    }
    return interactionLog;
}

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponseContent = data.message.content;

            const planMatch = aiResponseContent.match(/<plan>([\s\S]*?)<\/plan>/);
            const cleanedAiResponseContent = aiResponseContent.replace(/<plan>[\s\S]*?<\/plan>/g, '').trim();

            console.log(`AI: ${cleanedAiResponseContent}`);
            messages.push({ role: 'assistant', content: aiResponseContent });
            interactionLog.ai_responses.push(aiResponseContent);

            if (planMatch) {
                const planJson = planMatch[1].trim();
                try {
                    const plan = JSON.parse(planJson);
                    if (plan && plan.plan && Array.isArray(plan.plan)) {
                        console.log(`\n--- AI's Plan ---\n${JSON.stringify(plan, null, 2)}\n-------------------`);
                        for (let i = 0; i < plan.plan.length; i++) {
                            const step = plan.plan[i];
                            console.log(`\n--- Executing Step ${step.step}: ${step.description} ---`);

                            let itemsToIterate = [];
                            if (step.iterate_on) {
                                const iterable = context[step.iterate_on];
                                if (Array.isArray(iterable)) {
                                    itemsToIterate = iterable;
                                } else if (typeof iterable === 'string') {
                                    itemsToIterate = iterable.split('\n').filter(f => f.length > 0);
                                }
                            } else {
                                itemsToIterate = [null]; // Execute once if not iterating
                            }

                            let stepOutput = [];
                            for (const item of itemsToIterate) {
                                if (step.tool) {
                                    const { tool, args } = step;
                                    let resolvedArgs = args.map(arg => {
                                        // Resolve placeholders like ${variable_name} or ${item}
                                        if (typeof arg === 'string') {
                                            if (arg === '${item}') {
                                                return item;
                                            }
                                            const varMatch = arg.match(/^\$\{(.*)\}$/);
                                            if (varMatch) {
                                                const varName = varMatch[1];
                                                return context[varName] || arg;
                                            }
                                        }
                                        return arg;
                                    });

                                    let result;
                                    if (tool === 'list_directory' && resolvedArgs.length > 1) { // If filter is provided
                                        result = await listDirectoryTool(resolvedArgs[0], resolvedArgs[1]);
                                    } else {
                                        switch (tool) {
                                            case 'read_file':
                                                result = await readFileTool(resolvedArgs[0]);
                                                break;
                                            case 'write_file':
                                                result = await writeFileTool(resolvedArgs[0], resolvedArgs[1], rl);
                                                break;
                                            case 'list_directory':
                                                result = await listDirectoryTool(resolvedArgs[0]);
                                                break;
                                            case 'run_shell_command':
                                                result = await runShellCommandTool(resolvedArgs[0], rl);
                                                break;
                                            case 'search_file_content':
                                                result = await searchFileContentTool(resolvedArgs[0], resolvedArgs[1]);
                                                break;
                                            case 'create_directory':
                                                result = await createDirectoryTool(resolvedArgs[0]);
                                                break;
                                            case 'replace_in_file':
                                            result = await replaceInFileTool(resolvedArgs[0], resolvedArgs[1], resolvedArgs[2], rl);
                                            break;
                                        case 'get_project_context':
                                            result = await getProjectContextTool();
                                            break;
                                        default:
                                                result = { success: false, error: `Unknown tool: ${tool}` };
                                        }
                                    }

                                    const outputMessage = result.success ? `<tool_output>${result.output}<\/tool_output>` : `<tool_output_error>${result.error}<\/tool_output_error>`;
                                    console.log(`--- Tool Output ---\n${result.output || result.error}\n-------------------`);
                                    messages.push({ role: 'tool', content: outputMessage });
                                    interactionLog.tool_executions.push({ tool_call: `${tool}(${resolvedArgs.join(', ')})`, tool_output: outputMessage });

                                    if (result.success) {
                                        stepOutput.push(result.output);
                                    }
                                } else {
                                    // If no tool, but input_variable is present, use it as output
                                    if (step.input_variable && context[step.input_variable]) {
                                        stepOutput.push(context[step.input_variable]);
                                    }
                                }
                            }

                            if (step.output_variable && stepOutput.length > 0) {
                                context[step.output_variable] = stepOutput.length === 1 ? stepOutput[0] : stepOutput;
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error parsing or executing plan: ${error.message}`);
                }
            } else {
                const toolCodeMatches = aiResponseContent.matchAll(/<tool_code>([\s\S]*?)<\/tool_code>/g);
                let toolCalls = Array.from(toolCodeMatches).map(match => match[1].trim());

                if (toolCalls.length > 0) {
                    for (const toolCallWithComments of toolCalls) {
                        const toolCall = toolCallWithComments.replace(/\/\/.*\n/g, '').trim();
                        const parsedTool = parseToolCall(toolCall);

                        if (parsedTool) {
                            const { toolName, args } = parsedTool;
                            console.log(`\n--- Executing Tool: ${toolName} with args: ${args.join(', ')} ---`);
                            let result;

                            switch (toolName) {
                                case 'read_file':
                                    result = await readFileTool(args[0]);
                                    break;
                                case 'write_file':
                                    result = await writeFileTool(args[0], args[1], rl);
                                    break;
                                case 'list_directory':
                                    result = await listDirectoryTool(args[0]);
                                    break;
                                case 'run_shell_command':
                                    result = await runShellCommandTool(args[0], rl);
                                    break;
                                case 'search_file_content':
                                    result = await searchFileContentTool(args[0], args[1]);
                                    break;
                                case 'create_directory':
                                    result = await createDirectoryTool(args[0]);
                                    break;
                                case 'replace_in_file':
                                    result = await replaceInFileTool(args[0], args[1], args[2], rl);
                                    break;
                                case 'get_project_context':
                                    result = await getProjectContextTool();
                                    break;
                                default:
                                    result = { success: false, error: `Unknown tool: ${toolName}` };
                            }

                            const outputMessage = result.success ? `<tool_output>${result.output}<\/tool_output>` : `<tool_output_error>${result.error}<\/tool_output_error>`;
                            console.log(`--- Tool Output ---\n${result.output || result.error}\n-------------------`);
                            messages.push({ role: 'tool', content: outputMessage });
                            interactionLog.tool_executions.push({ tool_call: toolCall, tool_output: outputMessage });
                        } else {
                            const outputMessage = `<tool_output_error>Unknown tool call: ${toolCall}<\/tool_output_error>`;
                            console.log(`--- Tool Output ---\nUnknown tool call: ${toolCall}\n-------------------`);
                            messages.push({ role: 'tool', content: outputMessage });
                            interactionLog.tool_executions.push({ tool_call: toolCall, tool_output: outputMessage });
                        }
                    }
                } else {
                    finalAnswer = true; // No tool calls, so AI is done or asking for clarification
                }
            }
        } catch (error) {
            console.error(`\nError in AI interaction loop: ${error.message}`);
            console.error('Please ensure Ollama is running and the \'codellama\' model is available.');
            finalAnswer = true; // Exit loop on error
        }
    }
    return interactionLog;
}

async function chatWithAI(initialPrompt = null) {
    let messages = await loadHistory(); // Load history at the start

    // --- Project Context Awareness: Automatically inject project overview ---
    const projectRoot = process.cwd();
    let projectOverview = "Project Overview:\n";

    try {
        const files = await fs.readdir(projectRoot, { withFileTypes: true });
        const topLevelContents = files.map(dirent =>
            dirent.isDirectory() ? `${dirent.name}/` : dirent.name
        ).join('\n');
        projectOverview += `Top-level files and directories:\n${topLevelContents}\n\n`;
    } catch (error) {
        projectOverview += `Error listing root directory: ${error.message}\n\n`;
    }

    try {
        const packageJsonPath = `${projectRoot}/package.json`;
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        projectOverview += `package.json (name: ${packageJson.name || 'N/A'}, version: ${packageJson.version || 'N/A'}, description: ${packageJson.description || 'N/A'})\n\n`;
    } catch (error) {
        projectOverview += `package.json not found or error reading: ${error.message}\n\n`;
    }

    try {
        const readmePath = `${projectRoot}/README.md`;
        const readmeContent = await fs.readFile(readmePath, 'utf8');
        projectOverview += `README.md found (first 100 chars): ${readmeContent.substring(0, 100)}...\n\n`;
    } catch (error) {
        projectOverview += `README.md not found or error reading: ${error.message}\n\n`;
    }

    // Inject project overview as a system message or a special user message
    // Using a system message to provide context to the AI without it being part of the user's direct input
    messages.unshift({ role: 'system', content: projectOverview });
    // --- End Project Context Awareness ---

    // Ensure system message is always the first message (after our injected project overview)
    if (messages.length === 0 || messages[0].role !== 'system' || messages[0].content !== systemMessage) {
        messages.unshift({ role: 'system', content: systemMessage });
    }

    const logFilePath = './agent_interactions.jsonl';

    const logInteraction = async (interaction) => {
        try {
            await fs.appendFile(logFilePath, JSON.stringify(interaction) + '\n');
        } catch (error) {
            console.error(`Error logging interaction: ${error.message}`);
        }
    };

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'You: '
    });

    process.stdin.resume();

    if (initialPrompt) {
        console.log(`\n--- Local AI Coder (Agent Mode) ---\nUser: ${initialPrompt}\n`);
        const interactionLog = await processMessage(initialPrompt, messages, rl);
        await logInteraction(interactionLog);
        await saveHistory(messages);
        rl.close();
        process.exit(0);
    } else {
        console.log(`\n--- Local AI Coder (Interactive Session) ---\nType 'exit' or 'quit' to end the session.\n`);
    }

    rl.on('line', async (line) => {
        const userMessage = line.trim();
        if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
            rl.close();
            return;
        }

        const interactionLog = await processMessage(userMessage, messages, rl);
        await logInteraction(interactionLog);
    });

    rl.on('close', async () => {
        await saveHistory(messages); // Save history on close
        console.log('\n--- Agent Session Ended ---');
    });

    rl.prompt();
}

program
    .arguments('[prompt...]')
    .action(async (promptArgs) => {
        const initialPrompt = promptArgs && promptArgs.length > 0 ? promptArgs.join(' ') : null;
        chatWithAI(initialPrompt);
    });

program.parse(process.argv);