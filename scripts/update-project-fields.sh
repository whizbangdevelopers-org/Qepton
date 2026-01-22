#!/usr/bin/env bash
# update-project-fields.sh - Update project fields based on issue labels
#
# Usage:
#   ./scripts/update-project-fields.sh PROJECT_NUMBER
#
# This script updates Target, Phase, and Effort fields for all issues
# in the project based on their labels.
#
# Requires: gh CLI authenticated with 'project' scope

set -e

if [[ -z "$1" ]]; then
  echo "Usage: $0 PROJECT_NUMBER"
  echo "Example: $0 1"
  exit 1
fi

PROJECT_NUMBER="$1"
ORG="whizbangdevelopers"
REPO="Qepton-Dev"

echo "Updating project fields for all issues in project #$PROJECT_NUMBER..."
echo ""

# Get project data including field definitions
echo "Getting project structure..."
PROJECT_DATA=$(gh api graphql -f query='
  query($user: String!, $number: Int!) {
    user(login: $user) {
      projectV2(number: $number) {
        id
        fields(first: 20) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
        items(first: 100) {
          nodes {
            id
            content {
              ... on Issue {
                number
                title
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
' -f user="$ORG" -F number="$PROJECT_NUMBER")

PROJECT_ID=$(echo "$PROJECT_DATA" | jq -r '.data.user.projectV2.id')

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
  echo "Error: Could not find project #$PROJECT_NUMBER"
  exit 1
fi

echo "Project ID: $PROJECT_ID"

# Extract field IDs and options
get_field_option_id() {
  local field_name="$1"
  local option_name="$2"

  echo "$PROJECT_DATA" | jq -r --arg fname "$field_name" --arg oname "$option_name" \
    '.data.user.projectV2.fields.nodes[] | select(.name == $fname) | .options[] | select(.name == $oname) | .id'
}

get_field_id() {
  local field_name="$1"
  echo "$PROJECT_DATA" | jq -r --arg fname "$field_name" \
    '.data.user.projectV2.fields.nodes[] | select(.name == $fname) | .id'
}

# Get field IDs
TARGET_FIELD_ID=$(get_field_id "Target")
PHASE_FIELD_ID=$(get_field_id "Phase")
EFFORT_FIELD_ID=$(get_field_id "Effort")
EXTERNAL_FIELD_ID=$(get_field_id "External")

echo ""
echo "Field IDs:"
echo "  Target: $TARGET_FIELD_ID"
echo "  Phase: $PHASE_FIELD_ID"
echo "  Effort: $EFFORT_FIELD_ID"
echo "  External: $EXTERNAL_FIELD_ID"
echo ""

if [[ -z "$TARGET_FIELD_ID" || "$TARGET_FIELD_ID" == "null" ]]; then
  echo "Warning: Target field not found. Create it with options: Free, Premium, Plugin, Dev-only"
fi
if [[ -z "$PHASE_FIELD_ID" || "$PHASE_FIELD_ID" == "null" ]]; then
  echo "Warning: Phase field not found. Create it with options: 1-Foundation, 2-Marketing, 3-Features, 4-Platform, 5-Premium, 6-Plugins"
fi
if [[ -z "$EFFORT_FIELD_ID" || "$EFFORT_FIELD_ID" == "null" ]]; then
  echo "Warning: Effort field not found. Create it with options: Low, Medium, High"
fi
if [[ -z "$EXTERNAL_FIELD_ID" || "$EXTERNAL_FIELD_ID" == "null" ]]; then
  echo "Warning: External field not found. Create it with options: Yes, No"
fi

# Process each item
echo "Processing items..."
echo ""

echo "$PROJECT_DATA" | jq -c '.data.user.projectV2.items.nodes[]' | while read -r item; do
  ITEM_ID=$(echo "$item" | jq -r '.id')
  ISSUE_NUM=$(echo "$item" | jq -r '.content.number')
  ISSUE_TITLE=$(echo "$item" | jq -r '.content.title' | cut -c1-40)
  LABELS=$(echo "$item" | jq -r '.content.labels.nodes[].name' | tr '\n' ',' | sed 's/,$//')

  if [[ "$ISSUE_NUM" == "null" || -z "$ISSUE_NUM" ]]; then
    continue
  fi

  echo -n "#$ISSUE_NUM: $ISSUE_TITLE "

  # Determine Target based on labels
  TARGET_VALUE=""
  if echo "$LABELS" | grep -qi "premium"; then
    TARGET_VALUE="Premium"
  elif echo "$LABELS" | grep -qi "plugin"; then
    TARGET_VALUE="Plugin"
  elif echo "$LABELS" | grep -qi "free-infra\|from-free"; then
    TARGET_VALUE="Free"
  else
    TARGET_VALUE="Dev-only"
  fi

  # Determine Phase based on labels
  PHASE_VALUE=""
  if echo "$LABELS" | grep -qi "packaging"; then
    PHASE_VALUE="1-Foundation"
  elif echo "$LABELS" | grep -qi "marketing\|community"; then
    PHASE_VALUE="2-Marketing"
  elif echo "$LABELS" | grep -qi "premium"; then
    PHASE_VALUE="5-Premium"
  elif echo "$LABELS" | grep -qi "plugin"; then
    PHASE_VALUE="6-Plugins"
  elif echo "$LABELS" | grep -qi "testing\|ci-cd"; then
    PHASE_VALUE="4-Platform"
  else
    PHASE_VALUE="3-Features"
  fi

  # Determine Effort based on labels
  EFFORT_VALUE="Medium"
  if echo "$LABELS" | grep -qi "effort-high\|high-effort"; then
    EFFORT_VALUE="High"
  elif echo "$LABELS" | grep -qi "effort-low\|low-effort\|quick-win"; then
    EFFORT_VALUE="Low"
  fi

  # Determine External based on labels
  EXTERNAL_VALUE="No"
  if echo "$LABELS" | grep -qi "external-submission"; then
    EXTERNAL_VALUE="Yes"
  fi

  echo "-> Target:$TARGET_VALUE Phase:$PHASE_VALUE Effort:$EFFORT_VALUE External:$EXTERNAL_VALUE"

  # Update Target field
  if [[ -n "$TARGET_FIELD_ID" && "$TARGET_FIELD_ID" != "null" ]]; then
    TARGET_OPTION_ID=$(get_field_option_id "Target" "$TARGET_VALUE")
    if [[ -n "$TARGET_OPTION_ID" && "$TARGET_OPTION_ID" != "null" ]]; then
      gh api graphql -f query='
        mutation($project: ID!, $item: ID!, $field: ID!, $value: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $project, itemId: $item, fieldId: $field,
            value: { singleSelectOptionId: $value }
          }) { projectV2Item { id } }
        }
      ' -f project="$PROJECT_ID" -f item="$ITEM_ID" -f field="$TARGET_FIELD_ID" -f value="$TARGET_OPTION_ID" --silent 2>/dev/null || true
    fi
  fi

  # Update Phase field
  if [[ -n "$PHASE_FIELD_ID" && "$PHASE_FIELD_ID" != "null" ]]; then
    PHASE_OPTION_ID=$(get_field_option_id "Phase" "$PHASE_VALUE")
    if [[ -n "$PHASE_OPTION_ID" && "$PHASE_OPTION_ID" != "null" ]]; then
      gh api graphql -f query='
        mutation($project: ID!, $item: ID!, $field: ID!, $value: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $project, itemId: $item, fieldId: $field,
            value: { singleSelectOptionId: $value }
          }) { projectV2Item { id } }
        }
      ' -f project="$PROJECT_ID" -f item="$ITEM_ID" -f field="$PHASE_FIELD_ID" -f value="$PHASE_OPTION_ID" --silent 2>/dev/null || true
    fi
  fi

  # Update Effort field
  if [[ -n "$EFFORT_FIELD_ID" && "$EFFORT_FIELD_ID" != "null" ]]; then
    EFFORT_OPTION_ID=$(get_field_option_id "Effort" "$EFFORT_VALUE")
    if [[ -n "$EFFORT_OPTION_ID" && "$EFFORT_OPTION_ID" != "null" ]]; then
      gh api graphql -f query='
        mutation($project: ID!, $item: ID!, $field: ID!, $value: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $project, itemId: $item, fieldId: $field,
            value: { singleSelectOptionId: $value }
          }) { projectV2Item { id } }
        }
      ' -f project="$PROJECT_ID" -f item="$ITEM_ID" -f field="$EFFORT_FIELD_ID" -f value="$EFFORT_OPTION_ID" --silent 2>/dev/null || true
    fi
  fi

  # Update External field
  if [[ -n "$EXTERNAL_FIELD_ID" && "$EXTERNAL_FIELD_ID" != "null" ]]; then
    EXTERNAL_OPTION_ID=$(get_field_option_id "External" "$EXTERNAL_VALUE")
    if [[ -n "$EXTERNAL_OPTION_ID" && "$EXTERNAL_OPTION_ID" != "null" ]]; then
      gh api graphql -f query='
        mutation($project: ID!, $item: ID!, $field: ID!, $value: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $project, itemId: $item, fieldId: $field,
            value: { singleSelectOptionId: $value }
          }) { projectV2Item { id } }
        }
      ' -f project="$PROJECT_ID" -f item="$ITEM_ID" -f field="$EXTERNAL_FIELD_ID" -f value="$EXTERNAL_OPTION_ID" --silent 2>/dev/null || true
    fi
  fi
done

echo ""
echo "Done! Project fields have been updated based on issue labels."
