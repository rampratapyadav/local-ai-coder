
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
*   **Argument Resolution:** Resolves placeholders like `${variable_name}` within tool arguments.

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

## Pending/Future Scope:

### 1. Self-Correction
*   **Goal:** Enable the AI to identify and recover from failed tool executions or unexpected outcomes during plan execution.
*   **Current Status:** While tool functions return success/error status, the execution engine primarily logs errors. There is no explicit logic for the AI to dynamically re-plan, retry, or adjust its strategy based on these errors.

### 2. More Sophisticated Context Management
*   **Goal:** Provide the AI with a deeper, more persistent understanding of the project's overall state, dependencies, and code structure beyond just the immediate outputs of plan steps.
*   **Current Status:** The `context` object is limited to the current plan's execution. There's no broader mechanism for the AI to maintain a "mental model" of the project or its components across interactions.

### 3. Deeper Planning & Reasoning Integration
*   **Goal:** Allow the AI more dynamic control over the execution flow, enabling it to pause, ask for clarification, or modify the plan mid-execution based on intermediate results and ongoing reasoning.
*   **Current Status:** The current implementation executes plan steps sequentially. The AI receives tool outputs after each step but doesn't have explicit mechanisms to intervene or reason *during* the execution of a multi-step plan.

This approach provides a solid foundation, but further development in these areas will significantly enhance the agent's autonomy and intelligence.
