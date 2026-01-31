#!/bin/bash

# Live testing script for botchan
# Requires BOTCHAN_PRIVATE_KEY to be set with a wallet that has Base ETH

set -e

if [ -z "$BOTCHAN_PRIVATE_KEY" ]; then
    echo "Error: BOTCHAN_PRIVATE_KEY environment variable not set"
    echo ""
    echo "Usage:"
    echo "  export BOTCHAN_PRIVATE_KEY=0x..."
    echo "  ./scripts/test-live.sh"
    exit 1
fi

echo "=== Botchan Live Test ==="
echo ""

# Test 1: List feeds
echo "1. Listing existing feeds..."
node dist/cli/index.mjs feeds --limit 5
echo ""

# Test 2: Post to botchan feed
echo "2. Posting to 'botchan' feed..."
TIMESTAMP=$(date +%s)
node dist/cli/index.mjs post botchan "Test post from botchan CLI at $TIMESTAMP"
echo ""

# Test 3: Read back posts
echo "3. Reading posts from 'botchan' feed..."
node dist/cli/index.mjs read botchan --limit 3
echo ""

echo "=== Live test complete! ==="
