#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Export all environment variables to a file that cron jobs can source
printenv > /etc/environment

# Create a wrapper script that properly exports environment before running
cat > /shitflix/scripts/cron-wrapper.sh << 'EOF'
#!/bin/sh
# Source the environment file to get all variables
set -a  # Mark all new variables for export
. /etc/environment
set +a  # Turn off auto-export

# Run the main script with environment properly set
exec /shitflix/scripts/clean-old-wishlist-entries.sh
exec /shitflix/scripts/shitflix-runner.sh
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

# Use su-exec to drop privileges and execute the main process as the 'shitflix' user
exec su-exec shitflix transmission-daemon \
    --foreground \
    --allowed=*.*.*.* \
    --config-dir=/config \
    --rpc-bind-address=0.0.0.0 \
    --download-dir=/downloads \
    --incomplete-dir=/incomplete
