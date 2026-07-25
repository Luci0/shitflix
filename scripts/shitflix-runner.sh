#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")

: > "$script_dir/logs/crons.log"
: > "$script_dir/logs/transmission.log"
echo "=== RUN $(date +%F_%H:%M:%S) ===" >> "$script_dir/logs/crons.log"

"$script_dir/generate-wishlist.sh"
echo ''
"$script_dir/wishlist-processor.sh" "$script_dir/txts/wishlist.txt"
