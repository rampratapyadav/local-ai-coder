#!/usr/bin/env python3

import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

# This script merges the LoRA adapters with the base model and saves the merged model.

# 1. Configuration
#    - base_model_name: The name or path of the base model.
#    - peft_model_path: The path to the directory containing the LoRA adapters.
#    - output_dir: The directory where the merged model will be saved.

base_model_name = "codellama/CodeLlama-7b-hf"
peft_model_path = "./fine_tuned_model"
output_dir = "./merged_model"

def main():
    print(f"Loading base model: {base_model_name}")
    base_model = AutoModelForCausalLM.from_pretrained(base_model_name, torch_dtype=torch.float16, device_map="auto")
    
    print(f"Loading PEFT model from: {peft_model_path}")
    peft_model = PeftModel.from_pretrained(base_model, peft_model_path)
    
    print("Merging model...")
    merged_model = peft_model.merge_and_unload()
    
    print(f"Saving merged model to: {output_dir}")
    os.makedirs(output_dir, exist_ok=True)
    merged_model.save_pretrained(output_dir)
    
    tokenizer = AutoTokenizer.from_pretrained(base_model_name)
    tokenizer.save_pretrained(output_dir)
    
    print("Model merging complete.")

if __name__ == "__main__":
    print("Starting model merge script.")
    # To run, uncomment the line below.
    # main()
    print("Script finished. Uncomment the `main()` call to run.")
