import { promises as fs } from 'fs';
import { exec } from 'child_process';

export async function readFileTool(filePath) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, output: content };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                success: false,
                error: "Error reading file: " + filePath + " not found.",
            };
        } else {
            return {
                success: false,
                error: "Error reading file " + filePath + ": " + error.message,
            };
        }
    }
}

export async function writeFileTool(filePath, content, rl) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    if (typeof content !== 'string' || content.trim() === '') {
        return { success: false, error: 'Validation Error: content must be a non-empty string.' };
    }
    try {
        await new Promise((resolve, reject) => {
            rl.question(
                "Are you sure you want to write to " + filePath + "? (y/n): ",
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
        return { success: true, output: "File " + filePath + " written successfully." };
    } catch (error) {
        return {
            success: false,
            error: "Error writing file " + filePath + ": " + error.message,
        };
    }
}

export async function listDirectoryTool(dirPath = '.', options = {}) {
    if (typeof dirPath !== 'string' || dirPath.trim() === '') {
        return { success: false, error: 'Validation Error: dirPath must be a non-empty string.' };
    }
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        let output = files.map((dirent) => {
            let type = dirent.isDirectory() ? 'directory' : 'file';
            if (dirent.isSymbolicLink()) {
                type = 'symlink';
            }
            return `${dirent.name} (${type})`;
        }).join('\n');
        return { success: true, output: output };
    } catch (error) {
        return {
            success: false,
            error: `Error listing directory ${dirPath}: ` + error.message,
        };
    }
}

export async function runShellCommandTool(command, rl) {
    if (typeof command !== 'string' || command.trim() === '') {
        return { success: false, error: 'Validation Error: command must be a non-empty string.' };
    }
    try {
        await new Promise((resolve, reject) => {
            rl.question(
                `Are you sure you want to run the following command: \"${command}\"? (y/n): `,
                (answer) => {
                    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                        resolve();
                    } else {
                        reject(new Error('Command execution cancelled by user.'));
                    }
                }
            );
        });

        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ stdout, stderr });
            });
        });

        if (stderr) {
            return { success: false, error: stderr };
        }
        return { success: true, output: stdout };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function searchFileContentTool(filePath, searchString) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    if (typeof searchString !== 'string' || searchString.trim() === '') {
        return { success: false, error: 'Validation Error: searchString must be a non-empty string.' };
    }
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const matchingLines = lines.filter(line => line.includes(searchString));
        return { success: true, output: matchingLines.join('\n') };
    } catch (error) {
        return {
            success: false,
            error: `Error searching file content in ${filePath}: ` + error.message,
        };
    }
}

export async function createDirectoryTool(dirPath) {
    if (typeof dirPath !== 'string' || dirPath.trim() === '') {
        return { success: false, error: 'Validation Error: dirPath must be a non-empty string.' };
    }
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true, output: `Directory ${dirPath} created successfully.` };
    } catch (error) {
        return {
            success: false,
            error: `Error creating directory ${dirPath}: ` + error.message,
        };
    }
}

export async function replaceInFileTool(filePath, oldString, newString, replaceAll = false, rl) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    if (typeof oldString !== 'string' || oldString.trim() === '') {
        return { success: false, error: 'Validation Error: oldString must be a non-empty string.' };
    }
    if (typeof newString !== 'string' || newString.trim() === '') {
        return { success: false, error: 'Validation Error: newString must be a non-empty string.' };
    }
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        if (!fileContent.includes(oldString)) {
            return {
                success: false,
                error: "Error: The string to be replaced was not found in the file.",
            };
        }
        await new Promise((resolve, reject) => {
            rl.question(
                `Are you sure you want to replace ${replaceAll ? 'all occurrences of ' : ''}"${oldString}" with "${newString}" in ${filePath}? (y/n): `,
                (answer) => {
                    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                        resolve();
                    } else {
                        reject(new Error('Write operation cancelled by user.'));
                    }
                }
            );
        });
        const updatedContent = replaceAll ? fileContent.replace(new RegExp(oldString, 'g'), newString) : fileContent.replace(oldString, newString);
        await fs.writeFile(filePath, updatedContent, 'utf8');
        return { success: true, output: `Successfully replaced ${replaceAll ? 'all occurrences of ' : ''}"${oldString}" with "${newString}" in ${filePath}.` };
    } catch (error) {
        return {
            success: false,
            error: `Error replacing string in file ${filePath}: ` + error.message,
        };
    }
}

export async function searchAndReplaceInFileTool(filePath, searchRegex, replaceStr, rl) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    if (typeof searchRegex !== 'string' || searchRegex.trim() === '') {
        return { success: false, error: 'Validation Error: searchRegex must be a non-empty string.' };
    }
    if (typeof replaceStr !== 'string' || replaceStr.trim() === '') {
        return { success: false, error: 'Validation Error: replaceStr must be a non-empty string.' };
    }
    try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const regex = new RegExp(searchRegex, 'g');
        if (!regex.test(fileContent)) {
            return {
                success: false,
                error: "Error: The search pattern was not found in the file.",
            };
        }
        await new Promise((resolve, reject) => {
            rl.question(
                `Are you sure you want to replace all occurrences of "${searchRegex}" with "${replaceStr}" in ${filePath}? (y/n): `,
                (answer) => {
                    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                        resolve();
                    } else {
                        reject(new Error('Write operation cancelled by user.'));
                    }
                }
            );
        });
        const updatedContent = fileContent.replace(regex, replaceStr);
        await fs.writeFile(filePath, updatedContent, 'utf8');
        return { success: true, output: `Successfully replaced all occurrences of "${searchRegex}" with "${replaceStr}" in ${filePath}.` };
    } catch (error) {
        return {
            success: false,
            error: `Error searching and replacing in file ${filePath}: ` + error.message,
        };
    }
}

export async function getFileMetadataTool(filePath) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    try {
        const stats = await fs.stat(filePath);
        return {
            success: true,
            output: {
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
            },
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                success: false,
                error: "Error getting file metadata: " + filePath + " not found.",
            };
        } else {
            return {
                success: false,
                error: "Error getting file metadata for " + filePath + ": " + error.message,
            };
        }
    }
}

export async function gitDiffTool(filePath) {
    const command = filePath ? `git diff ${filePath}` : 'git diff';
    try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ stdout, stderr });
            });
        });
        if (stderr) {
            return { success: false, error: stderr };
        }
        return { success: true, output: stdout };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function gitBlameTool(filePath) {
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        return { success: false, error: 'Validation Error: filePath must be a non-empty string.' };
    }
    const command = `git blame ${filePath}`;
    try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve({ stdout, stderr });
            });
        });
        if (stderr) {
            return { success: false, error: stderr };
        }
        return { success: true, output: stdout };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function getProjectContextTool() {
    let context = {};
    const projectRoot = process.cwd();
    try {
        const packageJsonPath = projectRoot + '/package.json';
        const readmePath = projectRoot + '/README.md';
        try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
            context['package.json'] = JSON.parse(packageJsonContent);
        } catch (error) {
            context['package.json'] = "Error reading package.json: " + error.message;
        }
        try {
            const readmeContent = await fs.readFile(readmePath, 'utf8');
            context['README.md'] = readmeContent;
        } catch (error) {
            context['README.md'] = "Error reading README.md: " + error.message;
        }
        try {
            const files = await fs.readdir(projectRoot, { withFileTypes: true });
            const dirContents = files
                .map((dirent) =>
                    dirent.isDirectory() ? dirent.name + '/' : dirent.name
                )
                .join('\n');
            context['root_directory_contents'] = dirContents;
        } catch (error) {
            context[
                'root_directory_contents'
            ] = "Error listing root directory: " + error.message;
        }
        return { success: true, output: JSON.stringify(context, null, 2) };
    } catch (error) {
        return {
            success: false,
            error: "Error getting project context: " + error.message,
        };
    }
}

export async function getAvailableTools() {
    try {
        const toolsFileContent = await fs.readFile('./tools.js', 'utf8');
        const toolFunctions = toolsFileContent.match(/export async function (\w+Tool)\(([^)]*)\)/g);
        if (!toolFunctions) {
            return { success: true, output: "No tools found." };
        }
        const toolDefinitions = toolFunctions.map(func => {
            const match = func.match(/export async function (\w+Tool)\(([^)]*)\)/);
            const toolName = match[1];
            const args = match[2].split(',').map(arg => arg.trim()).filter(arg => arg !== '');
            return { name: toolName, args: args };
        });
        return { success: true, output: JSON.stringify(toolDefinitions, null, 2) };
    } catch (error) {
        return { success: false, error: `Error getting available tools: ${error.message}` };
    }
}

export async function getContextTool(contextManager) {
    try {
        const context = contextManager.getContext();
        return { success: true, output: JSON.stringify(context, null, 2) };
    } catch (error) {
        return { success: false, error: `Error updating context: ${error.message}` };
    }
}

export async function updateContextTool(contextManager, key, value) {
    try {
        contextManager.updateContext(key, value);
        return { success: true, output: `Context updated: ${key} = ${value}` };
    } catch (error) {
        return { success: false, error: `Error updating context: ${error.message}` };
    }
}

export async function summarizeFileTool(contextManager, filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        // In a real scenario, you'd send this content to an LLM for summarization.
        // For now, we'll just store the content as a placeholder for summarization.
        contextManager.updateContext('summarized_file_' + filePath.replace(/[^a-zA-Z0-9]/g, '_'), content);
        return { success: true, output: `File ${filePath} summarized and added to context.` };
    } catch (error) {
        return { success: false, error: `Error summarizing file ${filePath}: ${error.message}` };
    }
}

export async function testArgsTool(...args) {
    console.log('--- test_args tool called with: ---');
    console.log(args);
    return { success: true, output: JSON.stringify(args, null, 2) };
}
