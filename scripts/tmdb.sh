#!/bin/sh

script_dir=$(realpath "$(dirname -- "$0")")

#auto load secrets from secrets folder
secrets_file="$script_dir/../secrets/tmdb-api-key.txt"
if [ -f "$secrets_file" ]; then
    TMDB_APIKEY=$(tr -d '\n' < "$secrets_file")
fi

#using docker secrets
if [ -z "$TMDB_APIKEY" ]; then
  TMDB_APIKEY=$(tr -d '\n' < /run/secrets/tmdb-api-key)
fi


apiRespTrend=$(curl -s "https://api.themoviedb.org/3/trending/movie/week?api_key=$TMDB_APIKEY")
apiRespTrendDay=$(curl -s "https://api.themoviedb.org/3/trending/movie/day?api_key=$TMDB_APIKEY")
apiResp=$(curl -s "https://api.themoviedb.org/3/movie/upcoming?api_key=$TMDB_APIKEY")
apiRespPop=$(curl -s "https://api.themoviedb.org/3/movie/popular?api_key=$TMDB_APIKEY")

titles=$(echo "$apiResp $apiRespTrend $apiRespTrendDay $apiRespPop" | jq -s '.[]
| .results[] | {title, release_date, popularity, vote_average, vote_count, year:.release_date
| split("-")[0] | tonumber}' | jq '.title |= gsub(" |:|-"; ".") | .title |= gsub("\\.\\." ; ".")')

titles=$(echo "$titles" | jq '.title |= if type == "string" then gsub("[\"\\/!@#\\$%\\^*(){}]" ; "") | gsub("\\.\\." ; ".") else . end')

echo "$titles"