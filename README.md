## Shitflix

Media server automation, for automatically downloading what is trending.
 - **TMDB** to get trending movies and TV shows
 - **Filelist.io** for sailing the high seas
 - **Jellyfin** to manage your media library

#### How it works 
    - A cron job runs every night at 3.am (can be changed to any time)
        to fetch the trending movies from TMDB
    - These are added to a wishlist filelist
    - The wishlist is checked against the Filelist.io API
    - If a match is found, the torrent is downloaded to the specified directory
    - Jellyfin monitors this directory and adds new content to your library

#### Features
    - Automatically fetches trending movies and TV shows from TMDB
    - Adds them to a wishlist on Filelist.io
    - Dashboard for manual downloading of torrent, managing wishlist and banlist
    - Transmission torrent client web UI for managing torrents
    - Jellyfin media server for managing and streaming your media library
    - Optional hardware acceleration for Jellyfin   

#### Requirements
 - A server running Docker
 - A Filelist.io account with API access
 - A TMDB API key (optional, but highly recommended). If you don't provide one,
you'll need to manage the wishlist manually.

#### Installation
 ```bash
 1. Run install script & follow the prompts:
 curl -s https://raw.githubusercontent.com/Luci0/shitflix/master/install.sh -o ./shitflix_installer.sh \
 && chmod +x shitflix_installer.sh \
 && ./shitflix_installer.sh; EXIT_CODE=$? \
 && rm shitflix_installer.sh 
 
 2. Configure jellifyn:
 Access jellyfin web UI at http://localhost:8096 or http://YOUR_SERVER_IP:8096
    Follow the setup wizard to create an admin account and set up your media libraries.

 3. Visit the shitflix dashboard:
    Access the dashboard at http://localhost:7069 or http://YOUR_SERVER_IP:7069
 
 4. (Optional) Enable hardware acceleration for jellyfin:
    See instructions below.
 
 ```


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