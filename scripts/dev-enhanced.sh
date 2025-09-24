#!/bin/bash

# NSM Development Mode - Enhanced Service Discovery
# Shows service URLs and ports with clean logging

echo "🚀 Starting NSM Framework development services..."
echo ""

# Load development environment if available
if [ -f .env.development ]; then
    export $(grep -v '^#' .env.development | xargs)
fi

# Function to detect and log service URLs
log_service_urls() {
    echo "🌐 Development Services:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 Web Applications:"
    echo "  • POC Whiteboard:  http://localhost:5173"
    echo "  • POC Wordle:      http://localhost:5174"
    echo "  • NSM Browser:     http://localhost:5175"
    echo "  • Dev Tools App:   http://localhost:3001"
    echo "  • Docs (future):   http://localhost:3000"
    echo ""
    echo "📦 TypeScript Libraries (watch mode):"
    echo "  • @nsm/core        - Core protocol (TypeScript compilation)"
    echo "  • @nsm/client      - Client SDK (TypeScript compilation)"
    echo "  • @nsm/client-sdk  - Client SDK API (TypeScript compilation)"
    echo "  • @nsm/dev-tools   - Development utilities (TypeScript compilation)"
    echo "  • @nsm/crypto      - Cryptography tests (Bun test watch)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Quick Access:"
    echo "  • Open Whiteboard: http://localhost:5173"
    echo "  • Open Wordle:     http://localhost:5174"
    echo "  • Open NSM Browser: http://localhost:5175"
    echo "  • Dev Tools:       http://localhost:3001 (when implemented)"
    echo ""
}

# Show service URLs before starting
log_service_urls

echo "⚙️  Starting services..."
echo ""

# Start turbo dev with enhanced filtering and URL extraction
bun run dev 2>&1 | \
    grep -v "WARNING.*Issues occurred when constructing package graph" | \
    grep -v "unable to parse.*Parsing Error" | \
    grep -v "resolved \"workspace:" | \
    grep -v "version \"workspace:" | \
    sed 's/.*Local:.*http\(s\)\?:\/\/\([^[:space:]]*\).*/🌐 Service ready: http\1:\/\/\2/' | \
    sed 's/.*localhost:\([0-9]*\).*/🌐 Service ready: http:\/\/localhost:\1/' | \
    while IFS= read -r line; do
        # Highlight service ready messages
        if [[ "$line" == *"Service ready:"* ]]; then
            echo "✅ $line"
        # Highlight compilation success
        elif [[ "$line" == *"Compilation successful"* ]] || [[ "$line" == *"Found 0 errors"* ]]; then
            echo "✅ $line"
        # Highlight errors
        elif [[ "$line" == *"error"* ]] && [[ "$line" != *"0 fail"* ]]; then
            echo "❌ $line"
        else
            echo "$line"
        fi
    done

echo ""
echo "✨ NSM development servers started with enhanced URL logging"
echo "🔍 Full logs available with: bun run dev (without make)"
echo ""
echo "📋 Service Status:"
echo "  • Check the URLs above to access running services"
echo "  • TypeScript packages are in watch mode for hot compilation"
echo "  • Use Ctrl+C to stop all services"