#!/bin/sh
# Stop and remove the existing container
docker-compose down torrent-client

# Remove the existing image
docker rmi $(docker images -q --filter "reference=shitflix-v2-torrent-client*")

# Rebuild and start the service
docker-compose up --build torrent-client --force-recreate --renew-anon-volumes
