import json

def format_for_fine_tuning(input_file, output_file):
    formatted_data = []
    with open(input_file, 'r') as infile:
        for line in infile:
            interaction = json.loads(line)
            messages = []

            # Add user prompt
            if interaction.get('user_prompt'):
                messages.append({"role": "user", "content": interaction['user_prompt']})

            # Combine AI responses and tool executions into a single assistant turn
            assistant_content = ""
            if interaction.get('ai_responses'):
                # Assuming the last AI response is the most relevant or complete one
                # You might need more sophisticated logic here depending on how AI responses are structured
                assistant_content += interaction['ai_responses'][-1] + "\n" 
            
            if interaction.get('tool_executions'):
                for tool_exec in interaction['tool_executions']:
                    assistant_content += f"<tool_code>{tool_exec['tool_call']}</tool_code>\n"
                    assistant_content += f"{tool_exec['tool_output']}\n"
            
            if assistant_content:
                messages.append({"role": "assistant", "content": assistant_content.strip()})
            
            if messages:
                formatted_data.append({"messages": messages})

    with open(output_file, 'w') as outfile:
        for entry in formatted_data:
            outfile.write(json.dumps(entry) + '\n')

if __name__ == "__main__":
    input_log_file = 'agent_interactions.jsonl'
    output_fine_tuning_file = 'formatted_data.jsonl'
    format_for_fine_tuning(input_log_file, output_fine_tuning_file)
    print(f"Formatted data written to {output_fine_tuning_file}")