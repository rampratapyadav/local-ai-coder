# Project TODO List

This document outlines the remaining tasks and future scope for the local-ai-coder project.

## 1. Enhance Tool Use


*   **Add More Specific Tools:** Expand the agent's toolset with specialized functionalities:
    *   `search_and_replace_in_file`: A tool to search for a pattern and replace it with a new string within a file. (DONE)
    *   `get_file_metadata`: A tool to retrieve metadata about a file (e.g., size, creation date, modification date). (DONE)
    *   `git_diff`: A tool to return the output of `git diff` for a specified file or the entire repository. (DONE)
    *   `git_blame`: A tool to return the output of `git blame` for a specified file. (DONE)

## 2. Project Context Awareness

*   **Proactive Context Management:** Develop a more advanced system where the agent automatically understands the project context without explicit calls. A starting point could be automatically running `get_project_context` at the beginning of each session. (DONE)

## 3. Error Handling & Robustness

*   **Comprehensive Error Handling:** Enhance the `processMessage` loop with more robust error handling for AI interaction and tool execution failures, making the agent more resilient. (DONE)

## 4. User Experience

*   **Web GUI Enhancements:** Improve the web interface with key features:
    *   Cross-session conversation history persistence. (DONE)
    *   Code highlighting for rendered Markdown responses. (DONE)
    *   A more effective way to display tool outputs. (DONE)
*   **CLI Enhancements:** Improve the command-line interface with:
    *   Better formatting for tool outputs. (DONE)
    *   Progress indicators for long-running commands. (DONE)

## 5. Packaging & Distribution

*   Set up the project for easier distribution, including creating a proper npm package for the CLI (DONE) and considering a standalone executable.

## 6. Core Agent Capabilities (Deeper Reasoning)

*   **Deeper Reasoning:** Address the agent's current lack of deeper goal understanding. Implement features like goal-oriented reasoning, learning from past plan failures, and resource awareness.

## 7. Fine-Tuning Pipeline

*   **Fine-Tuning Implementation:** Execute the actual fine-tuning of the `codellama` model using the existing `fine_tune_model.py` script and related processes. (This is a later-stage task as previously discussed).