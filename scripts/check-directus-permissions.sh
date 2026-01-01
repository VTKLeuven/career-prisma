#!/bin/bash
# Script to check Directus server token permissions
# Usage: ./scripts/check-directus-permissions.sh

echo "Checking Directus Server Token Permissions..."
echo "=============================================="
echo ""

# Get the base URL from environment or use localhost
BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

echo "Calling diagnostic endpoint: ${BASE_URL}/api/admin/check-token-permissions"
echo ""

# Make the request
curl -s "${BASE_URL}/api/admin/check-token-permissions" | jq '.'

echo ""
echo "=============================================="
echo "Done!"



