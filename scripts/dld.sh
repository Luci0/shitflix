#!/bin/sh

xecute=0
usage()
{
  cat <<EOF
Usage: $0 -q <name> [options]
Options:
  -q <name>          : Name of the movie or show to search for (required).
  -Q <extra_search>  : Additional search query to filter results.
  -m                 : Set download directory to movies. ($DOWNLOADS_DIR/movies)
  -s                 : Set download directory to shows. ($DOWNLOADS_DIR/shows)
  -x                 : Execute the download of the best result.
  -d                 : Enable debug mode. Add it first if used with -f.
  -f <path>          : Path to the .env file to source.
EOF
}
debug_echo()
{
  if [ "$debugMode" = "1" ]; then
    echo "DEBUG: $*"
  fi
}

while getopts "dmsxQ:q:f:" flag; do
 case $flag in
   d)
    debugMode=1
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

if [ -z "$extraSearch" ]
then
  extraSearch=$movieName
fi

if [ -z "$movieName" ]
then
  echo "No movie name to search for";
  usage;
  exit 1;
fi

script_dir=$(dirname -- "$0")
debug_echo "Script dir is $script_dir"

if [ -z "$env_file" ]; then
  default_env_file="$script_dir/../.env"
  if [ -f "$default_env_file" ]; then
    set -a
    . "$default_env_file"
    set +a
    debug_echo "Sourced default .env file from $(realpath $default_env_file)"
  fi
fi

#auto load secrets from secrets folder
PASSKEY=$(tr -d '\n' < "$script_dir/../secrets/filelist-api-key.txt")

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
        echo "$raw_result";
        echo 'Exiting';
	exit 1;
fi

api_result=$(echo "$raw_result" | jq 'sort_by(.size)
| .[]
| select (.category == "Filme HD-RO" or .category == "Filme HD" or .category == "Seriale HD" or .category == "Seriale HD-RO")
| {name, seeders, download_link, size, imdb, category, sizeInGb: (.size/1073741824)}')

api_result=$(echo "$api_result" | jq --arg extraSearch "$extraSearch" --arg movieName "$movieName" 'select(.name | ascii_downcase | contains($extraSearch)) | select(.name | test("^" + $movieName + "\\b"; "i"))')

api_result=$(echo "$api_result" | jq -s)

zacnt=$(echo "$api_result" | jq 'length')

debug_echo "Found $zacnt results for $movieName with extra search $extraSearch"

echo "$api_result"

if [ "$zacnt" -lt 10 ] && [  "$zacnt" -gt 0 ] && [ "$xecute" -eq 1 ];then

    if [ -z "$saveDir" ]
    then
      echo "No -m or -s provided!";
      exit 1;
    fi

    now=$(date)
    link=$(echo "$api_result" | jq -rs '.[] .[0] | .download_link' )
    echo "Starting download of $link"
    echo "$now Downloading $movieName $link" >> "$script_dir/.."/transmission.log
    transmission-remote -a "$link" -w "$saveDir" >> "$script_dir/.."/transmission.log
fi