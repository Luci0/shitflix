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
