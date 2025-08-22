import json

def format_data(input_file, output_file):
    with open(input_file, 'r') as f_in, open(output_file, 'w') as f_out:
        for line in f_in:
            try:
                data = json.loads(line)
                user_prompt = data.get('user_prompt', '')
                ai_responses = data.get('ai_responses', [])
                tool_executions = data.get('tool_executions', [])

                # For simplicity, we'll take the last AI response as the output
                output = ai_responses[-1] if ai_responses else ''

                # We'll format the tool executions as a string for the input
                input_str = '\n'.join([f"{te['tool_call']}\n{te['tool_output']}" for te in tool_executions])

                formatted_obj = {
                    "instruction": user_prompt,
                    "input": input_str,
                    "output": output
                }

                f_out.write(json.dumps(formatted_obj) + '\n')
            except json.JSONDecodeError:
                print(f"Skipping invalid JSON line: {line.strip()}")

if __name__ == '__main__':
    format_data('agent_interactions.jsonl', 'formatted_data.jsonl')
