
DO_BACKUP=false

while getopts "b" opt; do
  case $opt in
    b) DO_BACKUP=true ;;
    *) echo "Usage: $0 [-b]" >&2; exit 1 ;;
  esac
done

git pull
git reset --hard origin/my-raspberry
git pull

## Backup wishlist and banlist to main server outside docker container
docker cp transmission:/shitflix/scripts/txts/wishlist.txt ./scripts/txts/wishlist.txt
docker cp transmission:/shitflix/scripts/txts/banlist.txt ./scripts/txts/banlist.txt

if $DO_BACKUP; then
  ## Backup docker volumes
  BACKUP_DIR="./backups/jellyfin"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

  echo "[Backup] jellyfin-config..."
  docker run --rm \
    -v shitflix_jellyfin-config:/source \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    alpine tar czf "/backup/jellyfin-config-$TIMESTAMP.tar.gz" -C /source .

  #echo "[Backup] jellyfin-cache..."
  #docker run --rm \
  #  -v shitflix_jellyfin-cache:/source \
  #  -v "$(pwd)/$BACKUP_DIR:/backup" \
  #  alpine tar czf "/backup/jellyfin-cache-$TIMESTAMP.tar.gz" -C /source .

  echo "[Backup] transmission-config..."
  docker run --rm \
    -v shitflix_transmission-config:/source \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    alpine tar czf "/backup/transmission-config-$TIMESTAMP.tar.gz" -C /source .

  # Prune: keep only 1 newest of each type
  echo "[Backup] Pruning old backups (keeping 1 per type)..."
  for prefix in jellyfin-config jellyfin-cache transmission-config; do
    ls -t "$BACKUP_DIR/${prefix}"-*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm
  done
fi

docker compose pull
docker compose down

docker volume rm shitflix_shitflix
docker images -q --filter "reference=shitflix-torrent-client*" | xargs -r docker rmi

docker compose up --build --force-recreate --remove-orphans -d
