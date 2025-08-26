#!/usr/bin/env node

import { Command } from 'commander';
import readline from 'readline';
import chalk from 'chalk';
import cliSpinners from 'cli-spinners';
import ContextManager from './contextManager.js';

// Custom spinner implementation using cli-spinners
class CustomSpinner {
    constructor(text = 'Loading...') {
        this.text = text;
        this.spinner = cliSpinners.dots;
        this.interval = null;
        this.isSpinning = false;
    }

    start() {
        if (this.isSpinning) return this;
        
        this.isSpinning = true;
        let frameIndex = 0;
        
        this.interval = setInterval(() => {
            const frame = this.spinner.frames[frameIndex];
            process.stdout.write(`\r${frame} ${this.text}`);
            frameIndex = (frameIndex + 1) % this.spinner.frames.length;
        }, this.spinner.interval);
        
        return this;
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isSpinning = false;
        process.stdout.write('\r' + ' '.repeat(process.stdout.columns) + '\r');
        return this;
    }

    succeed(text) {
        this.stop();
        console.log(`\r✓ ${text || this.text}`);
        return this;
    }

    fail(text) {
        this.stop();
        console.log(`\r✗ ${text || this.text}`);
        return this;
    }

    warn(text) {
        this.stop();
        console.log(`\r⚠ ${text || this.text}`);
        return this;
    }

    info(text) {
        this.stop();
        console.log(`\rℹ ${text || this.text}`);
        return this;
    }
}
import ollama from 'ollama';
import { promises as fs } from 'fs';
import { resolveArguments } from './argumentParser.js';
import {
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    runShellCommandTool,
    searchFileContentTool,
    createDirectoryTool,
    replaceInFileTool,
    searchAndReplaceInFileTool,
    getFileMetadataTool,
    gitDiffTool,
    gitBlameTool,
    getProjectContextTool,
    getAvailableTools,
    getContextTool,
    updateContextTool,
    summarizeFileTool,
    testArgsTool,
} from './tools.js';

const systemMessage = `You are a helpful AI assistant.`;;

async function processMessage(userMessage, messages, rl, contextManager, planState) {
    const interactionLog = {
        user_message: userMessage,
        ai_responses: [],
        tool_executions: [],
    };

    messages.push({ role: 'user', content: userMessage });

    let currentMessages = [...messages];

    if (planState.isPlanExecuting) {
        currentMessages.push({
            role: 'system',
            content: 'A plan is currently executing. Do not generate a new plan. Respond to the current plan\'s state or error.',
        });
    }

    const spinner = new CustomSpinner('Thinking...').start();
    try {
        const response = await ollama.chat({
            model: 'codellama',
            messages: currentMessages,
            // stream: true, // Commented out for debugging
        });

        let aiResponseContent = response.message.content;
        spinner.stop(); // Ensure spinner stops after receiving response
        process.stdout.write(aiResponseContent); // Output the AI response
        process.stdout.write('\n');

        interactionLog.ai_responses.push(aiResponseContent);
        messages.push({ role: 'assistant', content: aiResponseContent });

        const planMatch = aiResponseContent.match(/<plan>([\s\S]*?)<\/plan>/);
        const toolCallMatch = aiResponseContent.match(/<tool_code>([\s\S]*?)<\/tool_code>/);
        const recoveryMatch = aiResponseContent.match(/<recovery>([\s\S]*?)<\/recovery>/);

        if (planMatch) {
            try {
                const planJson = JSON.parse(planMatch[1].trim());
                if (validatePlan(planJson)) {
                    planState.currentPlan = planJson;
                    planState.currentStepIndex = 0;
                    planState.isPlanExecuting = true;
                    console.log('\n--- Plan Received and Validated ---');
                    await executePlanSteps(planState, contextManager.getContext(), messages, rl, contextManager, interactionLog);
                } else {
                    console.error('\n--- Invalid Plan Received ---');
                    messages.push({ role: 'system', content: 'The plan provided was invalid. Please provide a valid plan.' });
                }
            } catch (e) {
                console.error('Error parsing plan JSON:', e);
                messages.push({ role: 'system', content: 'Error parsing plan: ' + e.message + '. Please provide a valid JSON plan.' });
            }
        } else if (toolCallMatch) {
            const toolCallCode = toolCallMatch[1].trim();
            const parsedTool = parseToolCall(toolCallCode);

            if (parsedTool) {
                console.log("\n--- Executing Tool: " + parsedTool.toolName + "(" + parsedTool.args.join(', ') + ") ---");
                let result;
                const spinner = new CustomSpinner(`Executing ${parsedTool.toolName}...`).start();
                try {
                    switch (parsedTool.toolName) {
                        case 'read_file':
                            result = await readFileTool(parsedTool.args[0]);
                            break;
                        case 'write_file':
                            result = await writeFileTool(parsedTool.args[0], parsedTool.args[1], rl);
                            break;
                        case 'list_directory':
                            result = await listDirectoryTool(parsedTool.args[0], parsedTool.args[1]);
                            break;
                        case 'run_shell_command':
                            result = await runShellCommandTool(parsedTool.args[0], rl);
                            break;
                        case 'search_file_content':
                            result = await searchFileContentTool(parsedTool.args[0], parsedTool.args[1]);
                            break;
                        case 'create_directory':
                            result = await createDirectoryTool(parsedTool.args[0]);
                            break;
                        case 'replace_in_file':
                            result = await replaceInFileTool(parsedTool.args[0], parsedTool.args[1], parsedTool.args[2], parsedTool.args[3], rl);
                            break;
                        case 'search_and_replace_in_file':
                            result = await searchAndReplaceInFileTool(parsedTool.args[0], parsedTool.args[1], parsedTool.args[2], rl);
                            break;
                        case 'get_file_metadata':
                            result = await getFileMetadataTool(parsedTool.args[0]);
                            break;
                        case 'git_diff':
                            result = await gitDiffTool(parsedTool.args[0]);
                            break;
                        case 'git_blame':
                            result = await gitBlameTool(parsedTool.args[0]);
                            break;
                        case 'get_project_context':
                            result = await getProjectContextTool();
                            break;
                        case 'get_available_tools':
                            result = await getAvailableTools();
                            break;
                        case 'get_context':
                            result = await getContextTool(contextManager);
                            break;
                        case 'update_context':
                            result = await updateContextTool(contextManager, parsedTool.args[0], parsedTool.args[1]);
                            break;
                        case 'summarize_file':
                            result = await summarizeFileTool(contextManager, parsedTool.args[0]);
                            break;
                        case 'test_args':
                            result = await testArgsTool(...parsedTool.args);
                            break;
                        default:
                            result = { success: false, error: "Unknown tool: " + parsedTool.toolName };
                    }
                    spinner.stop();

                    if (result.success) {
                        const outputMessage = "<tool_output>" + result.output + "<\/tool_output>";
                        if (parsedTool.toolName === 'get_file_metadata') {
                            console.log(chalk.green('--- Tool Output ---'));
                            console.table(result.output);
                            console.log(chalk.green('-------------------'));
                        } else {
                            console.log(chalk.green('--- Tool Output ---\n') + chalk.blue(result.output) + chalk.green('\n-------------------'));
                        }
                        messages.push({ role: 'tool', content: outputMessage });
                        interactionLog.tool_executions.push({
                            tool_call: toolCallCode,
                            tool_output: outputMessage,
                        });
                    } else {
                        console.error(chalk.red("--- Tool Error ---\n" + result.error + "\n-------------------"));
                        messages.push({ role: 'tool', content: "<tool_error>" + result.error + "<\/tool_error>" });
                        interactionLog.tool_executions.push({
                            tool_call: toolCallCode,
                            tool_output: "<tool_error>" + result.error + "<\/tool_error>",
                        });
                    }
                } catch (toolError) {
                    console.error("--- Tool Execution Exception ---\n" + toolError.message + "\n-------------------");
                    messages.push({ role: 'tool', content: "<tool_error>Exception during tool execution: " + toolError.message + "<\/tool_error>" });
                    interactionLog.tool_executions.push({
                        tool_call: toolCallCode,
                        tool_output: "<tool_error>Exception during tool execution: " + toolError.message + "<\/tool_error>",
                    });
                }
            } else {
                console.error('\n--- Invalid Tool Call Format ---');
                messages.push({ role: 'system', content: 'Invalid tool call format. Please use function(arg1, arg2) format.' });
            }
        } else if (recoveryMatch) {
            try {
                const recoveryJson = JSON.parse(recoveryMatch[1].trim());
                console.log("--- Recovery Strategy Received ---");
                console.log(recoveryJson);
                // This part is handled in the executePlanSteps catch block
            } catch (e) {
                console.error("Error parsing recovery JSON:", e);
            }
        }
    } catch (error) {
        console.error("Error in processMessage: ", error);
        await handleError(error, messages, rl, contextManager, planState);
    }
    return interactionLog;
}

const program = new Command();

program
	.name('local-ai-coder')
	.description(
		'CLI for your local AI coding assistant powered by Ollama with tool use and interactive sessions'
	)
	.version('1.0.0');

const HISTORY_FILE = 'conversation_history.json';

async function loadHistory() {
	try {
		const data = await fs.readFile(HISTORY_FILE, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return [{ role: 'system', content: systemMessage }];
		} else {
			console.error("Error loading conversation history: " + error.message);
			return [{ role: 'system', content: systemMessage }];
		}
	}
}

async function saveHistory(messages) {
	try {
		const historyToSave = messages.filter((msg) => msg.role !== 'system');
		await fs.writeFile(HISTORY_FILE, JSON.stringify(historyToSave, null, 2));
	} catch (error) {
		console.error("Error saving conversation history: " + error.message);
	}
}

export function parseToolCall(toolCall) {
    const match = toolCall.match(/^(\w+)\((\S*)\)$/);
    if (!match) {
        return null;
    }

    const toolName = match[1];
    const argsString = match[2];
    const args = [];
    let currentArg = '';
    let inString = false;
    let quoteChar = '';
    let parenLevel = 0;

    for (let i = 0; i < argsString.length; i++) {
        const char = argsString[i];

        if (inString) {
            if (char === '\\') { // Handle escaped characters
                if (i + 1 < argsString.length && (argsString[i+1] === '\'' || argsString[i+1] === '"')) {
                    currentArg += argsString[i+1]; // Add the escaped quote
                    i++; // Skip the next character (the escaped quote)
                } else {
                    currentArg += char; // Not an escaped quote, just add the backslash
                }
            } else if (char === quoteChar) {
                inString = false;
                currentArg += char; // Add the closing quote
            } else {
                currentArg += char;
            }
        } else {
            switch (char) {
                case '\'':
                case '"':
                    inString = true;
                    quoteChar = char;
                    currentArg += char;
                    break;
                case '(':{
                    parenLevel++;
                    currentArg += char;
                    break;
                }
                case ')':{
                    parenLevel--;
                    currentArg += char;
                    break;
                }
                case ',':
                    if (parenLevel === 0) {
                        args.push(currentArg.trim());
                        currentArg = '';
                    } else {
                        currentArg += char;
                    }
                    break;
                default:
                    currentArg += char;
            }
        }
    }

    if (currentArg.trim() !== '') {
        args.push(currentArg.trim());
    }

    return { toolName, args };
}

function validatePlan(plan) {
	if (!plan || !plan.plan || !Array.isArray(plan.plan)) {
		console.error(
			"Plan validation failed: Missing 'plan' array or invalid structure."
		);
		return false;
	}

	const validTools = [
		'read_file',
		'write_file',
		'list_directory',
		'run_shell_command',
		'search_file_content',
		'create_directory',
		'replace_in_file',
		'search_and_replace_in_file',
		'getFileMetadata',
		'git_diff',
		'git_blame',
		'get_project_context',
		'get_context',
		'update_context',
		'summarize_file',
		'test_args',
	];

	for (let i = 0; i < plan.plan.length; i++) {
		const step = plan.plan[i];
		if (typeof step.step !== 'number' || typeof step.description !== 'string') {
			console.error(
				"Plan validation failed: Step " + i + " missing 'step' number or 'description' string."
			);
			return false;
		}

		if (step.tool !== null && step.tool !== undefined) {
			if (typeof step.tool !== 'string' || !validTools.includes(step.tool)) {
				console.error(
					"Plan validation failed: Step " + i + " has invalid or unknown tool '" + step.tool + "'."
				);
				return false;
			}
			if (!Array.isArray(step.args)) {
				console.error(
					"Plan validation failed: Step " + i + " tool '" + step.tool + "' missing 'args' array."
				);
				return false;
			}
		} else if (step.plan !== null && step.plan !== undefined) {
			if (!Array.isArray(step.plan)) {
				console.error(
					"Plan validation failed: Step " + i + " has a 'plan' property that is not an array."
				);
				return false;
			}
			if (!validatePlan({ plan: step.plan })) {
                console.error("Plan validation failed: Nested plan in step " + i + " is invalid.");
				return false;
			}
		} else {
			console.error(
				"Plan validation failed: Step " + i + " must have either a 'tool' or a 'plan' property."
			);
			return false;
		}

		if (step.output_variable && typeof step.output_variable !== 'string') {
			console.error(
				"Plan validation failed: Step " + i + " has invalid 'output_variable'."
			);
			return false;
		}

		if (step.iterate_on && typeof step.iterate_on !== 'string') {
			console.error(
				"Plan validation failed: Step " + i + " has invalid 'iterate_on'."
			);
			return false;
		}
	}
	return true;
}

async function handleToolError(failedStep, error, context, messages, rl, contextManager, planState) {
    console.error("\n--- Tool Error: Step " + failedStep.step + " failed ---");
    console.error("Error: " + error);

    const newPrompt = "The following step in the plan failed:\n" +
                     "- Step: " + failedStep.step + "\n" +
                     "- Description: " + failedStep.description + "\n" +
                     "- Tool: " + failedStep.tool + "\n" +
                     "- Arguments: " + JSON.stringify(failedStep.args) + "\n\n" +
                     "The error was:\n" + error + "\n\n" +
                     "The current context is:\n" + JSON.stringify(context, null, 2) + "\n\n" +
                     "The current plan was:\n" + JSON.stringify(planState.currentPlan, null, 2) + "\n\n" +
                     "The current step index was: " + planState.currentStepIndex + "\n\n" +
                     "Please choose a strategy to recover from this error. Your response should be a JSON object inside a <recovery> block with one of the following structures:\n\n" +
                     "1.  **Retry the step (with optional modifications):**\n" +
                     "    { \"strategy\": \"retry\", \"args\": [...] }\n\n" +
                     "2.  **Provide an alternative step:**\n" +
                     "    { \"strategy\": \"alternative_step\", \"step\": { ... } }\n\n" +
                     "3.  **Provide a new plan:**\n" +
                     "    { \"strategy\": \"new_plan\", \"plan\": { ... } }\n\n" +
                     "4.  **Ask the user for help:**\n" +
                     "    { \"strategy\": \"ask_user\", \"question\": \"...\" }";

    const interactionLog = await processMessage(newPrompt, messages, rl, contextManager, planState);
    const aiResponse = interactionLog.ai_responses[interactionLog.ai_responses.length - 1];

    const recoveryMatch = aiResponse.match(/<recovery>([\s\S]*?)<\/recovery>/);
    if (recoveryMatch) {
        try {
            const recoveryJson = JSON.parse(recoveryMatch[1].trim());
            console.log("--- Recovery Strategy Received ---");
            console.log(recoveryJson);
            return { recovery: recoveryJson };
        } catch (e) {
            console.error("Error parsing recovery JSON:", e);
        }
    }

    return null;
}

async function executePlanSteps(planState, context, messages, rl, contextManager, interactionLog) {
    while (planState.currentStepIndex < planState.currentPlan.plan.length) {
        const step = planState.currentPlan.plan[planState.currentStepIndex];
        console.log("\n--- Executing Step " + step.step + ": " + step.description + " ---");

        if (step.plan) {
            const subPlanState = {
                currentPlan: { plan: step.plan },
                currentStepIndex: 0,
                isPlanExecuting: true,
            };
            console.log("\n--- Entering Sub-Plan for Step " + step.step + " ---");
            await executePlanSteps(subPlanState, context, messages, rl, contextManager, interactionLog);
            console.log("\n--- Exiting Sub-Plan for Step " + step.step + " ---");
        } else if (step.tool) {
            let itemsToIterate = [];
            if (step.iterate_on) {
                const iterable = context[step.iterate_on];
                if (Array.isArray(iterable)) {
                    itemsToIterate = iterable;
                } else if (typeof iterable === 'string') {
                    itemsToIterate = iterable.split('\n').filter((f) => f.length > 0);
                }
            } else {
                itemsToIterate = [null];
            }

            let stepOutput = [];
            for (const item of itemsToIterate) {
                let result;
                const spinner = new CustomSpinner(`Executing ${tool}...`).start();
                try {
                    const { tool, args } = step;
                    const stepContext = { ...context };
                    if (item) {
						stepContext.item = item;
					}
					const resolvedArgs = resolveArguments(args, stepContext);

                    switch (tool) {
                        case 'read_file':
                            result = await readFileTool(resolvedArgs[0]);
                            break;
                        case 'write_file':
                            result = await writeFileTool(resolvedArgs[0], resolvedArgs[1], rl);
                            break;
                        case 'list_directory':
                            result = await listDirectoryTool(resolvedArgs[0], resolvedArgs[1]);
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
                            result = await replaceInFileTool(resolvedArgs[0], resolvedArgs[1], resolvedArgs[2], resolvedArgs[3], rl);
                            break;
                        case 'search_and_replace_in_file':
                            result = await searchAndReplaceInFileTool(resolvedArgs[0], resolvedArgs[1], resolvedArgs[2], rl);
                            break;
                        case 'get_file_metadata':
                            result = await getFileMetadataTool(resolvedArgs[0]);
                            break;
                        case 'git_diff':
                            result = await gitDiffTool(resolvedArgs[0]);
                            break;
                        case 'git_blame':
                            result = await gitBlameTool(resolvedArgs[0]);
                            break;
                        case 'get_project_context':
                            result = await getProjectContextTool();
                            break;
                        case 'get_available_tools':
                            result = await getAvailableTools();
                            break;
                        case 'get_context':
                            result = await getContextTool(contextManager);
                            break;
                        case 'update_context':
                            result = await updateContextTool(contextManager, resolvedArgs[0], resolvedArgs[1]);
                            break;
                        case 'summarize_file':
                            result = await summarizeFileTool(contextManager, resolvedArgs[0]);
                            break;
                        case 'test_args':
                            result = await testArgsTool(...resolvedArgs);
                            break;
                        default:
                            result = {
                                success: false,
                                error: "Unknown tool: " + tool,
                            };
                    }
                    spinner.stop();

                    if (!result.success) {
                        throw new Error(result.error);
                    }

                    const outputMessage = "<tool_output>" + result.output + "<\/tool_output>";
                    if (tool === 'get_file_metadata') {
                        console.log(chalk.green('--- Tool Output ---'));
                        console.table(result.output);
                        console.log(chalk.green('-------------------'));
                    } else {
                        console.log(chalk.green('--- Tool Output ---\n') + chalk.blue(result.output) + chalk.green('\n-------------------'));
                    }
                    messages.push({ role: 'tool', content: outputMessage });
                    interactionLog.tool_executions.push({
                        tool_call: tool + "(" + resolvedArgs.join(', ') + ")",
                        tool_output: outputMessage,
                    });

                    stepOutput.push(result.output);
                } catch (error) {
                    await handleError(error, messages, rl, contextManager, planState);
                }
            }

            if (step.output_variable && stepOutput.length > 0) {
                context[step.output_variable] = stepOutput.length === 1 ? stepOutput[0] : stepOutput;
            }
        } else {
            console.log("--- Skipping Step " + step.step + ": No tool or nested plan specified. ---");
        }
        planState.currentStepIndex++;
    }
    return null;
}

async function logInteraction(interactionLog) {
    try {
        await fs.appendFile('agent_interactions.jsonl', JSON.stringify(interactionLog) + '\n');
    } catch (error) {
        console.error("Error logging interaction: " + error.message);
    }
}

async function handleError(error, messages, rl, contextManager, planState) {
    console.error(chalk.red('\n--- An error occurred ---'));
    console.error(chalk.red(error.stack));

    messages.push({ role: 'system', content: `An error occurred: ${error.message}` });

    const answer = await new Promise((resolve) => {
        rl.question("What would you like to do? (c)ontinue, (r)etry, (a)bort: ", (answer) => {
            resolve(answer);
        });
    });

    switch (answer.toLowerCase()) {
        case 'c':
        case 'continue':
            return;
        case 'r':
        case 'retry':
            // This will depend on where the error occurred. For now, we'll just re-run the last message.
            const lastMessage = messages.pop();
            await processMessage(lastMessage.content, messages, rl, contextManager, planState);
            break;
        case 'a':
        case 'abort':
            rl.close();
            break;
        default:
            console.log(chalk.yellow('Invalid option. Continuing...'));
            return;
    }
}

async function chatWithAI(initialPrompt = null) {
	const contextManager = new ContextManager();
	await contextManager.load();

    const projectContext = await getProjectContextTool();
    if (projectContext.success) {
        contextManager.update('project_context', projectContext.output);
    }

	await contextManager.save();

	let messages = await loadHistory();

	let planState = {
		currentPlan: null,
		currentStepIndex: 0,
		isPlanExecuting: false,
	};

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		prompt: 'You: ',
	});

	process.stdin.resume();

	if (initialPrompt) {
		const interactionLog = await processMessage(initialPrompt, messages, rl, contextManager, planState);
		await logInteraction(interactionLog);
		await saveHistory(messages);
		rl.prompt();
	} else {
		console.log("\n--- Local AI Coder (Interactive Session) ---\nType 'exit' or 'quit' to end the session.\n");
		rl.prompt();
	}

	rl.on('line', async (line) => {
		const userMessage = line.trim();
		if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
			rl.close();
			return;
		}

		const interactionLog = await processMessage(userMessage, messages, rl, contextManager, planState);
		await logInteraction(interactionLog);
		rl.prompt();
	});

	rl.on('close', async () => {
		await saveHistory(messages);
		console.log('\n--- Agent Session Ended ---');
	});
}

program.arguments('[prompt...]').action(async (promptArgs) => {
	const initialPrompt = promptArgs && promptArgs.length > 0 ? promptArgs.join(' ') : null;
	chatWithAI(initialPrompt);
});

program.parse(process.argv);