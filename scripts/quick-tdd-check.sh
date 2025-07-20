#!/bin/bash

# Quick TDD Compliance Check Script (without full coverage run)
# This script validates TDD practices by checking test presence and running tests

set -e

echo "🔍 Checking TDD compliance..."

cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "src-tauri/Cargo.toml" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

cd src-tauri

echo "📡 Command files detected:"
find src/pawn/command -name "*.rs" -type f | grep -v mod.rs | sort

COMMAND_COUNT=$(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs | wc -l)
echo "✅ Found $COMMAND_COUNT command files"

echo "📊 Checking test presence..."

# Check that command files have tests
COMMAND_FILES=$(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs | wc -l)
COMMAND_TEST_FILES=0

# Count command files with tests
for file in $(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs); do
    if grep -q "#\[cfg(test)\]" "$file"; then
        COMMAND_TEST_FILES=$((COMMAND_TEST_FILES + 1))
    fi
done

echo "📊 Command files: $COMMAND_FILES"
echo "📊 Command files with tests: $COMMAND_TEST_FILES"

COMMAND_TEST_PERCENTAGE=$((COMMAND_TEST_FILES * 100 / COMMAND_FILES))
echo "📊 Command test coverage: $COMMAND_TEST_PERCENTAGE%"

# List command files with tests
echo "📋 Command files with tests:"
for file in $(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs); do
    if grep -q "#\[cfg(test)\]" "$file"; then
        echo "  ✅ $file"
    fi
done

# List command files without tests
echo "📋 Command files without tests:"
HAS_FILES_WITHOUT_TESTS=false
for file in $(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs); do
    if ! grep -q "#\[cfg(test)\]" "$file"; then
        echo "  ❌ $file"
        HAS_FILES_WITHOUT_TESTS=true
    fi
done

if [ "$HAS_FILES_WITHOUT_TESTS" = false ]; then
    echo "  🎉 All command files have tests!"
fi

# Check service files have tests
SERVICE_FILES=$(find src/pawn/service -name "*.rs" -type f | grep -v mod.rs | wc -l)
SERVICE_TEST_FILES=0

# Count service files with tests
for file in $(find src/pawn/service -name "*.rs" -type f | grep -v mod.rs); do
    if grep -q "#\[cfg(test)\]" "$file"; then
        SERVICE_TEST_FILES=$((SERVICE_TEST_FILES + 1))
    fi
done

echo "📊 Service files: $SERVICE_FILES"
echo "📊 Service files with tests: $SERVICE_TEST_FILES"

SERVICE_TEST_PERCENTAGE=$((SERVICE_TEST_FILES * 100 / SERVICE_FILES))
echo "📊 Service test coverage: $SERVICE_TEST_PERCENTAGE%"

# Quick test run to verify tests compile and pass
echo "🧪 Running quick test compilation check..."
if cargo test --no-run --lib; then
    echo "✅ All tests compile successfully"
else
    echo "❌ Test compilation failed"
    exit 1
fi

# Run a subset of tests to verify they work
echo "🧪 Running command tests to verify functionality..."
if cargo test command_ --lib; then
    echo "✅ Command tests pass"
else
    echo "❌ Command tests failed"
    exit 1
fi

echo "🎯 TDD Compliance Check Summary:"
echo "================================="
echo "Command Test Coverage: $COMMAND_TEST_PERCENTAGE% (threshold: 90%)"
echo "Service Test Coverage: $SERVICE_TEST_PERCENTAGE% (threshold: 80%)"

# Final result
if [ "$COMMAND_TEST_PERCENTAGE" -ge 90 ] && [ "$SERVICE_TEST_PERCENTAGE" -ge 80 ]; then
    echo "✅ All TDD compliance checks passed!"
    echo "🎉 Command coverage improvements successful!"
    exit 0
else
    echo "❌ Some TDD compliance checks failed!"
    if [ "$COMMAND_TEST_PERCENTAGE" -lt 90 ]; then
        echo "   - Command test coverage ($COMMAND_TEST_PERCENTAGE%) below 90%"
    fi
    if [ "$SERVICE_TEST_PERCENTAGE" -lt 80 ]; then
        echo "   - Service test coverage ($SERVICE_TEST_PERCENTAGE%) below 80%"
    fi
    exit 1
fi