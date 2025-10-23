## Shitflix

Media server automation, for automagically downloading what is trending.
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
    - Automatically fetches trending movies and TV shows from TMDB, and adds them to a wishlist.txt file.
    - Dashboard for manual downloading of torrent, managing wishlist and banlist
    - Transmission torrent client web UI for managing torrents
    - Jellyfin media server for managing and streaming your media library

#### Requirements
 - A server running Docker
 - A Filelist.io account with API access
 - A TMDB API key (optional, but highly recommended). If you don't provide one,
you'll need to manage the wishlist manually. <br> 
Sign up for a free account at https://www.themoviedb.org/. <br>
See video for instructions: https://www.youtube.com/watch?v=Gf45f5cW6c4&t=329s

#### Installation
 
 1. Run install script & follow the prompts:
```bash
 curl -s https://raw.githubusercontent.com/Luci0/shitflix/refs/heads/master/install.sh -o ./shitflix_installer.sh \
 && chmod +x shitflix_installer.sh \
 && ./shitflix_installer.sh; EXIT_CODE=$? \
 && rm shitflix_installer.sh 
 ```
 2. Configure jellifyn:
 Access jellyfin web UI at http://localhost:8096 or http://YOUR_SERVER_IP:8096
    Follow the setup wizard to create an admin account and set up your media libraries.

 3. Visit the shitflix dashboard, and do your first sync.
    Access the dashboard at http://localhost:7069 or http://YOUR_SERVER_IP:7069
 
 4. (Optional) Enable hardware acceleration for jellyfin:
    See instructions below.
 


#### FAQ
 - **Q:** I've just installed shitflix, and i have no movies to watch. Do i need to wait until 3am for the downloads? <br>
   **A:** No, can use the sync function from the dashboard to start downloading what is trending right away.<br>
   Also, you can search and download movies in the dashboard. Access the dashboard at http://localhost:7069 or http://YOUR_SERVER_IP:7069


 - **Q:** How do i monitor the download progress of my torrents? <br>
   **A:** You can monitor the progress of your downloads via the transmission web UI.<br>
   Access it at http://localhost:9091 or http://YOUR_SERVER_IP:9091


 - **Q:** Why do I need a TMDB API key? <br>
   **A:** The TMDB API key is used to automatically fetch trending movies and TV shows.
   Without it, you'll need to manually manage your wishlist.
 
   
 - **Q:** I already have a jellyfin instance, can I use that instead of the one provided here? <br>
   **A:** Yes, you can use your existing jellyfin instance. Just make sure to point it to the
   download directory specified in the `DOWNLOADS_DIR` environment variable.<br>
   Also, remove the jellyfin container for docker and the jellyfin service from `docker-compose.yaml`.

   
 - **Q:** I already am using plex (or another media server), can I use that instead of jellyfin? <br>
   **A:** Yes, you can use any media server that supports monitoring directories for new content.
   Just point it to the download directory specified in the `DOWNLOADS_DIR` environment variable.<br>
   Also, remove the jellyfin container for docker and the jellyfin service from `docker-compose.yaml`.
 
   
 - **Q:** My API key has been revoked. How do i change it? <br>
   **A:** The API keys are managed in the ./secrets folder of your shitflix installation directory.<br>
   Simply edit the filelist-api-key.txt and tmdb-api-key.txt files, and restart the docker containers.

   
 - **Q:** How do I change the download directory? <br>
   **A:** You can change the download directory by modifying the `DOWNLOADS_DIR` environment variable
   in the `.env` file.

   
 - **Q:** How do I change the cron schedule? <br>
   **A:** You can change the cron schedule by modifying the `RUNNER_CRON_SCHEDULE` environment variable
   in the `.env` file. The format is the same as standard cron syntax.

   
 - **Q:** I've manually downloaded a show in the movies directory. How do i move it to the shows directory? <br>
   **A:** You can either move the files manually, or you can use the transmission web UI to change the download location.<br>
   Transmission web UI is accessible at http://localhost:9091 or http://YOUR_SERVER_IP:9091
 
   
 - **Q:** How do I automatically download the latest season of my favourite show?<br>
   **A:** Shows are not yet supported in the automatic wishlist generation.<br>
   However, you may use the shitflix dashboard to download the show straight to the downloads directory on your server.<br>
   Make sure to the set the proper download location. <br>
   Example:
   - Southpark Season 07 should go in the Southpark directory `$DOWNLOADS_DIR/shows/Southpark`
   - Southpark Season 09 should also go in the Southpark directory `$DOWNLOADS_DIR/shows/Southpark`
   - Friends Season 01 should go in the Friends directory `$DOWNLOADS_DIR/shows/Friends`
   - etc ... <br>


 - **Q:** I have a .torrent file, how do I add it to transmission?<br>
   **Q:** You can add the .torrent file to transmission by using the web UI.<br>
   Go to http://localhost:9091 or http://YOUR_SERVER_IP:9091 and click on the "Open Torrent" button.<br>
   Select the .torrent file and choose the download location.
 
   
 - **Q:** How do I update shitflix?<br>
   **A:** To update shitflix, simply pull the latest changes from the GitHub repository and restart the docker containers.
   
#### ENV Variables

```.dotenv
################## REQUIRED ################

# Save location for completed downloads
DOWNLOADS_DIR="/home/${USER}/Downloads/shitflix"

# Temporary location of incomplete downloads
INCOMPLETE_DIR="/home/${USER}/Downloads/incomplete"

# Filelist username
FL_USERNAME="Mclovin"

# Your timezone. (This affects the cron schedule times)
# See list of valid timezones here: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
TZ="Europe/Bucharest"

# Cron schedule for wishlist processing (in cron format). Defaults to 3am daily.
RUNNER_CRON_SCHEDULE="0 3 * * *"

################## OPTIONAL ################

# Maximum number of results allowed before needing to refine search
FL_RESULTS_MAX_THRESHOLD=10

# Maximum number of years old a movie can be to be considered for download
# Example: if set to 2, only movies released in the last 2 years will be added to the wishlist
TMDB_MAX_YEARS_OLD=2

#Default video quality for wishlist generation
WISHLIST_VIDEO_QUALITY=1080

# Default cutoff date for cleaning the wishlist (relative date string)
# Example: "3 months ago", "1 months ago", "20 days ago" ... etc
# If any movie was added to the wishlist before this date, it will be removed during cleanup
# If you have a very big wishlist, the filelist API will be spammed with requests, and
# you may get temporarily banned. Setting a cutoff date helps mitigate this.
WISHLIST_CLEANUP_CUTOFF_DATE_STR="3 months ago"
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