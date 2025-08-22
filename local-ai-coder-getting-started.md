### Local AI Coder: Getting Started Guide

This guide will walk you through setting up and running your local AI coding assistant, which includes both a command-line interface (CLI) agent and a web-based chat interface.

#### Prerequisites

Before you begin, ensure you have the following installed on your system:

1.  **Node.js and npm:**
    *   Download and install from [nodejs.org](https://nodejs.org/).
    *   Verify installation: `node -v` and `npm -v`

2.  **Python 3:**
    *   Usually pre-installed on macOS/Linux.
    *   Verify installation: `python3 -V`

3.  **Ollama:**
    *   Download and install from [ollama.com/download](https://ollama.com/download).
    *   Verify installation: `ollama -v`

4.  **Code Llama Model (for Ollama):**
    *   Once Ollama is installed, download the `codellama` model by running:
        ```bash
        ollama run codellama
        ```
        (This will download the model. You can then `Ctrl+C` to exit the chat, Ollama will continue running in the background.)

#### Setup Steps

Assuming you have the `local-ai-coder` project files (the `local-ai-coder` directory with `index.html`, `style.css`, `main.js`, `cli.js`, `package.json`, etc.):

1.  **Navigate to the Project Directory:**
    ```bash
    cd /Users/rampratarampratapp/local-ai-coder
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

3.  **Link the CLI Command:**
    This makes the `local-ai-coder` command available globally in your terminal.
    ```bash
    npm link
    ```

#### How to Run

First, ensure Ollama is running in the background. You can verify this by checking for the `ollama` process (e.g., `pgrep ollama` or `ps aux | grep ollama`).

##### 1. Using the CLI Agent

The CLI agent allows you to interact with the AI directly from your terminal.

*   **Interactive Session:**
    To start a continuous conversation:
    ```bash
    local-ai-coder
    ```
    Type your prompts at the `You: ` prompt. To end the session, type `exit` or `quit`.

*   **Direct Prompt:**
    For a single question and answer:
    ```bash
    local-ai-coder "Write a JavaScript function to reverse a string."
    ```

##### 2. Using the Web GUI

The web GUI provides a chat interface in your browser.

*   **Start a Local Web Server:**
    Navigate to your `local-ai-coder` directory in a terminal and run:
    ```bash
    python3 -m http.server
    ```
    (This will typically serve on `http://localhost:8000`)

*   **Open in Browser:**
    Open your web browser and go to the address provided by the server (e.g., `http://localhost:8000`).

#### Basic Troubleshooting

*   **CORS Error in Web GUI:** If you see "CORS policy" errors in your browser console, ensure you are serving `index.html` via `python3 -m http.server` (or similar) and accessing it via `http://localhost:8000`, not directly from `file:///`.
*   **Ollama Not Running / Model Not Found:** If the AI doesn't respond, ensure Ollama is running and you have downloaded the `codellama` model (`ollama run codellama`).
*   **`local-ai-coder: command not found`:** Ensure you ran `npm install` and `npm link` successfully from the `local-ai-coder` directory. Also, check that `cli.js` has executable permissions (`chmod +x cli.js`).

#### Next Steps

For advanced features, fine-tuning, and further development, refer to the `local-ai-coder-summary.md` file in your project directory.
