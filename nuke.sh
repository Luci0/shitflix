#!/bin/sh
# Stop and remove the existing container
docker compose down torrent-client

# Remove the existing image
docker images -q --filter "reference=shitflix-torrent-client*" | xargs -r docker rmi

#Remove the volumes
docker volume rm shitflix_transmission-config
docker volume rm shitflix_shitflix

#docker volume rm shitflix_jellyfin-config
#docker volume rm shitflix_jellyfin-cache

# Rebuild and start the service
docker compose up --build --force-recreate torrent-client
