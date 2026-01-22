#!/usr/bin/env bash
# add-issues-to-project.sh - Bulk add existing issues to GitHub Project
#
# Usage:
#   ./scripts/add-issues-to-project.sh PROJECT_NUMBER
#
# Example:
#   ./scripts/add-issues-to-project.sh 1
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

echo "Adding all open issues from $ORG/$REPO to project #$PROJECT_NUMBER..."
echo ""

# Get project ID
echo "Getting project ID..."
PROJECT_ID=$(gh api graphql -f query='
  query($user: String!, $number: Int!) {
    user(login: $user) {
      projectV2(number: $number) {
        id
      }
    }
  }
' -f user="$ORG" -F number="$PROJECT_NUMBER" --jq '.data.user.projectV2.id')

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: Could not find project #$PROJECT_NUMBER"
  exit 1
fi

echo "Project ID: $PROJECT_ID"
echo ""

# Get all open issues
echo "Fetching open issues..."
ISSUES=$(gh issue list --repo "$ORG/$REPO" --state open --limit 200 --json number,title,labels,id)
ISSUE_COUNT=$(echo "$ISSUES" | jq 'length')

echo "Found $ISSUE_COUNT open issues"
echo ""

# Add each issue to the project
echo "$ISSUES" | jq -c '.[]' | while read -r issue; do
  ISSUE_NUM=$(echo "$issue" | jq -r '.number')
  ISSUE_TITLE=$(echo "$issue" | jq -r '.title' | cut -c1-50)
  ISSUE_NODE_ID=$(echo "$issue" | jq -r '.id')
  LABELS=$(echo "$issue" | jq -r '.labels[].name' | tr '\n' ',' | sed 's/,$//')

  echo -n "Adding #$ISSUE_NUM: $ISSUE_TITLE... "

  # Add to project
  ITEM_ID=$(gh api graphql -f query='
    mutation($project: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $project, contentId: $contentId}) {
        item {
          id
        }
      }
    }
  ' -f project="$PROJECT_ID" -f contentId="$ISSUE_NODE_ID" --jq '.data.addProjectV2ItemById.item.id' 2>/dev/null || echo "")

  if [[ -n "$ITEM_ID" ]]; then
    echo "✓ (labels: $LABELS)"
  else
    echo "already in project or error"
  fi
done

echo ""
echo "Done! All issues have been added to the project."
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/users/$ORG/projects/$PROJECT_NUMBER"
echo "2. Set up project fields (Target, Phase, Effort) if not already done"
echo "3. Run the label-based field update script (optional)"
