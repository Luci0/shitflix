#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")

# Input file
INPUT_FILE="$script_dir/txts/wishlist.txt"

# Check if the file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo "Wishlist file not found!"
    exit 1
fi

# Temporary file to store filtered results
TEMP_FILE="$script_dir/txts/for_cleanup_wishlist.txt"

CUTOFF_DATE_STR="${WISHLIST_CLEANUP_CUTOFF_DATE_STR:-3 months ago}"
CUTOFF_DATE=$(date -d "$CUTOFF_DATE_STR" +%s)
CUTOFF_DATE_FMT=$(date -d "$CUTOFF_DATE_STR" +%F)

echo "CUTOFF_DATE is $CUTOFF_DATE_FMT"

# Set a trap to clean up the temp file on script exit (error, interrupt, etc.)
trap 'rm -f "$TEMP_FILE"; exit 1' INT TERM EXIT

# Read the file line by line
while IFS= read -r line; do
    # Extract the date (assumed to be the 4th field)
    line_date=$(echo "$line" | awk '{print $4}')

    # Convert line date to seconds since epoch
    if echo "$line_date" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
        line_date_epoch=$(date -d "$line_date" +%s 2>/dev/null)

        # If conversion fails, keep the line
        if [ -z "$line_date_epoch" ]; then
            echo "$line" >> "$TEMP_FILE"
            continue
        fi

        # Compare dates
        if [ "$line_date_epoch" -ge "$CUTOFF_DATE" ]; then
            echo "$line" >> "$TEMP_FILE"
        else
	   echo "$line was removed due to being older than $CUTOFF_DATE_FMT"
        fi
    else
        # If date format is invalid, keep the line
        echo "$line" >> "$TEMP_FILE"
    fi
done < "$INPUT_FILE"

# Replace original file with filtered contents
mv "$TEMP_FILE" "$INPUT_FILE"

echo "Old entries removed. $INPUT_FILE File cleaned."

# Disable the trap for a clean exit, preventing the exit 1 from the trap.
trap - INT TERM EXIT