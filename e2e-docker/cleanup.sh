#!/bin/bash

# Cleanup script for E2E test outputs
# Keeps only the last N test runs (default: 2)
# Usage: ./cleanup.sh [num_runs_to_keep]

KEEP_RUNS=${1:-2}
OUTPUT_DIR="$(dirname "$0")/output"

echo "E2E Test Output Cleanup"
echo "======================="
echo "Keeping last $KEEP_RUNS test runs"
echo ""

# Check if output directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Output directory not found: $OUTPUT_DIR"
    exit 1
fi

# Function to get disk usage
get_size() {
    du -sh "$1" 2>/dev/null | cut -f1
}

echo "Current disk usage:"
echo "  test-results: $(get_size "$OUTPUT_DIR/test-results")"
echo "  reports: $(get_size "$OUTPUT_DIR/reports")"
echo "  logs: $(get_size "$OUTPUT_DIR/logs")"
echo ""

# Clean up test-results directory
TEST_RESULTS_DIR="$OUTPUT_DIR/test-results"
if [ -d "$TEST_RESULTS_DIR" ]; then
    echo "Cleaning test-results..."

    # Get unique test runs by modification time (directories only)
    # Each test creates a directory like "auth-Authentication-should-...-chromium"
    # Group by base test name and keep only recent ones

    # First, find all test result directories sorted by modification time (newest first)
    ALL_DIRS=()
    while IFS= read -r line; do
        ALL_DIRS+=("$line")
    done < <(find "$TEST_RESULTS_DIR" -maxdepth 1 -type d -name "*-chromium*" -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)

    # Get the last run timestamp from .last-run.json if it exists
    LAST_RUN_FILE="$TEST_RESULTS_DIR/.last-run.json"

    # Count unique test run timestamps (by looking at directory modification times)
    # Group directories by their modification time (within 5 minute windows = same test run)
    declare -A RUN_TIMES
    CURRENT_RUN=0
    LAST_TIME=0

    for dir in "${ALL_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            MOD_TIME=$(stat -c %Y "$dir" 2>/dev/null || echo 0)
            # If more than 5 minutes difference, it's a new run
            if [ $LAST_TIME -eq 0 ] || [ $((LAST_TIME - MOD_TIME)) -gt 300 ]; then
                ((CURRENT_RUN++))
                LAST_TIME=$MOD_TIME
            fi
            RUN_TIMES["$dir"]=$CURRENT_RUN
        fi
    done

    echo "  Found $CURRENT_RUN test run(s)"

    # Delete directories from runs older than KEEP_RUNS
    DELETED=0
    DELETED_SIZE=0
    for dir in "${ALL_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            RUN_NUM=${RUN_TIMES["$dir"]}
            if [ "$RUN_NUM" -gt "$KEEP_RUNS" ]; then
                SIZE=$(du -sb "$dir" 2>/dev/null | cut -f1)
                DELETED_SIZE=$((DELETED_SIZE + SIZE))
                rm -rf "$dir"
                ((DELETED++))
            fi
        fi
    done

    echo "  Deleted $DELETED directories ($(numfmt --to=iec $DELETED_SIZE 2>/dev/null || echo "${DELETED_SIZE}B"))"
fi

# Clean up reports/data directory (keeps files referenced by recent reports)
REPORTS_DATA_DIR="$OUTPUT_DIR/reports/data"
if [ -d "$REPORTS_DATA_DIR" ]; then
    echo "Cleaning reports/data..."

    # Get list of files older than the oldest kept test run
    # Find the cutoff time (modification time of oldest kept directory)
    CUTOFF_TIME=$(find "$TEST_RESULTS_DIR" -maxdepth 1 -type d -name "*-chromium*" -printf '%T@\n' 2>/dev/null | sort -n | tail -n1)

    if [ -n "$CUTOFF_TIME" ]; then
        # Convert to minutes ago
        NOW=$(date +%s)
        CUTOFF_INT=${CUTOFF_TIME%.*}
        MINS_AGO=$(( (NOW - CUTOFF_INT) / 60 ))

        # Delete files older than cutoff (with some buffer)
        MINS_AGO=$((MINS_AGO + 5))

        DELETED=0
        DELETED_SIZE=0
        while IFS= read -r -d '' file; do
            SIZE=$(stat -c %s "$file" 2>/dev/null || echo 0)
            DELETED_SIZE=$((DELETED_SIZE + SIZE))
            rm -f "$file"
            ((DELETED++))
        done < <(find "$REPORTS_DATA_DIR" -type f -mmin +$MINS_AGO -print0 2>/dev/null)

        echo "  Deleted $DELETED files ($(numfmt --to=iec $DELETED_SIZE 2>/dev/null || echo "${DELETED_SIZE}B"))"
    fi
fi

# Clean up old log files
LOGS_DIR="$OUTPUT_DIR/logs"
if [ -d "$LOGS_DIR" ]; then
    echo "Cleaning logs..."

    # Keep only logs from the last N runs based on file modification time
    LOG_FILES=()
    while IFS= read -r line; do
        LOG_FILES+=("$line")
    done < <(find "$LOGS_DIR" -type f -name "*.log" -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)

    # Determine which logs to keep based on test run times
    DELETED=0
    DELETED_SIZE=0

    i=0
    for file in "${LOG_FILES[@]}"; do
        if [ $i -ge $KEEP_RUNS ]; then
            if [ -f "$file" ]; then
                SIZE=$(stat -c %s "$file" 2>/dev/null || echo 0)
                DELETED_SIZE=$((DELETED_SIZE + SIZE))
                rm -f "$file"
                ((DELETED++))
            fi
        fi
        ((i++))
    done

    echo "  Deleted $DELETED log files ($(numfmt --to=iec $DELETED_SIZE 2>/dev/null || echo "${DELETED_SIZE}B"))"
fi

# Clean up trace directory
TRACE_DIR="$OUTPUT_DIR/reports/trace"
if [ -d "$TRACE_DIR" ]; then
    echo "Cleaning traces..."

    # Remove old trace files
    DELETED=0
    if [ -n "$MINS_AGO" ]; then
        while IFS= read -r -d '' file; do
            rm -rf "$file"
            ((DELETED++))
        done < <(find "$TRACE_DIR" -type f -mmin +$MINS_AGO -print0 2>/dev/null)
    fi

    echo "  Deleted $DELETED trace files"
fi

echo ""
echo "Cleanup complete!"
echo ""
echo "New disk usage:"
echo "  test-results: $(get_size "$OUTPUT_DIR/test-results")"
echo "  reports: $(get_size "$OUTPUT_DIR/reports")"
echo "  logs: $(get_size "$OUTPUT_DIR/logs")"
