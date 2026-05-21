#!/bin/bash

# Deployment script for frontend
set -e

# ==========================================
# Configuration
# ==========================================
APP_NAME="chy_crm_fe"


# Function to cleanup and switch back to original branch
cleanup_and_restore() {
    local exit_code=$?
    echo ""
    
    # Cleanup build archives
    rm -f next-source.tar.gz 2>/dev/null || true
    
    # Switch back to original branch if not already there
    local current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
    if [ -n "$ORIGINAL_BRANCH" ] && [ "$current_branch" != "$ORIGINAL_BRANCH" ]; then
        echo "🔄 Switching back to original branch: $ORIGINAL_BRANCH"
        git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
        echo "✅ Returned to branch: $ORIGINAL_BRANCH"
    fi
    
    # Note: no longer backing up or restoring env file locally    
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "❌ Deployment failed with exit code: $exit_code"
    fi
    
    exit $exit_code
}

# Trap for signals
trap 'echo ""; echo "⚠️  Received SIGINT (Ctrl+C), cleaning up..."; exit 130' INT
trap 'echo ""; echo "⚠️  Received SIGTERM, cleaning up..."; exit 143' TERM

# Set trap to ensure cleanup runs on exit
trap cleanup_and_restore EXIT

read -p "Enter DEV | PROD: " env
env=$(echo "$env" | tr -d '\r')

# Setup Host and Env File
if [ "$env" == 'DEV' ]; then
    echo "Deploying DEV"
    HOST=72.62.198.196
    ENV_FILE=.env.devel
elif [ "$env" == 'PROD' ]; then
    echo "Deploying PROD"
    HOST=72.62.198.196
    ENV_FILE=.env.prod
else
    echo "❌ Invalid environment: '$env'"
    exit 1
fi

read -p "Enter SSH User (default: nguyenvanthanh): " SSH_USER
SSH_USER=$(echo "${SSH_USER:-nguyenvanthanh}" | tr -d '\r')

# Ask if user wants to install dependencies
read -p "Do you want to install dependencies? (yes/no, default: no): " INSTALL_DEPS
INSTALL_DEPS=$(echo "${INSTALL_DEPS:-no}" | tr -d '\r' | tr '[:upper:]' '[:lower:]')

# Server path
SERVER_DIR="/srv/projects-deploy/${APP_NAME}"

# Save current branch for reference
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "ℹ️  Current branch: $ORIGINAL_BRANCH"


# Clean old .next folder to avoid cache issues
echo "🗑️  Cleaning old .next folder to avoid cache issues..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "  ✓ Removed .next folder"
else
    echo "  ℹ️  No .next folder found"
fi
echo "✅ .next folder cleaned"

# Create archive of source code
echo "📦 Creating archive of source code..."
TAR_FILES="src public next.config.ts package.json tsconfig.json ecosystem.config.js"

# Add optional files if they exist
[ -f "yarn.lock" ] && TAR_FILES="$TAR_FILES yarn.lock" && echo "  ✓ Including yarn.lock"
[ -f "package-lock.json" ] && TAR_FILES="$TAR_FILES package-lock.json" && echo "  ✓ Including package-lock.json"
[ -f "postcss.config.js" ] && TAR_FILES="$TAR_FILES postcss.config.js" && echo "  ✓ Including postcss.config.js"
[ -f "postcss.config.mjs" ] && TAR_FILES="$TAR_FILES postcss.config.mjs" && echo "  ✓ Including postcss.config.mjs"
[ -f "tailwind.config.ts" ] && TAR_FILES="$TAR_FILES tailwind.config.ts" && echo "  ✓ Including tailwind.config.ts"
[ -f "tailwind.config.js" ] && TAR_FILES="$TAR_FILES tailwind.config.js" && echo "  ✓ Including tailwind.config.js"
[ -d "prisma" ] && TAR_FILES="$TAR_FILES prisma" && echo "  ✓ Including prisma folder"

tar -czf next-source.tar.gz $TAR_FILES

# Upload to server
echo "📤 Uploading..."
ssh $SSH_USER@$HOST "mkdir -p $SERVER_DIR"

if [ -f "next-source.tar.gz" ]; then
    scp next-source.tar.gz $SSH_USER@$HOST:$SERVER_DIR/
fi

# Upload .env file
if [ -f "$ENV_FILE" ]; then
    scp $ENV_FILE $SSH_USER@$HOST:$SERVER_DIR/.env
fi

# Deploy on server
echo "🚀 Deploying on server..."
ssh $SSH_USER@$HOST << EOF
cd $SERVER_DIR

# Extract source
if [ -f "next-source.tar.gz" ]; then
    echo "Extracting source..."
    rm -rf src public next.config.ts package.json yarn.lock package-lock.json tsconfig.json tailwind.config.ts postcss.config.mjs prisma
    tar -xzf next-source.tar.gz
    rm -f next-source.tar.gz
fi

# Install dependencies and build
if [ "$INSTALL_DEPS" == "yes" ] || [ "$INSTALL_DEPS" == "y" ]; then
    echo "📦 Installing dependencies..."
    if command -v yarn >/dev/null 2>&1; then
        yarn install
    else
        echo "  ⚠️  yarn not found, using npm..."
        npm install
    fi
else
    echo "⏭️ Skipping dependency installation..."
fi

echo "📦 Building application on server..."
if command -v yarn >/dev/null 2>&1; then
    yarn build
else
    npm run build
fi

# Reload PM2
if [ -f "ecosystem.config.js" ]; then
    pm2 startOrReload ecosystem.config.js --update-env && pm2 save
fi

echo "✅ Deployed!"
pm2 list
EOF

echo ""
echo "✅ Deployment completed successfully!"
