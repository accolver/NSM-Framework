#!/bin/bash

# NSM Service Status Checker
# Checks which development services are currently running

echo "🔍 NSM Service Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    local service_name=$2
    local url="http://localhost:$port"

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "✅ $service_name - $url (RUNNING)"
        return 0
    else
        echo "❌ $service_name - $url (NOT RUNNING)"
        return 1
    fi
}

# Check web services
echo "📱 Web Applications:"
check_port 5173 "POC Whiteboard    "
check_port 5174 "POC Wordle        "
check_port 3001 "Dev Tools App     "
check_port 3000 "Docs (Mintlify)   "

echo ""
echo "📦 TypeScript Services:"
# Check if TypeScript compilation processes are running
if pgrep -f "tsc.*watch" >/dev/null 2>&1; then
    echo "✅ TypeScript watch processes (RUNNING)"
    echo "  • Includes: @nsm/core, @nsm/client, @nsm/client-sdk, @nsm/dev-tools"
else
    echo "❌ TypeScript watch processes (NOT RUNNING)"
fi

# Check if Bun test watch is running
if pgrep -f "bun.*test.*watch" >/dev/null 2>&1; then
    echo "✅ Bun test watch (@nsm/crypto) (RUNNING)"
else
    echo "❌ Bun test watch (@nsm/crypto) (NOT RUNNING)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Quick Actions:"
echo "  • Start all services: make dev"
echo "  • Stop all services: Ctrl+C in the terminal running make dev"
echo "  • Check this status: ./scripts/service-status.sh"