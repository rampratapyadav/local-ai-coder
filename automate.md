# Automation Plan

This document will outline the plan for automating various tasks in the `local-ai-coder` project.

## Understanding the Fine-Tuning Process

The current fine-tuning process is manual and complex. Before we can automate it, it's important to understand the purpose of each step.

Think of it like teaching a very smart, general-purpose assistant (the base `codellama` model) how to be a specialist for *our specific project*.

### The Goal: Create a Specialist Assistant

The `codellama` model from the internet is a generalist. It knows a lot about coding in general, but it doesn't know anything about our specific tools (`read_file`, `write_file`, etc.) or the way we like to interact with it.

The goal of fine-tuning is to take this generalist model and give it specialized training so it becomes an expert at being *your* `local-ai-coder` agent.

### How the "Training" Works, Step-by-Step

Here is a simplified explanation of the pipeline:

**Step 1: Creating the "Textbook" (`agent_interactions.jsonl`)**

*   **What it is:** Every time you interact with the agent, the conversation (your message, the AI's response, the tools it used, and the results) is saved as a lesson in `agent_interactions.jsonl`.
*   **Analogy:** This file is like a textbook we are writing for our new specialist assistant. It's full of real-world examples of the job we want it to do.

**Step 2: Preparing the "Study Guide" (`data_formatter.py`)**

*   **What it is:** The raw "textbook" is a bit messy for a machine to learn from directly. This script cleans it up and formats each lesson into a simple, clear "flashcard" format (e.g., "When the user says X, the correct response is Y").
*   **Analogy:** This is like turning our textbook into a concise study guide, making it much easier for our assistant to learn from.

**Step 3: The "Study Session" (`fine_tune_model.py`)**

*   **What it is:** This is the core of the process. The script takes the base `codellama` model and has it "study" our "study guide" (`formatted_data.jsonl`).
*   **The "Magic" of LoRA:** We use a technique called LoRA (Low-Rank Adaptation). Instead of forcing the model to re-learn everything it already knows about coding, LoRA allows it to add a small, new layer of knowledge on top.
*   **Analogy:** Think of this like an open-book exam. The assistant doesn't forget its general knowledge; it just creates a small set of "sticky notes" (these are the LoRA adapters) that are specific to our project's rules and tools. This is much more efficient than re-learning every book it has ever read.

**Step 4 & 5: "Publishing" the New Knowledge (`merge_and_export.py` & GGUF Conversion)**

*   **What it is:** After the study session, we have the original model and a small file of "sticky notes" (the LoRA adapters). These steps merge the "sticky notes" permanently into a copy of the original model and then convert it into a special format (`.gguf`) that Ollama can use.
*   **Analogy:** This is like printing a new, custom edition of our textbook that includes all of our specialized notes bound directly into the pages.

**Step 6 & 7: Putting the New Assistant to Work (Ollama `Modelfile` and `create`)**

*   **What it is:** These final steps are purely administrative. We write a simple configuration file (`Modelfile`) that tells Ollama "Here is our new specialist assistant," and then we use the `ollama create` command to register it.
*   **Analogy:** This is like putting the new, custom textbook on the shelf and giving it a name (e.g., `custom-codellama`) so we can easily grab it and use it.

So, while the process has many manual steps, the core idea is simple: **we are creating a collection of ideal conversations and then training the AI to learn from them.** The complexity comes from the tools required to prepare the AI and its lessons for this training.