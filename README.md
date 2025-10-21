## Shitflix

Media server automation, for automatically downloading what is trending.
 - **TMDB** to get trending movies and TV shows
 - **Filelist.io** for sailing the high seas
 - **Jellyfin** to manage your media library

#### Requirements
 - A server running Docker
 - A Filelist.io account with API access
 - A TMDB API key

#### Installation
 - Clone this repository

#### Enabling Hardware acceleration
To enable hardware acceleration, you need to modify the `docker-compose.yaml` file to pass through 
your gpu device to the container.

Instructions for different gpu types can be found here:
https://github.com/linuxserver/docker-jellyfin?tab=readme-ov-file#hardware-acceleration

For nvidia gpus you need to have nvidia-container-toolkit installed on your host machine. <br>
Nvidia official guide: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

Finally, uncomment this section in the `docker-compose.yml` file:
```yaml
        # ...
        # Configuration for GPU passthrough
            deploy:
              resources:
                reservations:
                  devices:
                    - capabilities: [gpu]
```
### Adding other directories to jellyfin
To add other directories to jellyfin, you need to modify the `docker-compose.yaml` file
and add additional volume mounts under the `jellyfin` service.

Example:
```yaml
    volumes:
      # Named volumes for persistent configuration and cache data
      - jellyfin-config:/config
      - jellyfin-cache:/cache

      # Bind mounts for media libraries (Source:Target)
      - ${DOWNLOADS_DIR}/shows:/shows
      - ${DOWNLOADS_DIR}/movies:/movies
      
      # New directories can be added here
      - /path/to/your/media:/media
      - /another/path/to/media:/moremedia
```