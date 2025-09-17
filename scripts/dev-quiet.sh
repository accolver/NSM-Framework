#!/bin/bash

# NSM Development Mode - Clean Logging
# Filters out verbose workspace warnings and lockfile parsing issues

# Load development environment if available
if [ -f .env.development ]; then
    export $(grep -v '^#' .env.development | xargs)
fi

# Run turbo dev with filtered output
bun run dev 2>&1 | \
    grep -v "WARNING.*Issues occurred when constructing package graph" | \
    grep -v "unable to parse.*Parsing Error" | \
    grep -v "resolved \"workspace:" | \
    grep -v "version \"workspace:" | \
    head -n 100  # Limit initial output to 100 lines

echo ""
echo "✨ NSM development servers started with reduced logging"
echo "🔍 Full logs available with: bun run dev (without make)"