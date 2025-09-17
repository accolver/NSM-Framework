#!/bin/bash

# Port Configuration Test Script
# Validates that poc-whiteboard and poc-wordle are serving on correct ports

echo "🧪 Testing Port Configuration..."
echo "================================="

# Test port 5173 (poc-whiteboard)
echo "📋 Testing localhost:5173 (poc-whiteboard)..."
WHITEBOARD_RESPONSE=$(curl -s "http://localhost:5173/__nsm_ready" 2>/dev/null)
WHITEBOARD_APP=$(echo $WHITEBOARD_RESPONSE | grep -o '"app":"[^"]*"' | cut -d'"' -f4)
WHITEBOARD_TITLE=$(curl -s "http://localhost:5173" 2>/dev/null | grep -o '<title[^>]*>[^<]*</title>' | sed 's/<[^>]*>//g')

if [ "$WHITEBOARD_APP" = "POC Whiteboard" ]; then
    echo "✅ Port 5173: Serving $WHITEBOARD_APP"
    echo "   Title: $WHITEBOARD_TITLE"
else
    echo "❌ Port 5173: Expected 'POC Whiteboard', got '$WHITEBOARD_APP'"
fi

# Test port 5174 (poc-wordle)
echo ""
echo "🎮 Testing localhost:5174 (poc-wordle)..."
WORDLE_RESPONSE=$(curl -s "http://localhost:5174/__nsm_ready" 2>/dev/null)
WORDLE_APP=$(echo $WORDLE_RESPONSE | grep -o '"app":"[^"]*"' | cut -d'"' -f4)
WORDLE_TITLE=$(curl -s "http://localhost:5174" 2>/dev/null | grep -o '<title[^>]*>[^<]*</title>' | sed 's/<[^>]*>//g')

if [ "$WORDLE_APP" = "POC Wordle" ]; then
    echo "✅ Port 5174: Serving $WORDLE_APP"
    echo "   Title: $WORDLE_TITLE"
else
    echo "❌ Port 5174: Expected 'POC Wordle', got '$WORDLE_APP'"
fi

# Summary
echo ""
echo "📊 Summary:"
echo "=========="
if [ "$WHITEBOARD_APP" = "POC Whiteboard" ] && [ "$WORDLE_APP" = "POC Wordle" ]; then
    echo "✅ All tests passed! Port configuration is correct."
    echo "   🎨 poc-whiteboard: http://localhost:5173"
    echo "   🎮 poc-wordle: http://localhost:5174"
else
    echo "❌ Port configuration test failed!"
    echo "   Expected: POC Whiteboard on 5173, POC Wordle on 5174"
    echo "   Actual: $WHITEBOARD_APP on 5173, $WORDLE_APP on 5174"
fi