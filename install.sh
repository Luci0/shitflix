#!/bin/bash

# Configuration
REPO_URL="https://github.com/Luci0/shitflix.git"
REPO_FOLDER="shitflix"
ENV_FILE="./.env"
SECRET_DIR="./secrets"
FILELIST_API_KEY_FILE="${SECRET_DIR}/filelist-api-key.txt"
TMDB_API_KEY_FILE="${SECRET_DIR}/tmdb-api-key.txt"

# --- Helper Functions ---

# Function to check for required dependencies
check_dependencies() {
    echo "🔍 Checking dependencies..."

    # Check for git
    if ! command -v git &> /dev/null; then
        echo "❌ Error: git is not installed."
        echo "Please install git to proceed (e.g., 'sudo apt install git' or equivalent)."
        exit 1
    fi

    # Check for docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Error: Docker is not installed."
        echo "Please install Docker and ensure your user has appropriate permissions."
        exit 1
    fi

    # Check for docker compose (v1 or v2/plugin)
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Error: Docker Compose is not installed or not available as a plugin."
        echo "Please install Docker Compose (v1) or the Docker Compose plugin (v2)."
        exit 1
    fi
    echo "✅ Dependencies (git, docker, docker compose) check passed."
}

# Function to get user input with default (RELIABLE standard method)
get_user_input() {
    local prompt="$1"
    local default_val="$2"
    local -n var_name="$3" # Nameref for reliable assignment
    local input

    # -e: enables readline command line editing (critical for -i to work)
    # -i: pre-fills the input buffer with the default value
    read -r -e -p "${prompt}: " -i "${default_val}" input

    # If the user hits Enter, $input will contain the default_val due to -i.
    # We assign the value directly.
    var_name="${input}"
}

# --- Main Script Logic ---

echo "🎬 Starting Shitflix App Installation Script"
echo "--------------------------------------------------"

check_dependencies

# 1. Checkout repo from github
if [ -d "$REPO_FOLDER" ]; then
    echo "⚠️ Repository folder '${REPO_FOLDER}' already exists."
    read -r -p "Do you want to skip checkout and use the existing folder? (y/n): " skip_checkout
    if [[ "$skip_checkout" =~ ^[Nn]$ ]]; then
        echo "Please manually remove or rename '${REPO_FOLDER}' and run the script again."
        exit 1
    fi
    echo "Skipping git checkout."
else
    echo "➡️ Cloning repository from ${REPO_URL}..."
    if ! git clone "$REPO_URL" "$REPO_FOLDER"; then
        echo "❌ Error: Failed to clone repository."
        exit 1
    fi
    echo "✅ Repository cloned successfully."
fi

# Move into the repository directory
cd "$REPO_FOLDER" || { echo "❌ Error: Failed to change directory to ${REPO_FOLDER}."; exit 1; }

# --- Get Input Values ---

echo ""
echo "⚙️ Gathering configuration details..."

# Defaults
DEFAULT_DOWNLOADS_DIR="/home/${USER}/Downloads/shitflix"
DEFAULT_FL_USERNAME="Mclovin"
DEFAULT_TZ="Europe/Bucharest"

# Get user inputs for .env file
DOWNLOADS_DIR=""
echo 'Save location for completed downloads: '
get_user_input "DOWNLOADS_DIR" "$DEFAULT_DOWNLOADS_DIR" "DOWNLOADS_DIR" "^/" "Must be an absolute path (starts with /)."


FL_USERNAME=""
echo 'Filelist username: '
get_user_input "Enter FL_USERNAME" "$DEFAULT_FL_USERNAME" "FL_USERNAME" "^[a-zA-Z0-9_]{3,}$" "Must be alphanumeric/underscore and at least 3 characters."

TZ=""
echo 'Your timezone. (This affects the cron schedule times): '
get_user_input "Enter TZ" "$DEFAULT_TZ" "TZ" "^[A-Za-z]+/[A-Za-z0-9_+-]+(?:/[A-Za-z0-9_+-]+)*$" "Must be a valid timezone format (e.g., America/Detroit)."


# Get user inputs for secrets files
echo ""
echo "🔑 Gathering API Keys (required for app functionality)..."
read -r -p "Enter Filelist API Key: " FILELIST_API_KEY
read -r -p "Enter TMDB API Key: " TMDB_API_KEY

# Basic validation for API keys (check if not empty)
if [ -z "$FILELIST_API_KEY" ]; then
    echo "❌ Error: Filelist API Key must be provided."
    exit 1
fi

# 2. Create .env file
echo ""
echo "📝 Creating ${ENV_FILE}..."

cat > "$ENV_FILE" << EOF
# --- Shitflix App Environment Variables ---

################## REQUIRED ################

# Save location for completed downloads
DOWNLOADS_DIR="${DOWNLOADS_DIR}"

# Filelist username
FL_USERNAME="${FL_USERNAME}"

# Your timezone. (This affects the cron schedule times)
TZ="${TZ}"

# Cron schedule for wishlist processing (in cron format)
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

EOF

echo "✅ ${ENV_FILE} created with the following content:"
cat "$ENV_FILE"
echo "--------------------------------------------------"


# 3. Create secrets files
echo ""
echo "🔐 Creating secrets files in ${SECRET_DIR}..."

# Ensure secrets directory exists
mkdir -p "$SECRET_DIR"

# Write Filelist API Key
echo "$FILELIST_API_KEY" > "$FILELIST_API_KEY_FILE"
# Write TMDB API Key
echo "$TMDB_API_KEY" > "$TMDB_API_KEY_FILE"

# Set restrictive permissions on secrets files
chmod 600 "$FILELIST_API_KEY_FILE" "$TMDB_API_KEY_FILE"

echo "✅ Secrets files created and protected."
echo "--------------------------------------------------"

# 4. Create download folders if they don't exist on the host
echo ""
echo "📁 Ensuring download directories exist on the host..."
sudo mkdir -p "$DOWNLOADS_DIR"/movies
sudo mkdir -p "$DOWNLOADS_DIR"/shows
sudo mkdir -p "$DOWNLOADS_DIR"/incomplete

# Set permissions
sudo chown "$USER":"$USER" "$DOWNLOADS_DIR"
sudo chown "$USER":"$USER" "$DOWNLOADS_DIR"/incomplete
sudo chown "$USER":"$USER" "$DOWNLOADS_DIR"/movies
sudo chown "$USER":"$USER" "$DOWNLOADS_DIR"/shows

echo "✅ Download directories are set up."

# 5. Run docker compose up
echo ""
echo "🚀 Starting app with docker compose up -d..."
echo "(This may take a while as images are downloaded/built)"

# Define the docker compose command dynamically
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Error: Cannot find docker compose command."
    exit 1
fi

# Run the docker compose up command and capture its exit status
if ! $COMPOSE_CMD up -d; then
    echo ""
    echo "❌ **Installation Failed!**"
    echo "There was an error running \`${COMPOSE_CMD} up -d\`."
    echo "Please check the output above for errors."
    echo "--------------------------------------------------"
    exit 1
fi

# --- Status Check Loop ---
# Check if the containers have finished starting
PROJECT_NAME="$(basename "$(pwd)")" # Get the current directory name as the default project name
MAX_WAIT_TIME=120 # Maximum time to wait (seconds)
WAIT_INTERVAL=5  # Check every 5 seconds
TIME_ELAPSED=0

echo ""
echo "⏳ Waiting for containers in '${PROJECT_NAME}' to start (Max ${MAX_WAIT_TIME}s)..."

while [ $TIME_ELAPSED -lt $MAX_WAIT_TIME ]; do
    # Command to check if all containers are running (Status is "running")
    # This command checks if the number of 'running' containers equals the total number of containers
    RUNNING_COUNT=$($COMPOSE_CMD ps --format json | jq -r 'select(.State == "running") | .Name' | wc -l)
    TOTAL_COUNT=$($COMPOSE_CMD ps --format json | jq -r '.Name' | wc -l)

    # If jq is not installed, the above lines will fail. Using a more basic check:
    if ! command -v jq &> /dev/null; then
        RUNNING_CHECK=$($COMPOSE_CMD ps --services --filter "status=running" | wc -l)
        TOTAL_CHECK=$($COMPOSE_CMD ps --services | wc -l)
        RUNNING_COUNT=$RUNNING_CHECK
        TOTAL_COUNT=$TOTAL_CHECK
        # Note: This simple count might not be 100% reliable as it counts service names, not running instances.
    fi

    if [ "$RUNNING_COUNT" -gt 0 ] && [ "$RUNNING_COUNT" -eq "$TOTAL_COUNT" ]; then
        echo "✅ All ${TOTAL_COUNT} services are running!"
        break # Exit the loop on success
    fi

    echo "   Status: ${RUNNING_COUNT} of ${TOTAL_COUNT} services running. Retrying in ${WAIT_INTERVAL}s..."

    sleep $WAIT_INTERVAL
    TIME_ELAPSED=$((TIME_ELAPSED + WAIT_INTERVAL))
done

if [ "$RUNNING_COUNT" -eq "$TOTAL_COUNT" ]; then
    echo ""
    echo "🎉 **Installation Complete!**"
    echo "Your Shitflix App services should now be running in the background."
    echo "You can check the status with: \`docker ps\` or \`${COMPOSE_CMD} ps\`"
    echo "--------------------------------------------------"
    echo "Launch dashboard: http://localhost:7069 (or replace localhost with your server's IP)"
else
    echo ""
    echo "⚠️ **Installation Warning!**"
    echo "Timed out waiting for all services to start (${RUNNING_COUNT} of ${TOTAL_COUNT} running after ${MAX_WAIT_TIME}s)."
    echo "The app may still be starting up. Check the status manually with: \`docker ps\` or \`${COMPOSE_CMD} ps\`"
    echo "--------------------------------------------------"
fi
