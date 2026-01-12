#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Export all environment variables to a file that cron jobs can source
printenv | while IFS='=' read -r key value; do
  value_escaped=$(printf '%s' "$value" | sed 's/"/\\"/g')
  printf '%s="%s"\n' "$key" "$value_escaped"
done > /etc/environment

# Create a wrapper script that properly exports environment before running
cat > /shitflix/scripts/cron-wrapper.sh << 'EOF'
#!/bin/sh
# Source the environment file to get all variables
set -a  # Mark all new variables for export
. /etc/environment
set +a  # Turn off auto-export

# Run the main script with environment properly set
/shitflix/scripts/clean-old-wishlist-entries.sh
/shitflix/scripts/shitflix-runner.sh

# Fix ownership so shitflix user can access the files
chown shitflix:shitflix /shitflix/scripts/txts/wishlist.txt /shitflix/scripts/txts/banlist.txt
EOF
chmod +x /shitflix/scripts/cron-wrapper.sh

# Create the crontab file for the root user
echo "$RUNNER_CRON_SCHEDULE /shitflix/scripts/cron-wrapper.sh >> /var/log/cron.log 2>&1" > /etc/crontabs/root

# Create log file with proper permissions
touch /var/log/cron.log
chmod 666 /var/log/cron.log

# Start crond in foreground mode in background
crond -f &

# Tail the cron log to container stdout in background
tail -F /var/log/cron.log 2>/dev/null &

# Start dashboard webapp as shitflix user in background
su-exec shitflix sh -c 'cd /dashboard && node api-backend.js 2>&1' &

# Use su-exec to drop privileges and execute the main process as the 'shitflix' user
exec su-exec shitflix transmission-daemon \
    --foreground \
    --allowed=*.*.*.* \
    --config-dir=/config \
    --rpc-bind-address=0.0.0.0 \
    --download-dir=/downloads \
    --incomplete-dir=/downloads/incomplete
