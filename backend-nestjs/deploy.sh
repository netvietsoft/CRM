#!/bin/bash

# Deployment script for backend-nestjs
set -e

# ==========================================
# Configuration
# ==========================================
APP_NAME="backend-nestjs"


# Function to cleanup and switch back to original branch
cleanup_and_restore() {
    local exit_code=$?
    echo ""
    
    # Cleanup build archives
    rm -f be-source.tar.gz 2>/dev/null || true
    
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

# Ask if user wants to reset database
read -p "Do you want to RESET database? (yes/no, default: no): " RESET_DB
RESET_DB=$(echo "${RESET_DB:-no}" | tr -d '\r' | tr '[:upper:]' '[:lower:]')

if [ "$RESET_DB" == "yes" ]; then
    echo "⚠️  WARNING: This will DELETE ALL DATA in the database!"
    read -p "Are you absolutely sure? Type 'CONFIRM' to proceed: " CONFIRM
    CONFIRM=$(echo "$CONFIRM" | tr -d '\r')
    
    if [ "$CONFIRM" != "CONFIRM" ]; then
        echo "❌ Database reset cancelled"
        RESET_DB="no"
    else
        echo "✅ Database reset confirmed"
    fi
else
    # Force RESET_DB to "no" if not explicitly set to yes
    RESET_DB="no"
fi

# Server path
SERVER_DIR="/srv/projects-deploy/${APP_NAME}"

# Save current branch for reference
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "ℹ️  Current branch: $ORIGINAL_BRANCH"


# Create archive of source code
echo "📦 Creating archive of source code..."
TAR_FILES="src scripts prisma package.json ecosystem.config.js nest-cli.json tsconfig.json"

# Add optional files if they exist
[ -f "package-lock.json" ] && TAR_FILES="$TAR_FILES package-lock.json" && echo "  ✓ Including package-lock.json"
[ -f "yarn.lock" ] && TAR_FILES="$TAR_FILES yarn.lock" && echo "  ✓ Including yarn.lock"
[ -f ".eslintrc.js" ] && TAR_FILES="$TAR_FILES .eslintrc.js" && echo "  ✓ Including .eslintrc.js"
[ -f ".prettierrc" ] && TAR_FILES="$TAR_FILES .prettierrc" && echo "  ✓ Including .prettierrc"
[ -f "tsconfig.build.json" ] && TAR_FILES="$TAR_FILES tsconfig.build.json" && echo "  ✓ Including tsconfig.build.json"

tar -czf be-source.tar.gz $TAR_FILES

# Upload to server
echo "📤 Uploading..."
ssh $SSH_USER@$HOST "mkdir -p $SERVER_DIR"

if [ -f "be-source.tar.gz" ]; then
    scp be-source.tar.gz $SSH_USER@$HOST:$SERVER_DIR/
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
if [ -f "be-source.tar.gz" ]; then
    echo "Extracting source..."
    rm -rf src prisma package.json package-lock.json nest-cli.json tsconfig.json tsconfig.build.json
    tar -xzf be-source.tar.gz
    rm -f be-source.tar.gz
fi

# Install dependencies
if [ "$INSTALL_DEPS" == "yes" ] || [ "$INSTALL_DEPS" == "y" ]; then
    echo "📦 Installing dependencies..."
    if command -v yarn >/dev/null 2>&1; then
        yarn install
    else
        npm install
    fi
else
    echo "⏭️ Skipping dependency installation..."
fi

echo "📦 Generating Prisma client..."
npx prisma generate

# Reset database if requested
if [ "$RESET_DB" = "yes" ]; then
    echo "🗑️  Resetting database..."
    
    # Extract database credentials from DATABASE_URL
    DB_URL=\$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    if [ -z "\$DB_URL" ]; then
        echo "  ❌ Could not find DATABASE_URL in .env"
        exit 1
    fi
    
    # Parse DATABASE_URL
    DB_URL_CLEAN=\$(echo "\$DB_URL" | sed 's|^mysql://||')
    DB_USER=\$(echo "\$DB_URL_CLEAN" | cut -d':' -f1)
    DB_PASS=\$(echo "\$DB_URL_CLEAN" | sed 's|^[^:]*:||' | sed 's|@.*||')
    DB_HOST=\$(echo "\$DB_URL_CLEAN" | sed 's|.*@||' | cut -d':' -f1)
    DB_PORT=\$(echo "\$DB_URL_CLEAN" | sed 's|.*@[^:]*:||' | cut -d'/' -f1)
    DB_NAME=\$(echo "\$DB_URL_CLEAN" | sed 's|.*/||' | cut -d'?' -f1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    echo "  Database: [\$DB_NAME]"
    echo "  Host: \$DB_HOST:\$DB_PORT"
    echo "  User: \$DB_USER"
    
    # Get list of tables
    echo "  Getting table list..."
    TABLES=\$(MYSQL_PWD="\$DB_PASS" mysql -u "\$DB_USER" -h "\$DB_HOST" -P "\$DB_PORT" "\$DB_NAME" -N -e "SHOW TABLES;" 2>/dev/null)
    
    if [ -n "\$TABLES" ]; then
        echo "  Found tables, creating drop script..."
        # Create a single SQL script that drops all tables in one transaction
        echo "SET FOREIGN_KEY_CHECKS = 0;" > /tmp/drop_all.sql
        for TABLE in \$TABLES; do
            echo "DROP TABLE IF EXISTS \\\`\$TABLE\\\`;" >> /tmp/drop_all.sql
        done
        echo "SET FOREIGN_KEY_CHECKS = 1;" >> /tmp/drop_all.sql
        
        echo "  Executing drop script..."
        MYSQL_PWD="\$DB_PASS" mysql -u "\$DB_USER" -h "\$DB_HOST" -P "\$DB_PORT" "\$DB_NAME" < /tmp/drop_all.sql
        
        if [ \$? -ne 0 ]; then
            echo "  ❌ Failed to drop tables"
            rm -f /tmp/drop_all.sql
            exit 1
        fi
        
        rm -f /tmp/drop_all.sql
        echo "  ✅ All tables dropped"
    else
        echo "  ℹ️  No tables found or database is empty"
    fi
    
    echo "  ✅ Database reset complete"
    
    echo "🌱 Pushing schema to database..."
    npx prisma db push
    
    if [ \$? -ne 0 ]; then
        echo "  ❌ Failed to apply migrations"
        exit 1
    fi
    
    echo "  ✅ Migrations applied"
    
    echo "🌱 Seeding database..."
    npx prisma db seed
    
    if [ \$? -ne 0 ]; then
        echo "  ⚠️  Warning: Seeding failed or partially completed"
    else
        echo "  ✅ Database seeded successfully"
    fi
else
    echo "📦 Syncing database schema..."
    npx prisma db push
    echo "  ✅ Migrations applied"
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
