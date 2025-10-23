#!/bin/bash

# Configuration
REPO_URL="https://github.com/Luci0/shitflix.git" # <-- **UPDATE THIS**
REPO_FOLDER="shitflix"      # Adjust to your repository name
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

# Function to get user input with default and validation
get_user_input() {
    local prompt="$1"
    local default_val="$2"
    local var_name="$3"
    local validation_regex="$4"
    local error_msg="$5"
    local input

    while true; do
        read -r -p "${prompt} (default: ${default_val}): " input
        input="${input:-${default_val}}" # Use default if input is empty

        if [[ -n "$validation_regex" && ! "$input" =~ $validation_regex ]]; then
            echo "❌ Validation Error: ${error_msg}"
            continue
        fi

        # Assign the validated or default value to the referenced variable
        eval "${var_name}='${input}'"
        break
    done
}

# --- Main Script Logic ---

echo "🎬 Starting Shitflix App Installation Script"
echo "--------------------------------------------------"

# 4. Validate inputed values and check deps
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
DEFAULT_INCOMPLETE_DIR="/home/${USER}/Downloads/incomplete"
DEFAULT_FL_USERNAME="Mclovin"
DEFAULT_CRON_SCHEDULE="0 3 * * *"

# Get user inputs for .env file
DOWNLOADS_DIR=""
get_user_input "Enter DOWNLOADS_DIR" "$DEFAULT_DOWNLOADS_DIR" "DOWNLOADS_DIR" "^/" "Must be an absolute path (starts with /)."

INCOMPLETE_DIR=""
get_user_input "Enter INCOMPLETE_DIR" "$DEFAULT_INCOMPLETE_DIR" "INCOMPLETE_DIR" "^/" "Must be an absolute path (starts with /)."

FL_USERNAME=""
get_user_input "Enter FL_USERNAME" "$DEFAULT_FL_USERNAME" "FL_USERNAME" "^[a-zA-Z0-9_]{3,}$" "Must be alphanumeric/underscore and at least 3 characters."

RUNNER_CRON_SCHEDULE=""
get_user_input "Enter RUNNER_CRON_SCHEDULE" "$DEFAULT_CRON_SCHEDULE" "RUNNER_CRON_SCHEDULE" "^[0-9\-\*\/, ]+$" "Invalid cron schedule format."

# Get user inputs for secrets files
echo ""
echo "🔑 Gathering API Keys (required for app functionality)..."
read -r -p "Enter **Filelist API Key**: " FILELIST_API_KEY
read -r p "Enter **TMDB API Key**: " TMDB_API_KEY

# Basic validation for API keys (check if not empty)
if [ -z "$FILELIST_API_KEY" ] || [ -z "$TMDB_API_KEY" ]; then
    echo "❌ Error: Both Filelist and TMDB API Keys must be provided."
    exit 1
fi

# 2. Create .env file
echo ""
echo "📝 Creating ${ENV_FILE}..."

cat > "$ENV_FILE" << EOF
# --- Shitflix App Environment Variables ---
DOWNLOADS_DIR="${DOWNLOADS_DIR}"
INCOMPLETE_DIR="${INCOMPLETE_DIR}"
FL_USERNAME="${FL_USERNAME}"
RUNNER_CRON_SCHEDULE="${RUNNER_CRON_SCHEDULE}"
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

# 5. Run docker compose up
echo ""
echo "🚀 Starting app with docker compose up -d..."
echo "(This may take a while as images are downloaded/built)"

# Use 'docker compose' (v2) if available, otherwise fallback to 'docker-compose' (v1)
if command -v docker-compose &> /dev/null; then
    echo 'run docker-compose up -d'
#    docker-compose up -d
elif docker compose version &> /dev/null; then
    echo 'run docker compose up -d'
#    docker compose up -d
else
    # This shouldn't happen due to the check_dependencies function, but as a safeguard.
    echo "❌ Error: Cannot find docker compose command."
    exit 1
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 **Installation Complete!**"
    echo "Your Shitflix App services should now be running in the background."
    echo "You can check the status with: \`docker compose ps\`"
    echo "--------------------------------------------------"
else
    echo ""
    echo "❌ **Installation Failed!**"
    echo "There was an error running \`docker compose up -d\`."
    echo "Please check the output above for errors."
    echo "--------------------------------------------------"
fi