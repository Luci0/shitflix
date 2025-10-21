#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")

# Check if a filename is provided as an argument
if [ $# -eq 0 ]; then
    echo "Usage: $0 wishlisht filepath"
    exit 1
fi

# File to be read
file="$1"

# Check if the file exists
if [ ! -f "$file" ]; then
    echo "Wishlist file not found!"
    exit 1
fi

# Create a temporary file to store the updated wishlist
temp_file=$(mktemp)

# Set a trap to clean up the temp file on script exit (error, interrupt, etc.)
# and prevent overwriting the original file.
trap 'rm -f "$temp_file"; exit 1' INT TERM EXIT

now=$(date)
hash=$(cksum "$file")
echo '=================================================================' >> "$script_dir/logs/crons.log"

echo "$now - $hash" >> "$script_dir/logs/crons.log"

# Read the file line by line
while IFS= read -r line || [ -n "$line" ];
do
    # Process each line here
    # shellcheck disable=SC2086
    set -- $line
    type="$1"
    shift
    query="$1"
    shift
    quality="$1"

    echo "Processing: $query $quality"
    echo "Processing: $query" >> "$script_dir/logs/crons.log"
    result=$("$script_dir/dld.sh" -q "$query" -Q "$quality")

    sleep 1s;

    resultCount=$(echo "${result}" | jq 'length')
    resultCount=${resultCount:-0}

    echo "Found $resultCount results for $query $quality"
    echo "$resultCount $query" >> "$script_dir/logs/crons.log"

    if [ "$resultCount" -lt 10 ] && [ "$resultCount" -gt 0 ]; then
      "$script_dir/dld.sh" "-$type" -x -q "$query" -Q "$quality" > /dev/null
      echo 'Download added. Removing from wishlist & adding to banlist.'
      echo "$line" >> "$script_dir/txts/banlist.txt"
      "$script_dir/remove-duplicates.sh" "$script_dir/txts/banlist.txt"
    else
      # If the item is not processed, keep it in the wishlist
      echo "$line" >> "$temp_file"
    fi

    echo '------------------------------------'
done < "$file"

# If the loop completes successfully, replace the original file.
mv "$temp_file" "$file"

# Disable the trap for a clean exit, preventing the exit 1 from the trap.
trap - INT TERM EXIT
