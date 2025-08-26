# Testing Plan: Learning from Past Failures

This document outlines the steps to test the agent's ability to learn from its mistakes.

## Step 1: Induce a Failure

Give the agent a goal that is guaranteed to fail in a predictable way.

**Command:**
```bash
node cli.js --goal "Write the text 'hello world' to the file 'non_existent_dir/test.txt'"
```

**Action:**
- When prompted to approve the `write_file` command, type `y` and press Enter.
- The tool will fail because the directory `non_existent_dir` does not exist.
- Exit the session.

## Step 2: Verify the Failure was Logged

Check the contents of the `failure_log.jsonl` file.

**Command:**
```bash
cat failure_log.jsonl
```

**Expected Outcome:**
The file should contain a JSON object detailing the failed goal, the tool used, and the error message.

## Step 3: Retry the Goal

Give the agent the exact same goal again.

**Command:**
```bash
node cli.js --goal "Write the text 'hello world' to the file 'non_existent_dir/test.txt'"
```

## Step 4: Observe the Agent's Behavior

On the second attempt, the agent should demonstrate that it has learned from the previous failure.

**Expected Behavior:**
1.  The agent should use the `get_past_failures` tool to search for relevant past failures.
2.  The agent should generate a new plan that addresses the root cause of the previous failure.
3.  The new plan should first create the directory `non_existent_dir` using the `create_directory` tool.
4.  The plan should then proceed to write the file to the newly created directory.

**Success Condition:**
The agent successfully writes the file without user intervention, because it learned to create the directory first.