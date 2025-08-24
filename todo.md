# Fine-Tuning Pipeline Testing TODO

This document outlines the steps to test the fine-tuning pipeline for the local-ai-coder agent.

**Important Prerequisites:**

*   **Python Environment:** Ensure you have a Python environment with `torch` and `transformers` installed. For fine-tuning, a machine with a powerful **NVIDIA GPU** and **CUDA** is highly recommended.
*   **Dependencies:** You will need to install the required Python packages:
    ```bash
    pip install torch transformers datasets peft
    ```
*   **Llama.cpp:** For converting the model to Ollama's format, you will need to have `llama.cpp` available on your system. You can get it by cloning the repository:
    ```bash
    git clone https://github.com/ggerganov/llama.cpp.git
    cd llama.cpp
    make
    ```

Here are the steps to test the entire pipeline:

### Step 1: Generate Interaction Data

First, you need to generate some data for fine-tuning. Use the interactive CLI to have a few conversations with the agent. The more high-quality interactions you have, the better the fine-tuning will be.

```bash
local-ai-coder
```
After you have had a few interactions, the `agent_interactions.jsonl` file will be populated with data.

### Step 2: Format the Data

Now, run the `data_formatter.py` script to convert the interaction log into the format required for training.

```bash
python3 data_formatter.py
```
This will create a `formatted_data.jsonl` file.

### Step 3: Run the Fine-Tuning Script

This step will train the model. It is very resource-intensive and will take a long time.

1.  **Edit `fine_tune_model.py`:** Open the `fine_tune_model.py` file and uncomment the `main()` call at the bottom of the script.
    ```python
    # ...
    if __name__ == "__main__":
        # ...
        # To run, uncomment the line below and ensure you have the necessary dependencies installed.
        main() # Uncomment this line
        # ...
    ```
2.  **Run the script:**
    ```bash
    python3 fine_tune_model.py
    ```
This will create a `./fine_tuned_model` directory containing the LoRA adapters.

### Step 4: Merge the Trained Model

Now, merge the LoRA adapters with the base model.

1.  **Edit `merge_and_export.py`:** Open the `merge_and_export.py` file and uncomment the `main()` call at the bottom.
2.  **Run the script:**
    ```bash
    python3 merge_and_export.py
    ```
This will create a `./merged_model` directory with the new fine-tuned model.

### Step 5: Convert the Model to GGUF

This step uses `llama.cpp` to convert the merged model to the GGUF format that Ollama uses.

```bash
# Make sure you are in the llama.cpp directory
python3 convert.py ../local-ai-coder/merged_model --outfile ../local-ai-coder/custom_codellama.gguf --vocab-type bpe
```

### Step 6: Create an Ollama Modelfile

Create a new file named `Modelfile` in your `local-ai-coder` directory with the following content:

```
FROM ./custom_codellama.gguf
TEMPLATE """User: {{.Prompt}}
Assistant: """
```

### Step 7: Import and Run the Model in Ollama

Finally, import the new model into Ollama and run it.

1.  **Import the model:**
    ```bash
    ollama create custom-codellama -f Modelfile
    ```
2.  **Run the model:**
    ```bash
    ollama run custom-codellama
    ```

You can now chat with your fine-tuned model.
