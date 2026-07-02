#!/bin/sh
# Stop and remove the existing container
docker compose down

# Remove the existing image
docker images -q --filter "reference=shitflix-torrent-client*" | xargs -r docker rmi
docker images -q --filter "reference=jellyfin/jellyfin" | xargs -r docker rmi

#Remove the volumes
docker volume rm shitflix_jellyfin-cache

# Bind mount dirs at ./config/ and ./scripts/txts can be removed manually:
# rm -rf ./config/transmission ./config/jellyfin