#!/bin/bash

# Get the latest tag from git
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create version.json with the latest tag
echo "{\"version\":\"$LATEST_TAG\",\"lastUpdated\":\"$DATE\"}" > public/version.json

# Update version in HTML
sed -i "s/%VERSION%/$LATEST_TAG/g" src/index.html 