
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

### 4. Robust Plan Parsing and Validation
*   **Implemented:** A `validatePlan` function has been added to `cli.js` to perform structural validation of the AI-generated plans. This includes:
    *   Verifying the overall plan structure (presence of `plan` array).
    *   Checking each step for required fields (`step`, `description`).
    *   Validating tool names against a predefined list of available tools.
    *   Ensuring `args` is an array when a tool is specified.
    *   Validating `output_variable` and `iterate_on` fields if present.
    *   If validation fails, an error is logged, and a message is sent back to the AI, prompting it to correct the plan.

'''
### 5. Self-Correction (Initial Implementation)
*   **Implemented:** The agent can now handle errors during plan execution. When a tool fails, the agent is prompted to create a new plan to recover from the error. This is achieved through the `handleToolError` function, which provides the AI with the context of the failure and asks for a new plan.


'''
### 6. Sophisticated Context Management
*   **Implemented:** A new `ContextManager` class has been introduced to provide a persistent and structured context for the AI. The context is now stored in a `context.json` file and can be loaded, saved, and updated across different sessions.
*   **New Tools:** New tools have been added to interact with the `ContextManager`:
    *   `get_context`: Retrieves the current context.
    *   `update_context`: Updates the context with new information.
    *   `summarize_file`: Summarizes a file and stores the summary in the context.


## Pending/Future Scope:

### 1. Deeper Planning & Reasoning Integration
*   **Goal:** Enhance the AI's ability to plan, reason, and adapt dynamically during complex tasks.
*   **Current Status:** The current implementation provides a foundational framework for plan generation, validation, and sequential execution with error handling.
*   **Pending/Future Scope:**
    *   **Proactive Plan Modification:** Enable the AI to proactively suggest and implement plan modifications based on new information or internal reasoning, beyond just error recovery.
    *   **Hierarchical Planning/Sub-plans:** Introduce support for nested plans or sub-plans to allow the AI to break down and manage more complex problems.
    *   **Advanced Tool Argument Resolution:** Develop more sophisticated mechanisms for resolving tool arguments, including conditional logic or advanced data transformations.
    *   **Goal-Oriented Reasoning:** Implement explicit tracking and reasoning about sub-goals to allow the AI to re-evaluate and adjust its plan based on progress towards specific objectives.
    *   **Learning from Past Plans/Failures:** Develop mechanisms for the AI to learn from the outcomes of past plans (both successes and failures) to improve future planning strategies.
    *   **More Sophisticated Tool Output Interpretation:** Enhance the AI's ability to reason about the quality and implications of tool output, leading to more refined strategies.
    *   **Ambiguity Resolution:** Enable the AI to proactively identify and resolve ambiguities in user requests by asking clarifying questions before attempting a plan.
    *   **Resource Awareness:** Introduce the ability for the AI to consider resource constraints (e.g., time, computational cost) during planning.
    *   **Self-Correction/Self-Healing:** Beyond re-planning on error, allow the AI to attempt minor self-corrections or alternative approaches without always requiring a full new plan.
    *   **Formalized Knowledge Representation:** Explore more formalized knowledge representation systems (e.g., ontologies) for richer context and deeper reasoning.

### 2. Enhanced Self-Correction
*   **Goal:** Improve the agent's ability to recover from errors and adapt its strategy during plan execution.
*   **Pending/Future Scope:**
    *   **Retry Failed Steps:** Implement mechanisms for the AI to intelligently retry failed steps, possibly with modified arguments or different approaches.
    *   **Complex Strategy Adjustment:** Allow the AI to adjust its strategy in more complex ways beyond simple re-planning, such as identifying alternative tools or modifying the sequence of operations based on the nature of the error.

### 3. Deeper Context Integration
*   **Goal:** Integrate the `ContextManager` more deeply into the AI's planning and reasoning process.
*   **Pending/Future Scope:**
    *   **Context-Aware Planning:** Enable the AI to leverage the rich context stored in the `ContextManager` to inform its planning decisions more effectively.
    *   **Dynamic Context Updates:** Allow the AI to dynamically update the context based on new information gathered during execution, and use this updated context for subsequent steps.
    *   **Context Summarization/Filtering:** Implement mechanisms for the AI to summarize or filter context information to focus on relevant details for a given task.

### 4. Fine-tuning Process (Outlined)
*   **Goal:** Implement the process for fine-tuning the `codellama` model using collected interaction data.
*   **Current Status:** A conceptual Python script (`fine_tune_model.py`) has been outlined, detailing the steps for loading data, preparing the model with PEFT (LoRA), defining training arguments, and saving the fine-tuned model. Actual execution requires manual setup and significant computational resources (e.g., GPU).

### 5. Deployment of Fine-tuned Model (Outlined)
*   **Goal:** Integrate a fine-tuned model back into Ollama for use.
*   **Current Status:** The process has been outlined, including steps for merging LoRA adapters with the base model (if applicable), converting the model to an Ollama-compatible format (e.g., GGUF), creating an Ollama Modelfile, and importing the model into Ollama.''''''



This approach provides a solid foundation, but further development in these areas will significantly enhance the agent's autonomy and intelligence.

---

### General Notes:

#### Data Formatting Script (`data_formatter.py`)
*   **Note:** The `data_formatter.py` script is a utility designed to be run on-demand to prepare `agent_interactions.jsonl` for fine-tuning. It is not part of the live CLI operation and does not need to be run continuously.
```
