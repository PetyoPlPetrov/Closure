#!/bin/bash

# Script to extract Firebase App Check debug token from device logs
# Usage: ./scripts/get-debug-token.sh [ios|android]

PLATFORM=${1:-android}

echo "🔍 Searching for Firebase App Check Debug Token..."
echo "═══════════════════════════════════════════════════════"

if [ "$PLATFORM" = "ios" ]; then
    echo "📱 iOS: Check your Metro bundler console or Xcode console"
    echo "   Look for: '[Firebase/AppCheck] Firebase App Check Debug Token: ...'"
    echo ""
    echo "Or run this to check system logs:"
    echo "   log stream --predicate 'processImagePath contains \"Firebase\"' --level debug"
elif [ "$PLATFORM" = "android" ]; then
    echo "📱 Android: Checking logcat for debug token..."
    echo ""
    
    # Check if adb is available
    if ! command -v adb &> /dev/null; then
        echo "❌ Error: adb not found. Make sure Android SDK is installed."
        exit 1
    fi
    
    # Check if device is connected
    if ! adb devices | grep -q "device$"; then
        echo "❌ Error: No Android device connected."
        echo "   Connect your device via USB and enable USB debugging."
        exit 1
    fi
    
    echo "📋 Searching logcat for debug token..."
    echo "   (This may take a few seconds...)"
    echo ""
    
    # Clear logcat buffer and search for debug token
    adb logcat -c
    echo "✅ Logcat cleared. Now start your app and trigger App Check initialization."
    echo "   The debug token will appear below when found:"
    echo ""
    echo "═══════════════════════════════════════════════════════"
    
    # Search for debug token patterns
    adb logcat | grep -i -E "debug.*token|app.*check.*debug|firebase.*app.*check.*debug|enter.*debug.*secret" --line-buffered | while read line; do
        echo "🔑 Found: $line"
        # Extract token if it's in the line
        if echo "$line" | grep -qE "[A-Za-z0-9]{20,}"; then
            TOKEN=$(echo "$line" | grep -oE "[A-Za-z0-9]{20,}" | head -1)
            echo ""
            echo "═══════════════════════════════════════════════════════"
            echo "✅ DEBUG TOKEN FOUND:"
            echo "$TOKEN"
            echo "═══════════════════════════════════════════════════════"
            echo ""
            echo "📋 Register this token at:"
            echo "   https://console.firebase.google.com/project/funfacts-c3b87/appcheck"
            echo "   → Click 'Manage debug tokens' → 'Add debug token'"
            echo ""
        fi
    done
else
    echo "❌ Invalid platform. Use 'ios' or 'android'"
    echo "   Usage: ./scripts/get-debug-token.sh [ios|android]"
    exit 1
fi
