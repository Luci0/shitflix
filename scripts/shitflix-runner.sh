#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")

"$script_dir/generate-wishlist.sh"
echo ''
"$script_dir/wishlist-processor.sh" "$script_dir/txts/wishlist.txt"
