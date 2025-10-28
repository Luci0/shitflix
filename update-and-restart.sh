
git reset --hard origin/my-raspberry
git pull

## Backup wishlist and banlist to main server outside docker container
docker cp transmission:/shitflix/scripts/txts/wishlist.txt ./scripts/txts/wishlist.txt
docker cp transmission:/shitflix/scripts/txts/banlist.txt ./scripts/txts/banlist.txt

docker compose down

docker volume rm shitflix_shitflix
docker images -q --filter "reference=shitflix-torrent-client*" | xargs -r docker rmi

docker compose up --build --force-recreate --remove-orphans -d
