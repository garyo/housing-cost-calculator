#!/bin/bash

# Check if a version is provided as an argument
if [ "$1" ]; then
  NEW_VERSION="$1"
  echo "Setting version to: $NEW_VERSION"
else
  # Get the current version from package.json
  CURRENT_VERSION=$(grep '"version":' package.json | awk -F '"' '{print $4}')
  echo "Current version: $CURRENT_VERSION"

  # Split the version into major, minor, and patch
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

  # Increment the patch version
  PATCH=$((PATCH + 1))

  # Create the new version
  NEW_VERSION="$MAJOR.$MINOR.$PATCH"
  echo "New version: $NEW_VERSION"
fi

# Update version in package.json
sed -i "" "s/\"version\": \"[0-9]\+\.[0-9]\+\.[0-9]\+\"/\"version\": \"$NEW_VERSION\"/" package.json

# Update version in main.js
sed -i "" "s/const APP_VERSION = '[0-9]\+\.[0-9]\+\.[0-9]\+';/const APP_VERSION = '$NEW_VERSION';/" main.js

echo "Version bumped to $NEW_VERSION"