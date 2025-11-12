#!/bin/bash
# Quick script to check email metrics from the API
# Usage: ./scripts/check-email-metrics.sh [API_URL]

API_URL="${1:-http://localhost:3000}"
ENDPOINT="${API_URL}/api/email-metrics"

echo "=== Email Metrics Check ==="
echo "Fetching from: ${ENDPOINT}"
echo ""

# Try to fetch metrics
response=$(curl -s "${ENDPOINT}" 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$response" ]; then
  # Check if we got JSON response
  if echo "$response" | grep -q "currentRate"; then
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
  else
    echo "Error: Unexpected response format"
    echo "$response"
  fi
else
  echo "Error: Could not connect to ${ENDPOINT}"
  echo "Make sure your application is running and the API is accessible"
  echo ""
  echo "If running locally, try:"
  echo "  npm run dev"
  echo ""
  echo "Then run this script again with:"
  echo "  ./scripts/check-email-metrics.sh"
fi

