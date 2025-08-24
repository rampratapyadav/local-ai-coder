
# Advanced Agentic Features: Planning & Reasoning

This document details the current implementation status and future plans for advanced planning and reasoning capabilities within the Local AI Coder's CLI agent (`cli.js`).

## Implemented Features:

### 1. Structured Planning
The CLI agent now actively parses and executes AI-generated plans embedded within `<plan>...</plan>` blocks. This includes:
*   **JSON-based Plan Format:** Expects a JSON object with a `plan` array, where each element represents a step.
*   **Step-by-Step Execution:** Iterates through the steps of the plan.
*   **Tool Integration:** Executes specified tools for each step (e.g., `read_file`, `list_directory`).
*   **Output Variable (`output_variable`):** Stores the output of a tool execution in a `context` object, allowing subsequent steps to reference previous results.
*   **Iteration (`iterate_on`):** Supports iterating over lists (e.g., file lists from `list_directory`) and executing a step for each item, using `${item}` for dynamic arguments.
*   **Advanced Argument Resolution:** Resolves placeholders like `${item}` and `${variable_name}` in tool arguments. The new parser can handle nested objects and arrays, and resolve variables from the context.

### 2. Plan Execution Engine
A component within `cli.js` acts as the plan execution engine, responsible for:
*   Parsing the JSON plan from the AI's response.
*   Iterating through and executing each step.
*   Feeding the output of each tool back to the AI for further reasoning.

### 3. Context Management (Initial)
*   **`get_project_context()` Tool:** A new tool has been implemented that allows the AI to retrieve structured information about the project. This includes:
    *   The content of `package.json` (parsed as JSON).
    *   The content of `README.md`.
    *   A listing of the top-level files and directories in the project root.
    This provides the AI with a foundational understanding of the project's environment.

### 4. Robust Plan Parsing and Validation
*   **Implemented:** A `validatePlan` function has been added to `cli.js` to perform structural validation of the AI-generated plans. This includes:
    *   Verifying the overall plan structure (presence of `plan` array).
    *   Checking each step for required fields (`step`, `description`).
    *   Validating tool names against a predefined list of available tools.
    *   Ensuring `args` is an array when a tool is specified.
    *   Validating `output_variable` and `iterate_on` fields if present.
    *   If validation fails, an error is logged, and a message is sent back to the AI, prompting it to correct the plan.

### 5. Advanced Self-Correction
*   **Implemented:** The agent can now handle errors during plan execution. When a tool fails, the agent can choose between several recovery strategies: retrying the step (with or without modified arguments), proposing an alternative step, creating a new plan, or asking the user for help. This is achieved through the `handleToolError` function, which provides the AI with the context of the failure and asks for a recovery strategy.

### 6. Sophisticated Context Management
*   **Implemented:** A new `ContextManager` class has been introduced to provide a persistent and structured context for the AI. The context is now stored in a `context.json` file and can be loaded, saved, and updated across different sessions.
*   **New Tools:** New tools have been added to interact with the `ContextManager`:
    *   `get_context`: Retrieves the current context.
    *   `update_context`: Updates the context with new information.
    *   `summarize_file`: Summarizes a file and stores the summary in the context.

### 7. Advanced Planning and Self-Correction
*   **Proactive Plan Modification:** The agent can proactively suggest and implement plan modifications based on new information or internal reasoning, beyond just error recovery. This is primarily handled by the `handleToolError` function which allows the AI to provide a new plan upon failure.
*   **Hierarchical Planning/Sub-plans:** The agent supports nested plans or sub-plans, allowing the AI to break down and manage more complex problems. This is implemented in the `executePlanSteps` function which recursively calls itself for nested plans.

### 8. Fine-Tuning Pipeline
*   **Data Formatting:** `data_formatter.py` script to transform `agent_interactions.jsonl` into a format suitable for fine-tuning.
*   **Fine-Tuning Script:** `fine_tune_model.py` script to fine-tune the `codellama` model using LoRA.
*   **Merge and Export Script:** `merge_and_export.py` script to merge the trained LoRA adapters with the base model.
*   **Deployment Instructions:** The process for converting the model to GGUF and running it in Ollama is documented.

## Pending/Future Scope:

### Core Agent Capabilities



*   **Deeper Reasoning:** The agent lacks a deeper understanding of its goals. Features like goal-oriented reasoning, learning from past plan failures, and resource awareness are still pending.
*   **Proactive Context Management:** The agent currently relies on tools like `get_project_context` to be explicitly called. A more advanced, proactive system where the agent automatically understands the project context is a future goal.

### Tooling and Robustness

*   **Robust Tool Parsing:** The `parseToolCall` function in `cli.js` is still regex-based and could be improved to more reliably handle complex arguments or multiple tool calls.
*   **Comprehensive Error Handling:** The main `processMessage` loop could have more robust error handling for AI interaction and tool execution failures.
*   **Argument Validation:** The tools themselves could have more comprehensive validation for the types and formats of the arguments they receive.

---

### General Notes:

#### Data Formatting Script (`data_formatter.py`)
*   **Note:** The `data_formatter.py` script is a utility designed to be run on-demand to prepare `agent_interactions.jsonl` for fine-tuning. It is not part of the live CLI operation and does not need to be run continuously.
```
