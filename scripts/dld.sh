#!/bin/sh

xecute=0
script_dir=$(dirname -- "$0")

if [ -z "$env_file" ]; then
  default_env_file="$script_dir/../.env"
  if [ -f "$default_env_file" ]; then
    set -a
    # shellcheck source=/dev/null
    . "$default_env_file"
    set +a
    SOURCED_DEFAULT="Sourced default .env file from $(realpath "$default_env_file")"
  fi
fi
usage()
{
  cat <<EOF
Usage: $0 -q <title> [options]
ENV Variables:
  FL_USERNAME              : Filelist username (required).
  DOWNLOADS_DIR            : Base download directory (required).
  FL_RESULTS_MAX_THRESHOLD : Maximum number of results allowed to auto-download (optional) (default: 10).
Options:
  -q <title>         : Title of the movie or show to search for (required). This is the actual search term passed to the api.
  -Q <extra_search>  : Additional search query to filter results. (One may filter by quality here, like 1080, 4k, etc ...)
  -c <codec_search>  : Similar to -Q, but for codec specific searches. (264, 265, etc ...)
  -m                 : Set download directory to movies. ($DOWNLOADS_DIR/movies)
  -s                 : Set download directory to shows. ($DOWNLOADS_DIR/shows)
  -x                 : Execute the download of the best result. (Requires -m or -s to be set). The best result is the
                        smallest file that matches the search criteria.
  -d                 : Enable debug mode.
  -f <path>          : Path to the .env file to source.
EOF
}
debug_echo()
{
  if [ "$debugMode" = "1" ]; then
    echo "DEBUG: $*"
  fi
}

while getopts "dmsxQ:q:f:c:" flag; do
 case $flag in
   d)
    debugMode=1
    if [ -z "$SOURCED_DEFAULT" ]; then
      :
    else
      debug_echo "$SOURCED_DEFAULT"
    fi
   ;;
   f)
    # Check if file exists at the provided path first
    if [ -f "${OPTARG}" ]; then
      env_file=$(realpath "${OPTARG}")
      debug_echo "Sourcing .env file from $env_file"
      set -a
      # shellcheck source=/dev/null
      . "$env_file"
      set +a
    else
      env_file=$(realpath "${OPTARG}")
      echo "Error: .env file not found at ${env_file}" >&2
      exit 1
    fi
   ;;
   q)
    movieName=$(echo ${OPTARG} | tr '[:upper:]' '[:lower:]')
   ;;
   x)
    xecute=1
   ;;
   Q)
    extraSearch=$(echo ${OPTARG} | tr '[:upper:]' '[:lower:]')
   ;;
   c)
       codecSearch=$(echo ${OPTARG} | tr '[:upper:]' '[:lower:]')
   ;;
   m)
    if [ -n "$saveDir" ]; then
      echo "Error: -m and -s are mutually exclusive." >&2
      usage
      exit 1
    fi
    saveDir="$DOWNLOADS_DIR"/movies;
   ;;
   s)
    if [ -n "$saveDir" ]; then
      echo "Error: -m and -s are mutually exclusive." >&2
      usage
      exit 1
    fi
    saveDir="$DOWNLOADS_DIR"/shows;
   ;;
   \?)
    echo 'Invalid option: -'"$OPTARG";
    usage;
   ;;
 esac
done

if [ -z "$movieName" ]
then
  echo "No movie name to search for";
  usage;
  exit 1;
fi

debug_echo "Script dir is $(realpath "$script_dir")"
debug_echo "USING DOWNLOADS_DIR: $DOWNLOADS_DIR"

#auto load secrets from secrets folder
secrets_file="$script_dir/../secrets/filelist-api-key.txt"
if [ -f "$secrets_file" ]; then
    PASSKEY=$(tr -d '\n' < "$secrets_file")
fi

#using docker secrets
if [ -z "$PASSKEY" ]; then
  PASSKEY=$(tr -d '\n' < /run/secrets/filelist-api-key)
fi
debug_echo "Using FL_USERNAME: $FL_USERNAME"
debug_echo "Using PASSKEY: $PASSKEY"

raw_result=$(curl -s "https://filelist.io/api.php?username=$FL_USERNAME&passkey=$PASSKEY&action=search-torrents&type=name&query=$movieName")

error_result=$(echo "$raw_result" | jq '.error' 2>/dev/null)

if [ -z "$error_result" ] || [ "$error_result" = "null" ];
then
	:
else
        echo "$raw_result" >&2
        echo 'Exiting' >&2
	exit 1;
fi

api_result=$(echo "$raw_result" | jq 'sort_by(.size)
| .[]
| select (.category == "Filme HD-RO" or .category == "Filme HD" or .category == "Seriale HD" or .category == "Seriale HD-RO")
| {name, seeders, download_link, size, imdb, category, sizeInGb: (.size/1073741824)}')

# Escape special regex characters from the movie name
escapedMovieName=$(echo "$movieName" | sed -e 's/[][\\.*^$(){}?+|]/\\&/g')

api_result=$(echo "$api_result" | jq --arg movieName "$escapedMovieName" 'select(.name | test("^" + $movieName + "\\b"; "i"))')

if [ -z "$extraSearch" ]; then
  :
else
  api_result=$(echo "$api_result" | jq --arg extraSearch "$extraSearch" 'select(.name | ascii_downcase | contains($extraSearch))')
fi

if [ -z "$codecSearch" ]; then
  :
else
  api_result=$(echo "$api_result" | jq --arg codecSearch "$codecSearch" 'select(.name | ascii_downcase | contains($codecSearch))')
fi

api_result=$(echo "$api_result" | jq -s)

zacnt=$(echo "$api_result" | jq 'length')

debug_echo "Found $zacnt results for $movieName"

echo "$api_result"

threshold=${FL_RESULTS_MAX_THRESHOLD:-10}

if [ "$zacnt" -gt "$threshold" ] && [ "$xecute" -eq 1 ];then
  echo ''
  echo "Error: More than $threshold results found for $movieName.
These is a big chance that you download something else than what you wanted.
If you really want to download something from these results, increase the value of FL_RESULTS_MAX_THRESHOLD.
Refine your search criteria before downloading." >&2
  exit 1;
fi

if [  "$zacnt" -gt 0 ] && [ "$xecute" -eq 1 ];then

    if [ -z "$saveDir" ]
    then
      echo "Error: -x passed but no -m or -s provided!" >&2
      exit 1;
    fi
    debug_echo "Downloading to $saveDir"

    now=$(date)
    link=$(echo "$api_result" | jq -rs '.[] .[0] | .download_link' )
    echo "Starting download of $link"
    echo "$now Downloading $movieName $link" >> "$script_dir/.."/transmission.log
    transmission-remote -a "$link" -w "$saveDir" >> "$script_dir/.."/transmission.log
fi