
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

if $DO_BACKUP; then
  BACKUP_DIR="./backups"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

  echo "[Backup] jellyfin-config..."
  tar czf "$BACKUP_DIR/jellyfin-config-$TIMESTAMP.tar.gz" -C ./config/jellyfin .

  echo "[Backup] transmission-config..."
  tar czf "$BACKUP_DIR/transmission-config-$TIMESTAMP.tar.gz" -C ./config/transmission .

  echo "[Backup] wishlist/banlist..."
  tar czf "$BACKUP_DIR/shitflix-txts-$TIMESTAMP.tar.gz" -C ./scripts/txts .

  # Prune: keep only 1 newest of each type
  echo "[Backup] Pruning old backups (keeping 1 per type)..."
  for prefix in jellyfin-config transmission-config shitflix-txts; do
    ls -t "$BACKUP_DIR/${prefix}"-*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm
  done
fi

docker compose pull
docker compose down

# Configs now in ./config/ bind mounts — scripts come from image
docker images -q --filter "reference=shitflix-torrent-client*" | xargs -r docker rmi

docker compose up --build --force-recreate --remove-orphans -d
