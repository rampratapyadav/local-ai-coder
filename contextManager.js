import { promises as fs } from 'fs';

const CONTEXT_FILE = 'context.json';

class ContextManager {
	constructor() {
		this.context = {};
	}

	async load() {
		try {
			const data = await fs.readFile(CONTEXT_FILE, 'utf8');
			this.context = JSON.parse(data);
		} catch (error) {
			if (error.code === 'ENOENT') {
				// If the file doesn't exist, initialize with an empty context
				this.context = {
					current_goal: '',
					project_summary: '',
					file_summaries: {},
					tool_history: [],
					user_preferences: {},
				};
			} else {
				console.error(`Error loading context: ${error.message}`);
			}
		}
	}

	async save() {
		try {
			await fs.writeFile(CONTEXT_FILE, JSON.stringify(this.context, null, 2));
		} catch (error) {
			console.error(`Error saving context: ${error.message}`);
		}
	}

	get(key) {
		return this.context[key];
	}

	update(key, value) {
		this.context[key] = value;
		this.save();
	}

	clear() {
		this.context = {
			current_goal: '',
			project_summary: '',
			file_summaries: {},
			tool_history: [],
			user_preferences: {},
		};
		this.save();
	}
}

export default ContextManager;