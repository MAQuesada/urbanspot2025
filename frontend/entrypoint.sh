#!/bin/sh
# Entrypoint script to generate config.json from environment variables

set -e

CONFIG_FILE="/usr/share/nginx/html/assets/config.json"
API_URL="${API_URL:-http://localhost:8000}"
API_KEY="${API_KEY:-}"

# Ensure assets directory exists
mkdir -p /usr/share/nginx/html/assets

# Create config.json with proper JSON escaping
cat > "$CONFIG_FILE" <<EOF
{
  "apiUrl": "${API_URL}",
  "apiKey": "${API_KEY}"
}
EOF

echo "=========================================="
echo "Configuration file generated at: $CONFIG_FILE"
echo "  API_URL: ${API_URL}"
if [ -n "$API_KEY" ]; then
  echo "  API_KEY: ${API_KEY:0:10}... (length: ${#API_KEY})"
else
  echo "  API_KEY: (empty - WARNING!)"
fi
echo "=========================================="

# Verify the file was created
if [ -f "$CONFIG_FILE" ]; then
  echo "✓ config.json created successfully"
  echo "Content preview:"
  cat "$CONFIG_FILE" | head -5
else
  echo "✗ ERROR: Failed to create config.json"
  exit 1
fi

# Execute the main command (nginx)
exec "$@"

