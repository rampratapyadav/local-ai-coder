# Advanced Agentic Features: Planning & Reasoning

This document details the current implementation status and future plans for advanced planning and reasoning capabilities within the Local AI Coder's CLI agent (`cli.js`).

## Implemented Features:

### 1. Structured Planning & Execution
*   The agent can parse and execute multi-step plans from the AI.
*   It supports context variables, iteration over lists, and nested plans.

### 2. Goal-Oriented Reasoning
*   The agent can be assigned a high-level goal via the `--goal` flag.
*   This goal is maintained in the context and used to guide planning and error recovery, making the agent more resilient and focused.

### 3. Context Management
*   A `ContextManager` class provides a persistent and structured context for the AI.
*   Tools like `get_project_context`, `get_context`, `update_context`, and `summarize_file` allow the AI to interact with the context.

### 4. Robustness & Self-Correction
*   The agent validates AI-generated plans before execution.
*   It can handle tool execution errors and ask the AI for a recovery strategy.

### 5. Fine-Tuning Pipeline (Ready for Implementation)
*   The project includes scripts for data formatting (`data_formatter.py`), fine-tuning (`fine_tune_model.py`), and model merging (`merge_and_export.py`).

## Next Step: Fine-Tuning (Top Priority)

The immediate focus is to execute the fine-tuning pipeline to significantly improve the `codellama` model's ability to generate correct and useful plans and tool calls.

## Future Scope (Lower Priority)

*   **Deeper Reasoning:** Continue to improve the agent's reasoning capabilities, such as learning from past plan failures.
*   **Proactive Context Management:** Develop a more automatic system for the agent to understand the project context.
*   **Tooling and Robustness:** Re-evaluate the necessity of the Git tools and continue to improve error handling and argument validation.

---

### General Notes:

#### Data Formatting Script (`data_formatter.py`)
*   **Note:** The `data_formatter.py` script is a utility designed to be run on-demand to prepare `agent_interactions.jsonl` for fine-tuning. It is not part of the live CLI operation and does not need to be run continuously.