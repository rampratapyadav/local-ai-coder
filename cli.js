#!/usr/bin/env node

import { Command } from 'commander';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import readline from 'readline';
import ContextManager from './contextManager.js';
import ollama from 'ollama';

async function processMessage(userMessage, messages, rl, contextManager, planState) {
    const interactionLog = {
        user_message: userMessage,
        ai_responses: [],
        tool_executions: [],
    };

    messages.push({ role: 'user', content: userMessage });

    let currentMessages = [...messages];

    if (planState.isPlanExecuting) {
        // If a plan is already executing, the AI should not generate a new plan
        // Instead, it should continue processing the current plan or respond to an error
        currentMessages.push({
            role: 'system',
            content: 'A plan is currently executing. Do not generate a new plan. Respond to the current plan\'s state or error.',
        });
    }

    try {
        const response = await ollama.chat({
            model: 'codellama',
            messages: currentMessages,
            stream: true,
        });

        let aiResponseContent = '';
        for await (const chunk of response) {
            aiResponseContent += chunk.message.content;
            process.stdout.write(chunk.message.content);
        }
        process.stdout.write('\n'); // New line after AI response

        interactionLog.ai_responses.push(aiResponseContent);
        messages.push({ role: 'assistant', content: aiResponseContent });

        const planMatch = aiResponseContent.match(/<plan>([\s\S]*?)<\/plan>/);
        const toolCallMatch = aiResponseContent.match(/<tool_code>([\s\S]*?)<\/tool_code>/);

        if (planMatch) {
            try {
                const planJson = JSON.parse(planMatch[1].trim());
                if (validatePlan(planJson)) {
                    planState.currentPlan = planJson;
                    planState.currentStepIndex = 0;
                    planState.isPlanExecuting = true;
                    console.log('\n--- Plan Received and Validated ---');
                    const result = await executePlanSteps(planState, contextManager.getContext(), messages, rl, contextManager, interactionLog);
                    if (result && result.newPlan) {
                        planState.currentPlan = result.newPlan;
                        planState.currentStepIndex = result.newStepIndex || 0;
                        planState.isPlanExecuting = true;
                        await executePlanSteps(planState, contextManager.getContext(), messages, rl, contextManager, interactionLog);
                    } else {
                        planState.isPlanExecuting = false;
                        planState.currentPlan = null;
                        planState.currentStepIndex = 0;
                    }
                } else {
                    console.error('\n--- Invalid Plan Received ---');
                    messages.push({ role: 'system', content: 'The plan provided was invalid. Please provide a valid plan.' });
                }
            } catch (e) {
                console.error('Error parsing plan JSON:', e);
                messages.push({ role: 'system', content: `Error parsing plan: ${e.message}. Please provide a valid JSON plan.` });
            }
        } else if (toolCallMatch) {
            const toolCallCode = toolCallMatch[1].trim();
            const parsedTool = parseToolCall(toolCallCode);

            if (parsedTool) {
                console.log(`\n--- Executing Tool: ${parsedTool.toolName}(${parsedTool.args.join(', ')}) ---`);
                let result;
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
                            result = await replaceInFileTool(parsedTool.args[0], parsedTool.args[1], parsedTool.args[2], rl);
                            break;
                        case 'get_project_context':
                            result = await getProjectContextTool();
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
                        default:
                            result = { success: false, error: `Unknown tool: ${parsedTool.toolName}` };
                    }

                    if (result.success) {
                        const outputMessage = `<tool_output>${result.output}<\/tool_output>`;
                        console.log(`--- Tool Output ---\n${result.output}\n-------------------`);
                        messages.push({ role: 'tool', content: outputMessage });
                        interactionLog.tool_executions.push({
                            tool_call: toolCallCode,
                            tool_output: outputMessage,
                        });
                    } else {
                        console.error(`--- Tool Error ---\n${result.error}\n-------------------`);
                        messages.push({ role: 'tool', content: `<tool_error>${result.error}<\/tool_error>` });
                        interactionLog.tool_executions.push({
                            tool_call: toolCallCode,
                            tool_output: `<tool_error>${result.error}<\/tool_error>`, 
                        });
                    }
                } catch (toolError) {
                    console.error(`--- Tool Execution Exception ---\n${toolError.message}\n-------------------`);
                    messages.push({ role: 'tool', content: `<tool_error>Exception during tool execution: ${toolError.message}<\/tool_error>` });
                    interactionLog.tool_executions.push({
                        tool_call: toolCallCode,
                        tool_output: `<tool_error>Exception during tool execution: ${toolError.message}<\/tool_error>`, 
                    });
                }
            } else {
                console.error('\n--- Invalid Tool Call Format ---');
                messages.push({ role: 'system', content: 'Invalid tool call format. Please use function(arg1, arg2) format.' });
            }
        }
    } catch (error) {
        console.error('Error communicating with Ollama:', error);
        messages.push({ role: 'system', content: `Error communicating with Ollama: ${error.message}` });
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
			return {
				success: false,
				error: `Error reading file: ${filePath} not found.`,
			};
		} else {
			return {
				success: false,
				error: `Error reading file ${filePath}: ${error.message}`,
			};
		}
	}
}

async function writeFileTool(filePath, content, rl) {
	if (!filePath || !content) {
		return {
			success: false,
			error: 'Error: a file path and content must be provided.',
		};
	}
	try {
		await new Promise((resolve, reject) => {
			rl.question(
				`Are you sure you want to write to ${filePath}? (y/n): `,
				(answer) => {
					if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
						resolve();
					} else {
						reject(new Error('Write operation cancelled by user.'));
					}
				}
			);
		});

		await fs.writeFile(filePath, content, 'utf8');
		return { success: true, output: `File ${filePath} written successfully.` };
	} catch (error) {
		return {
			success: false,
			error: `Error writing file ${filePath}: ${error.message}`,
		};
	}
}

async function listDirectoryTool(dirPath, filter = null) {
	if (!dirPath) {
		return {
			success: false,
			error: 'Error: a directory path must be provided.',
		};
	}
	try {
		let files = await fs.readdir(dirPath);
		if (filter) {
			const regex = new RegExp(filter);
			files = files.filter((file) => regex.test(file));
		}
		return { success: true, output: files.join('\n') };
	} catch (error) {
		if (error.code === 'ENOENT') {
			return {
				success: false,
				error: `Error listing directory: ${dirPath} not found.`,
			};
		} else {
			return {
				success: false,
				error: `Error listing directory ${dirPath}: ${error.message}`,
			};
		}
	}
}

async function runShellCommandTool(command, rl) {
	if (!command) {
		return { success: false, error: 'Error: a command must be provided.' };
	}
	return new Promise((resolve) => {
		rl.question(
			`Are you sure you want to run the command: "${command}"? (y/n): `,
			(answer) => {
				if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
					exec(command, (error, stdout, stderr) => {
						if (error) {
							resolve({
								success: false,
								error: `Command failed: ${error.message}\nStderr: ${stderr}`,
							});
							return;
						}
						if (stderr) {
							resolve({
								success: true,
								output: `Stderr: ${stderr}\nStdout: ${stdout}`,
							});
							return;
						}
						resolve({ success: true, output: stdout });
					});
				} else {
					resolve({
						success: false,
						error: 'Command execution cancelled by user.',
					});
				}
			}
		);
	});
}

async function searchFileContentTool(filePath, pattern) {
	if (!filePath || !pattern) {
		return {
			success: false,
			error: 'Error: a file path and pattern must be provided.',
		};
	}
	try {
		const content = await fs.readFile(filePath, 'utf8');
		const regex = new RegExp(pattern, 'g');
		const matches = [];
		let match;
		while ((match = regex.exec(content)) !== null) {
			const lineStart = content.lastIndexOf('\n', match.index) + 1;
			const lineEnd = content.indexOf('\n', match.index);
			const line = content.substring(
				lineStart,
				lineEnd === -1 ? content.length : lineEnd
			);
			matches.push(
				`Line ${
					content.substring(0, match.index).split('\n').length
				}: ${line.trim()}`
			);
		}
		if (matches.length === 0) {
			return {
				success: true,
				output: `No matches found for pattern '${pattern}' in ${filePath}.`,
			};
		}
		return {
			success: true,
			output: `Matches in ${filePath}:\n${matches.join('\n')}`,
		};
	} catch (error) {
		return {
			success: false,
			error: `Error searching file ${filePath}: ${error.message}`,
		};
	}
}

async function createDirectoryTool(dirPath) {
	if (!dirPath) {
		return { success: false, error: 'Error: a directory path must be provided.' };
	}
	try {
		await fs.mkdir(dirPath, { recursive: true });
		return {
			success: true,
			output: `Directory ${dirPath} created successfully.`,
		};
	} catch (error) {
		return {
			success: false,
			error: `Error creating directory ${dirPath}: ${error.message}`,
		};
	}
}

async function replaceInFileTool(filePath, oldString, newString, rl) {
	if (!filePath || !oldString || !newString) {
		return {
			success: false,
			error: 'Error: a file path, old string, and new string must be provided.',
		};
	}
	try {
		await new Promise((resolve, reject) => {
			rl.question(
				`Are you sure you want to replace in ${filePath}? (y/n): `,
				(answer) => {
					if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
						resolve();
					} else {
						reject(new Error('Replace operation cancelled by user.'));
					}
				}
			);
		});

		let content = await fs.readFile(filePath, 'utf8');
		const originalContent = content;
		content = content.replace(new RegExp(oldString, 'g'), newString);
		if (content === originalContent) {
			return {
				success: true,
				output: `No occurrences of '${oldString}' found in ${filePath}.`,
			};
		}
		await fs.writeFile(filePath, content, 'utf8');
		return {
			success: true,
			output: `Replaced all occurrences of '${oldString}' with '${newString}' in ${filePath}.`,
		};
	} catch (error) {
		return {
			success: false,
			error: `Error replacing in file ${filePath}: ${error.message}`,
		};
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
			const dirContents = files
				.map((dirent) =>
					dirent.isDirectory() ? `${dirent.name}/` : dirent.name
				)
				.join('\n');
			context['root_directory_contents'] = dirContents;
		} catch (error) {
			context[
				'root_directory_contents'
			] = `Error listing root directory: ${error.message}`;
		}

		return { success: true, output: JSON.stringify(context, null, 2) };
	} catch (error) {
		return {
			success: false,
			error: `Error getting project context: ${error.message}`,
		};
	}
}

// --- AI Interaction Loop with Tool Use ---

const systemMessage = `You are a helpful AI coding assistant.\n\n**Functionality:**\n- You can use tools to read, write, and list files, run shell commands, and more.\n- For complex tasks, you must create a structured plan to break down the problem.\n- If the user asks to perform a file operation (read, write, summarize, etc.), you should use the corresponding tool.\n\n**Instructions:**\n1.  **Analyze the Request:** Understand the user's goal.\n2.  **Create a Plan:** If the task requires multiple steps or tools, respond with a JSON object inside a <plan> block.\n    *   The plan should be a list of steps, each with a description, a tool to use, and arguments.\n    *   If a step doesn't require a tool, set "tool": null.\n    *   Use "output_variable": "variable_name" to store the output of a tool for later use.\n    *   Use "iterate_on": "variable_name" to indicate that the step should be executed for each item in the specified variable (which should be an array). When iterating, use "\"\${item}\"" in the arguments to refer to the current item.\n3.  **Execute the Plan:** I will execute the plan step by step and provide the output for each tool.\n4.  **Respond:** Once the plan is complete or if no plan is needed, provide a final answer.\n\n**Tool Definitions:**\n<tool_code>\n// Read a file\nfunction read_file(filePath: string): string;\n\n// Write content to a file\nfunction write_file(filePath: string, content: string): string;\n\n// List contents of a directory\nfunction list_directory(dirPath: string, filter?: string): string;\n\n// Run a shell command\nfunction run_shell_command(command: string): string;\n\n// Search for a pattern within a file's content\nfunction search_file_content(filePath: string, pattern: string): string;\n\n// Create a new directory (recursive)\nfunction create_directory(dirPath: string): string;\n\n// Replace all occurrences of a string in a file\nfunction replace_in_file(filePath: string, oldString: string, newString: string): string;\n\n// Get comprehensive project context (package.json, README.md, root directory contents)\nfunction get_project_context(): string;\n\n// Get the current context\nfunction get_context(): string;\n\n// Update the context with a new key-value pair\nfunction update_context(key: string, value: any): string;\n\n// Summarize a file and add it to the context\nfunction summarize_file(filePath: string): string;\n\n<\/tool_code>`

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
		const historyToSave = messages.filter((msg) => msg.role !== 'system');
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
	const argRegex = /(?:'([^']*)'|"([^"]*)"|([^,]+))/g;
	let argMatch;

	while ((argMatch = argRegex.exec(argsString)) !== null) {
		if (argMatch[1] !== undefined) {
			args.push(argMatch[1]);
		} else if (argMatch[2] !== undefined) {
			args.push(argMatch[2]);
		} else if (argMatch[3] !== undefined) {
			args.push(argMatch[3].trim());
		}
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
		'get_project_context',
		'get_context',
		'update_context',
		'summarize_file',
	];

	for (let i = 0; i < plan.plan.length; i++) {
		const step = plan.plan[i];
		if (typeof step.step !== 'number' || typeof step.description !== 'string') {
			console.error(
				`Plan validation failed: Step ${i} missing 'step' number or 'description' string.`
			);
			return false;
		}

		if (step.tool !== null && step.tool !== undefined) {
			if (typeof step.tool !== 'string' || !validTools.includes(step.tool)) {
				console.error(
					`Plan validation failed: Step ${i} has invalid or unknown tool '${step.tool}'.`
				);
				return false;
			}
			if (!Array.isArray(step.args)) {
				console.error(
					`Plan validation failed: Step ${i} tool '${step.tool}' missing 'args' array.`
				);
				return false;
			}
		} else if (step.plan !== null && step.plan !== undefined) {
			if (!Array.isArray(step.plan)) {
				console.error(
					`Plan validation failed: Step ${i} has a 'plan' property that is not an array.`
				);
				return false;
			}
			if (!validatePlan({ plan: step.plan })) {
				console.error(`Plan validation failed: Nested plan in step ${i} is invalid.`);
				return false;
			}
		} else {
			console.error(
				`Plan validation failed: Step ${i} must have either a 'tool' or a 'plan' property.`
			);
			return false;
		}

		if (step.output_variable && typeof step.output_variable !== 'string') {
			console.error(
				`Plan validation failed: Step ${i} has invalid 'output_variable'.`
			);
			return false;
		}

		if (step.iterate_on && typeof step.iterate_on !== 'string') {
			console.error(
				`Plan validation failed: Step ${i} has invalid 'iterate_on'.`
			);
			return false;
		}
	}
	return true;
}

async function handleToolError(failedStep, error, context, messages, rl, contextManager, planState) {
	console.error(`\n--- Tool Error: Step ${failedStep.step} failed ---`);
	console.error(`Error: ${error}`);

	const newPrompt = `\nThe following step in the plan failed:\n- Step: ${failedStep.step}\n- Description: ${failedStep.description}\n- Tool: ${failedStep.tool}\n- Arguments: ${JSON.stringify(failedStep.args)}\n\nThe error was:\n${error}\n\nThe current context is:\n${JSON.stringify(context, null, 2)}\n\nThe current plan was:\n${JSON.stringify(planState.currentPlan, null, 2)}\n\nThe current step index was: ${planState.currentStepIndex}\n\nPlease provide a new plan to achieve the original goal, taking this error into account. If you provide a new plan, include it in a <plan> block and specify a "newStepIndex" if you want to restart from a specific step (default is 0).\n`;

	const interactionLog = await processMessage(newPrompt, messages, rl, contextManager, planState);

	const planMatch = interactionLog.ai_responses[interactionLog.ai_responses.length - 1].match(/<plan>([\s\S]*?)<\/plan>/);
	if (planMatch) {
		try {
			const newPlanJson = JSON.parse(planMatch[1].trim());
			if (validatePlan(newPlanJson)) {
				return { newPlan: newPlanJson, newStepIndex: newPlanJson.newStepIndex };
			}
		} catch (e) {
			console.error("Error parsing new plan from AI in handleToolError:", e);
		}
	}
	return null; // No new plan provided
}

async function executePlanSteps(planState, context, messages, rl, contextManager, interactionLog) {
    while (planState.currentStepIndex < planState.currentPlan.plan.length) {
        const step = planState.currentPlan.plan[planState.currentStepIndex];
        console.log(`\n--- Executing Step ${step.step}: ${step.description} ---`);

        if (step.plan) {
            const subPlanState = {
                currentPlan: { plan: step.plan },
                currentStepIndex: 0,
                isPlanExecuting: true,
            };
            console.log(`\n--- Entering Sub-Plan for Step ${step.step} ---`);
            await executePlanSteps(subPlanState, context, messages, rl, contextManager, interactionLog);
            console.log(`\n--- Exiting Sub-Plan for Step ${step.step} ---`);
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
                try {
                    const { tool, args } = step;
                    let resolvedArgs = args.map((arg) => {
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

                    if (tool === 'list_directory' && resolvedArgs.length > 1) {
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
                            case 'get_context':
                                result = await getContextTool(contextManager);
                                break;
                            case 'update_context':
                                result = await updateContextTool(contextManager, resolvedArgs[0], resolvedArgs[1]);
                                break;
                            case 'summarize_file':
                                result = await summarizeFileTool(contextManager, resolvedArgs[0]);
                                break;
                            default:
                                result = {
                                    success: false,
                                    error: `Unknown tool: ${tool}`,
                                };
                        }
                    }

                    if (!result.success) {
                        throw new Error(result.error);
                    }

                    const outputMessage = `<tool_output>${result.output}<\/tool_output>`;
                    console.log(`--- Tool Output ---\n${result.output}\n-------------------`);
                    messages.push({ role: 'tool', content: outputMessage });
                    interactionLog.tool_executions.push({
                        tool_call: `${tool}(${resolvedArgs.join(', ')})`,
                        tool_output: outputMessage,
                    });

                    stepOutput.push(result.output);
                } catch (error) {
                    const newPlanResult = await handleToolError(step, error.message, context, messages, rl, contextManager, planState);
                    if (newPlanResult && newPlanResult.newPlan) {
                        planState.currentPlan = newPlanResult.newPlan;
                        planState.currentStepIndex = newPlanResult.newStepIndex || 0;
                        return newPlanResult;
                    } else {
                        throw error;
                    }
                }
            }

            if (step.output_variable && stepOutput.length > 0) {
                context[step.output_variable] = stepOutput.length === 1 ? stepOutput[0] : stepOutput;
            }
        } else {
            console.log(`--- Skipping Step ${step.step}: No tool or nested plan specified. ---`);
        }
        planState.currentStepIndex++;
    }
    return null;
}

async function logInteraction(interactionLog) {
    try {
        await fs.appendFile('agent_interactions.jsonl', JSON.stringify(interactionLog) + '\n');
    } catch (error) {
        console.error(`Error logging interaction: ${error.message}`);
    }
}

async function chatWithAI(initialPrompt = null) {
	const contextManager = new ContextManager();
	await contextManager.load();
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
		rl.close();
		process.exit(0);
	} else {
		console.log(`\n--- Local AI Coder (Interactive Session) ---\nType 'exit' or 'quit' to end the session.\n`);
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
