#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")

#"$script_dir/generate-wishlist.sh"

"$script_dir/wishlist-processor.sh" "$script_dir/txts/wishlist.txt"
