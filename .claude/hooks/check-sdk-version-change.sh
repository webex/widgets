#!/bin/bash
# PostToolUse hook: Detect SDK version changes in package.json files
# When a Write/Edit modifies a package.json that contains @webex/contact-center,
# remind the developer to run /sync-sdk.

# Read tool input from stdin
INPUT=$(cat)

# Extract the file path from the tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // empty' 2>/dev/null)

# Only care about package.json files
if [[ "$FILE_PATH" != *"package.json" ]]; then
  exit 0
fi

# Check if this package.json has an SDK dependency
if grep -q "@webex/contact-center" "$FILE_PATH" 2>/dev/null; then
  # Check if the SDK version line was part of the change
  # Use git diff to see if the version actually changed
  SDK_CHANGED=$(git diff --no-index /dev/null "$FILE_PATH" 2>/dev/null | grep -c "@webex/contact-center" || true)

  if [ "$SDK_CHANGED" -gt 0 ]; then
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"SDK dependency @webex/contact-center detected in modified package.json. Remind the developer: Run /sync-sdk to check for breaking changes and regenerate the dependency map."}}'
    exit 0
  fi
fi

exit 0
