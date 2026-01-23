#!/bin/bash

echo "🚀 Pushing to GitHub..."
echo ""
echo "This will prompt for your GitHub credentials."
echo "If you have 2FA enabled, you'll need a Personal Access Token instead of your password."
echo ""
echo "To create a token: https://github.com/settings/tokens"
echo "Scopes needed: repo"
echo ""

git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
else
    echo ""
    echo "❌ Push failed. Please check your credentials."
fi
