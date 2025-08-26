# Project TODO List

This document outlines the remaining tasks and future scope for the local-ai-coder project.

## 1. Fine-Tuning Pipeline (Top Priority)

*   **Fine-Tuning Implementation:** Execute the actual fine-tuning of the `codellama` model using the existing `fine_tune_model.py` script and related processes. This is the current focus to improve the agent's core intelligence.

## 2. Future Enhancements (Lower Priority)

### Core Agent Capabilities
*   **Deeper Reasoning:** Continue to improve the agent's reasoning capabilities, such as learning from past plan failures and resource awareness. (Goal-Oriented Reasoning is the first step and is complete).

### Tooling and Robustness
*   **Git Tools Clarification:** Revisit the `gitDiffTool` and `gitBlameTool` in `tools.js`. Decide whether to keep, remove, or modify them based on their actual utility and integration with the agent's workflow.

### User Experience
*   **Web GUI Enhancements:**
    *   Further improve the display of tool outputs.
*   **CLI Enhancements:**
    *   Further improve formatting for tool outputs.
    *   Add more robust progress indicators for long-running commands.

### Packaging & Distribution
*   **Standalone Executable:** Consider creating a standalone executable for even easier distribution.

## Completed Tasks

*   **Goal-Oriented Reasoning**
*   **Initial Toolset:** `search_and_replace_in_file`, `get_file_metadata`, `git_diff`, `git_blame`
*   **Proactive Context Management (Initial)**
*   **Comprehensive Error Handling (Initial)**
*   **Web GUI Basics:** History, code highlighting.
*   **CLI Basics:** Output formatting, progress indicators.
*   **NPM Package**