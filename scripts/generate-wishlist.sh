#!/bin/sh

usage()
{
  cat <<EOF

Creates a wishlist of movies to download based on TMDB data.
It will append to an existing wishlist.
See ./txts/wishlist.txt file.

Usage: $0

ENV Variables:
  TMDB_MIN_VOTE_AVERAGE  : Minimum vote average to consider a movie (optional) (default: 6.1)
                           If a movie has a vote average below this value, it will be ignored.
  TMDB_MAX_YEARS_OLD     : How old a movie can be to be considered (optional) (default: 2)
  WISHLIST_VIDEO_QUALITY : What movie quality to be considered (optional) (default: 1080)

Options:
  -h : Show this help message.
EOF
}
while getopts "h" flag; do
 case $flag in
   h)
     usage;
     exit 0;
   ;;
   \?)
    usage;
    exit 1;
   ;;
 esac
done

script_dir=$(realpath "$(dirname -- "$0")")

TEMP_TWISH=$script_dir/txts/temp_twish.txt
TWISH=$script_dir/txts/wishlist.txt

[ ! -f "$script_dir/txts/temp_twish.txt" ] && touch "$script_dir/txts/temp_twish.txt"
[ ! -f "$script_dir/txts/wishlist.txt" ] && touch "$script_dir/txts/wishlist.txt"
[ ! -f "$script_dir/txts/banlist.txt" ] && touch "$script_dir/txts/banlist.txt"

crtyear=$(date +%Y)
echo "min release year is $crtyear"

minVoteAverage=${TMDB_MIN_VOTE_AVERAGE:-6.1}
maxYearsOld=${TMDB_MAX_YEARS_OLD:-2}
videoQuality=${WISHLIST_VIDEO_QUALITY:-1080}

"$script_dir/tmdb.sh" \
| jq --arg CRT_YEAR "$crtyear" --arg MIN_VOTE_AVERAGE "$minVoteAverage" --arg MAX_YEARS_OLD "$maxYearsOld" \
'select(
  (.vote_average > ($MIN_VOTE_AVERAGE|tonumber)) and
  (.vote_count > 1) and
  (.year > (($CRT_YEAR|tonumber)-($MAX_YEARS_OLD|tonumber)))
)' \
| jq -r --arg CRT_DATE "$(date +%F)" --arg VIDEO_QUALITY "$videoQuality" \
'("m  "  + .title + "." + (.year|tostring) + "  " + $VIDEO_QUALITY + "  " + $CRT_DATE)' > "$TEMP_TWISH"


alreadyDownloaded() {
  linez="$1"
  set -- $linez
  title="$2"
  inBanlistCnt=$(grep -w "$title" "$script_dir/txts/banlist.txt" | wc -l)
  inWishlistCnt=$(grep -w "$title" "$script_dir/txts/wishlist.txt" | wc -l)
  max=$([ "$inBanlistCnt" -gt "$inWishlistCnt" ] && echo "$inBanlistCnt" || echo "$inWishlistCnt")
  echo "$max"
}

"$script_dir/remove-duplicates.sh" "$TEMP_TWISH"

while IFS= read -r line
do
  line=$(echo "$line" | tr -d '\047') #unquote names
  cnt=$(alreadyDownloaded "$line")
  if [ "$cnt" -gt 0 ]; then
	echo "$line already found in wishlist or banlist $cnt"
  fi
  if [ "$cnt" -eq 0 ]; then
	echo "Added $line to wishlist $TWISH"
  	echo "$line" >> "$TWISH"
  fi
done < "$TEMP_TWISH"

"$script_dir/remove-duplicates.sh" "$TWISH"
rm -f "$TEMP_TWISH"