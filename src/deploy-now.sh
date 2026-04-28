#!/bin/bash
# Run this from your invisible-rule folder on your Mac
# It sets all env vars on Vercel and deploys

set -e

echo "=== Setting Vercel environment variables ==="

# Set env vars for production
echo "e9e734e9-702b-439f-828e-9d3ed7cbd08f" | npx vercel env add NEXT_PUBLIC_VAPI_PUBLIC_KEY production --force
echo "64512fbd-20ec-488a-8f03-8d2bf81021b0" | npx vercel env add VAPI_PRIVATE_KEY production --force
echo "https://invisible-rule.vercel.app" | npx vercel env add NEXT_PUBLIC_APP_URL production --force

# Prompt for Anthropic key (already in .env.local)
source .env.local 2>/dev/null
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "$ANTHROPIC_API_KEY" | npx vercel env add ANTHROPIC_API_KEY production --force
  echo "â ANTHROPIC_API_KEY set from .env.local"
else
  echo "â  Could not read ANTHROPIC_API_KEY from .env.local"
  echo "  Please set it manually: npx vercel env add ANTHROPIC_API_KEY production"
fi

echo ""
echo "=== Deploying to production ==="
npx vercel --prod

echo ""
echo "â Done! Your site should be live at https://invisible-rule.vercel.app"
