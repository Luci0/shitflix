#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")
LOG_FILE="$script_dir/logs/crons.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "No runs recorded yet. Log file not found: $LOG_FILE"
  exit 0
fi

# Check if file has any content
if [ ! -s "$LOG_FILE" ]; then
  echo "No runs recorded yet. Log file is empty."
  exit 0
fi

# Find the last === RUN line and extract everything after it
last_run_line=$(grep -n "^=== RUN " "$LOG_FILE" | tail -1 | cut -d: -f1)

if [ -z "$last_run_line" ]; then
  echo "No run entries found in log."
  exit 0
fi

# Extract the timestamp from the RUN header
run_header=$(sed -n "${last_run_line}p" "$LOG_FILE")
run_timestamp=$(echo "$run_header" | sed 's/^=== RUN \(.*\) ===$/\1/')

# Extract all lines after the last RUN header
total_lines=$(wc -l < "$LOG_FILE")
tail_count=$((total_lines - last_run_line))
run_content=$(tail -n "$tail_count" "$LOG_FILE")

# Initialize counters and arrays
added_count=0
downloaded_count=0
removed_count=0
skipped_count=0

added_list=""
downloaded_list=""
removed_list=""

# Parse each line by prefix
echo "$run_content" | while IFS= read -r line; do
  case "$line" in
    ADDED\ *)
      added_count=$((added_count + 1))
      added_list="${added_list}  - $(echo "$line" | sed 's/^ADDED //')\n"
      ;;
    DOWNLOADED\ *)
      downloaded_count=$((downloaded_count + 1))
      downloaded_list="${downloaded_list}  - $(echo "$line" | sed 's/^DOWNLOADED //')\n"
      ;;
    REMOVED\ *)
      removed_count=$((removed_count + 1))
      removed_list="${removed_list}  - $(echo "$line" | sed 's/^REMOVED //')\n"
      ;;
  esac
done

# Re-parse with a temp file approach since while | while loses variables
tmpfile=$(mktemp)
echo "$run_content" > "$tmpfile"

added_count=0
downloaded_count=0
removed_count=0
skipped_count=0

added_file=$(mktemp)
downloaded_file=$(mktemp)
removed_file=$(mktemp)

while IFS= read -r line; do
  case "$line" in
    ADDED\ *)
      added_count=$((added_count + 1))
      echo "$line" | sed 's/^ADDED //' >> "$added_file"
      ;;
    DOWNLOADED\ *)
      downloaded_count=$((downloaded_count + 1))
      echo "$line" | sed 's/^DOWNLOADED //' >> "$downloaded_file"
      ;;
    REMOVED\ *)
      removed_count=$((removed_count + 1))
      echo "$line" | sed 's/^REMOVED //' >> "$removed_file"
      ;;
  esac
done < "$tmpfile"

# Print report
echo "================================================"
echo "  SHITFLIX LAST RUN REPORT"
echo "================================================"
echo ""
echo "Run timestamp: $run_timestamp"
echo ""

echo "--- ADDED TO WISHLIST ($added_count) ---"
if [ "$added_count" -gt 0 ]; then
  while IFS= read -r item; do
    echo "  + $item"
  done < "$added_file"
else
  echo "  (none)"
fi
echo ""

echo "--- DOWNLOADED ($downloaded_count) ---"
if [ "$downloaded_count" -gt 0 ]; then
  while IFS= read -r item; do
    echo "  * $item"
  done < "$downloaded_file"
else
  echo "  (none)"
fi
echo ""

echo "--- REMOVED (3-month cutoff) ($removed_count) ---"
if [ "$removed_count" -gt 0 ]; then
  while IFS= read -r item; do
    echo "  - $item"
  done < "$removed_file"
else
  echo "  (none)"
fi
echo ""

echo "================================================"

# Cleanup
rm -f "$tmpfile" "$added_file" "$downloaded_file" "$removed_file"
