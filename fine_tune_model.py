#!/usr/bin/env python3

import os
import json
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model, TaskType
from datasets import Dataset

# This script is a conceptual outline for fine-tuning the Code Llama model.
# Actual execution requires significant computational resources (GPU) and
# careful configuration based on your specific environment and data.

# 1. Configuration
#    - Adjust model_name, dataset_path, and output_dir as needed.
#    - Ensure you have a compatible GPU and sufficient VRAM.

model_name = "codellama/CodeLlama-7b-hf"  # Example: Replace with your model path or Hugging Face ID
dataset_path = "formatted_data.jsonl"
output_dir = "./fine_tuned_model"

def create_conversation_prompt(example):
    prompt = ""
    for message in example["messages"]:
        if message["role"] == "user":
            prompt += f"User: {message['content']}\n"
        elif message["role"] == "assistant":
            prompt += f"Assistant: {message['content']}\n"
    return {"text": prompt}

def main():
    # 2. Load Data
    with open(dataset_path, 'r') as f:
        data = [json.loads(line) for line in f]

    dataset = Dataset.from_list(data)
    dataset = dataset.map(create_conversation_prompt)

    print(f"Loaded {len(dataset)} examples from {dataset_path}")
    if len(dataset) > 0:
        print("Example prompt:")
        print(dataset[0]['text'])

    # 3. Initialize Tokenizer and Model
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(model_name)

    # 4. Prepare Model for PEFT (LoRA)
    lora_config = LoraConfig(
        r=8,  # LoRA attention dimension
        lora_alpha=16,  # Alpha parameter for LoRA scaling
        target_modules=["q_proj", "v_proj"],  # Modules to apply LoRA to
        lora_dropout=0.05,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # 5. Define Training Arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        num_train_epochs=3,
        logging_dir=f"{output_dir}/logs",
        logging_steps=10,
        save_steps=500,
        save_total_limit=2,
        push_to_hub=False,
        report_to="none",
    )

    def tokenize_function(examples):
        return tokenizer(examples["text"], truncation=True, padding="max_length", max_length=512)

    tokenized_dataset = dataset.map(tokenize_function, batched=True)

    # 6. Create Trainer and Start Training
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        tokenizer=tokenizer,
    )

    print("Starting training...")
    trainer.train()
    print("Training finished.")

    # 7. Save the Fine-tuned Model
    print(f"Saving model to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

if __name__ == "__main__":
    print("Starting fine-tuning script.")
    print("This script is resource-intensive and requires a GPU.")
    # To run, uncomment the line below and ensure you have the necessary dependencies installed.
    # main()
    print("Script finished. Uncomment the `main()` call to run.")