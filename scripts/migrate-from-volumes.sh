#!/bin/sh
set -e

SCRIPT_DIR="$(realpath "$(dirname -- "$0")")"
REPO_DIR="$(realpath "$SCRIPT_DIR/..")"

# --- txts migration ---
TXT_DIR="$SCRIPT_DIR/txts"
echo "=== TXT files (wishlist/banlist) ==="
if docker ps --format '{{.Names}}' | grep -q '^transmission$'; then
  if [ -f "$TXT_DIR/wishlist.txt" ] || [ -f "$TXT_DIR/banlist.txt" ]; then
    echo "Backing up existing local txts..."
    ts=$(date +%Y%m%d-%H%M%S)
    [ -f "$TXT_DIR/wishlist.txt" ] && cp "$TXT_DIR/wishlist.txt" "$TXT_DIR/wishlist.txt.$ts.bak"
    [ -f "$TXT_DIR/banlist.txt" ] && cp "$TXT_DIR/banlist.txt" "$TXT_DIR/banlist.txt.$ts.bak"
  fi
  echo "Copying from container..."
  docker cp transmission:/shitflix/scripts/txts/wishlist.txt "$TXT_DIR/" 2>/dev/null || echo "  (no wishlist.txt)"
  docker cp transmission:/shitflix/scripts/txts/banlist.txt "$TXT_DIR/" 2>/dev/null || echo "  (no banlist.txt)"
else
  echo "transmission container not running — skipping txts migration"
fi

# --- transmission-config migration ---
echo ""
echo "=== Transmission config ==="
CONFIG_DIR="$REPO_DIR/config/transmission"
mkdir -p "$CONFIG_DIR"
if docker volume inspect shitflix_transmission-config >/dev/null 2>&1; then
  if [ -n "$(ls -A "$CONFIG_DIR" 2>/dev/null)" ]; then
    echo "Backing up existing local transmission config..."
    ts=$(date +%Y%m%d-%H%M%S)
    tar czf "$CONFIG_DIR/../transmission-config.$ts.bak.tar.gz" -C "$CONFIG_DIR" .
  fi
  echo "Copying from named volume..."
  docker run --rm \
    -v shitflix_transmission-config:/source \
    -v "$CONFIG_DIR:/dest" \
    alpine sh -c 'cp -a /source/. /dest/'
else
  echo "shitflix_transmission-config volume not found — skipping"
fi

# --- jellyfin-config migration ---
echo ""
echo "=== Jellyfin config ==="
CONFIG_DIR="$REPO_DIR/config/jellyfin"
mkdir -p "$CONFIG_DIR"
if docker volume inspect shitflix_jellyfin-config >/dev/null 2>&1; then
  if [ -n "$(ls -A "$CONFIG_DIR" 2>/dev/null)" ]; then
    echo "Backing up existing local jellyfin config..."
    ts=$(date +%Y%m%d-%H%M%S)
    tar czf "$CONFIG_DIR/../jellyfin-config.$ts.bak.tar.gz" -C "$CONFIG_DIR" .
  fi
  echo "Copying from named volume..."
  docker run --rm \
    -v shitflix_jellyfin-config:/source \
    -v "$CONFIG_DIR:/dest" \
    alpine sh -c 'cp -a /source/. /dest/'
else
  echo "shitflix_jellyfin-config volume not found — skipping"
fi

echo ""
echo "=== Done ==="
echo "config/transmission/: $(ls -la "$REPO_DIR/config/transmission/" 2>/dev/null | wc -l) entries"
echo "config/jellyfin/: $(ls -la "$REPO_DIR/config/jellyfin/" 2>/dev/null | wc -l) entries"
echo "scripts/txts/: $(ls -la "$SCRIPT_DIR/txts/" 2>/dev/null | wc -l) entries"
