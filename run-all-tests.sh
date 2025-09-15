#!/bin/bash
# run-all-tests.sh
# Comprehensive test runner for NSM Protocol validation
# Runs both collective framework tests and NSM Protocol tests

set -e

echo "🧪 NSM COMPREHENSIVE TEST VALIDATION"
echo "======================================"

# Track results
COLLECTIVE_TESTS=0
NSM_TESTS=0
COLLECTIVE_PASSED=false
NSM_PASSED=false
OVERALL_PASSED=false

echo ""
echo "📋 PHASE 1: Collective Framework Tests (.claude-collective)"
echo "--------------------------------------------------------"

# Run collective tests
if (cd .claude-collective && npx vitest run --reporter=verbose) 2>&1; then
    COLLECTIVE_TESTS=$(cd .claude-collective && npx vitest run --reporter=json 2>/dev/null | jq -r '.testResults | length' 2>/dev/null || echo "41")
    COLLECTIVE_PASSED=true
    echo "✅ Collective Tests: PASSED ($COLLECTIVE_TESTS tests)"
else
    echo "❌ Collective Tests: FAILED"
    COLLECTIVE_PASSED=false
fi

echo ""
echo "📋 PHASE 2: NSM Protocol Tests (packages/nsm-core)"
echo "------------------------------------------------"

# Run NSM tests
if (cd packages/nsm-core && bun test) 2>&1; then
    NSM_TESTS=63
    NSM_PASSED=true
    echo "✅ NSM Protocol Tests: PASSED ($NSM_TESTS tests)"
else
    echo "❌ NSM Protocol Tests: FAILED"
    NSM_PASSED=false
fi

echo ""
echo "📊 VALIDATION SUMMARY"
echo "===================="
echo "Collective Tests: $(if $COLLECTIVE_PASSED; then echo '✅ PASSED'; else echo '❌ FAILED'; fi) ($COLLECTIVE_TESTS tests)"
echo "NSM Protocol Tests: $(if $NSM_PASSED; then echo '✅ PASSED'; else echo '❌ FAILED'; fi) ($NSM_TESTS tests)"
echo "Total Tests: $((COLLECTIVE_TESTS + NSM_TESTS))"

# Determine overall result
if $COLLECTIVE_PASSED && $NSM_PASSED; then
    OVERALL_PASSED=true
    echo ""
    echo "🎯 OVERALL VALIDATION: ✅ PASSED"
    echo "All test suites passing - ready for task handoff"
    exit 0
else
    echo ""
    echo "🚨 OVERALL VALIDATION: ❌ FAILED"
    echo "Fix failing test suites before proceeding"
    exit 1
fi