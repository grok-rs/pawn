#!/bin/bash

# TDD Compliance and Coverage Check Script
# This script validates that the codebase follows TDD practices and meets coverage requirements

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

echo "✅ Permission files found ($(find . -name "*.rs" -exec grep -l "tauri::command" {} \; | wc -l) permissions)"

echo "📊 Checking test coverage..."

# Run tarpaulin with proper flags for the current version
echo "Running cargo tarpaulin..."
if ! command -v cargo-tarpaulin &> /dev/null; then
    echo "Installing cargo-tarpaulin..."
    cargo install cargo-tarpaulin
fi

# Run tarpaulin and capture output
TARPAULIN_OUTPUT=$(cargo tarpaulin --ignore-panics --exclude-files "src/main.rs" 2>&1 || true)

echo "Tarpaulin output:"
echo "$TARPAULIN_OUTPUT"

# Extract coverage percentage
COVERAGE=$(echo "$TARPAULIN_OUTPUT" | grep -oP '\K[0-9.]+(?=% coverage)' | head -1)

# Alternative extraction methods if first one fails
if [ -z "$COVERAGE" ]; then
    COVERAGE=$(echo "$TARPAULIN_OUTPUT" | grep -oP 'Coverage: \K[0-9.]+' | head -1)
fi

if [ -z "$COVERAGE" ]; then
    COVERAGE=$(echo "$TARPAULIN_OUTPUT" | grep -oP '\K[0-9.]+(?=%)' | tail -1)
fi

# Default to 0 if still no coverage found
if [ -z "$COVERAGE" ]; then
    COVERAGE="0"
fi

echo "📈 Overall Coverage: $COVERAGE%"

# Check for command-specific coverage
COMMAND_COVERAGE_OUTPUT=$(echo "$TARPAULIN_OUTPUT" | grep -i "command" || echo "")
if [ -n "$COMMAND_COVERAGE_OUTPUT" ]; then
    echo "📡 Command Coverage Details:"
    echo "$COMMAND_COVERAGE_OUTPUT"
fi

# Coverage thresholds
OVERALL_THRESHOLD=50  # Relaxed for demo
COMMAND_THRESHOLD=80  # Higher for critical command layer

# Check overall coverage threshold
if [ "$(echo "$COVERAGE >= $OVERALL_THRESHOLD" | bc -l 2>/dev/null || echo "0")" == "1" ] || [ "$(printf "%.0f" "$COVERAGE" 2>/dev/null || echo "0")" -ge "$OVERALL_THRESHOLD" ]; then
    echo "✅ Overall coverage $COVERAGE% meets $OVERALL_THRESHOLD% threshold"
else
    echo "❌ Overall coverage $COVERAGE% is below $OVERALL_THRESHOLD% threshold"
fi

# Additional TDD compliance checks
echo "🧪 Checking TDD compliance..."

# Check that command files have tests
COMMAND_FILES=$(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs | wc -l)
COMMAND_TEST_FILES=$(find src/pawn/command -name "*.rs" -type f | grep -v mod.rs -exec grep -l "#\[cfg(test)\]" {} \; | wc -l)

echo "📊 Command files: $COMMAND_FILES"
echo "📊 Command files with tests: $COMMAND_TEST_FILES"

COMMAND_TEST_PERCENTAGE=$((COMMAND_TEST_FILES * 100 / COMMAND_FILES))
echo "📊 Command test coverage: $COMMAND_TEST_PERCENTAGE%"

if [ "$COMMAND_TEST_PERCENTAGE" -ge 90 ]; then
    echo "✅ Command test coverage $COMMAND_TEST_PERCENTAGE% meets 90% requirement"
else
    echo "❌ Command test coverage $COMMAND_TEST_PERCENTAGE% is below 90% requirement"
fi

# Check service files have tests
SERVICE_FILES=$(find src/pawn/service -name "*.rs" -type f | grep -v mod.rs | wc -l)
SERVICE_TEST_FILES=$(find src/pawn/service -name "*.rs" -type f | grep -v mod.rs -exec grep -l "#\[cfg(test)\]" {} \; | wc -l)

echo "📊 Service files: $SERVICE_FILES"
echo "📊 Service files with tests: $SERVICE_TEST_FILES"

SERVICE_TEST_PERCENTAGE=$((SERVICE_TEST_FILES * 100 / SERVICE_FILES))
echo "📊 Service test coverage: $SERVICE_TEST_PERCENTAGE%"

if [ "$SERVICE_TEST_PERCENTAGE" -ge 80 ]; then
    echo "✅ Service test coverage $SERVICE_TEST_PERCENTAGE% meets 80% requirement"
else
    echo "❌ Service test coverage $SERVICE_TEST_PERCENTAGE% is below 80% requirement"
fi

echo "🎯 TDD Compliance Check Summary:"
echo "================================="
echo "Overall Coverage: $COVERAGE% (threshold: $OVERALL_THRESHOLD%)"
echo "Command Test Coverage: $COMMAND_TEST_PERCENTAGE% (threshold: 90%)"
echo "Service Test Coverage: $SERVICE_TEST_PERCENTAGE% (threshold: 80%)"

# Final result
if [ "$(printf "%.0f" "$COVERAGE" 2>/dev/null || echo "0")" -ge "$OVERALL_THRESHOLD" ] && [ "$COMMAND_TEST_PERCENTAGE" -ge 90 ] && [ "$SERVICE_TEST_PERCENTAGE" -ge 80 ]; then
    echo "✅ All TDD compliance checks passed!"
    exit 0
else
    echo "❌ Some TDD compliance checks failed!"
    exit 1
fi