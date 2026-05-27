#!/bin/bash

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="backend-nestjs"

cleanup_and_restore() {
    local exit_code=$?
    echo ""
    rm -f be-source.tar.gz 2>/dev/null || true

    local current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
    if [ -n "${ORIGINAL_BRANCH:-}" ] && [ "$current_branch" != "$ORIGINAL_BRANCH" ]; then
        echo "🔄 Switching back to original branch: $ORIGINAL_BRANCH"
        git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
        echo "✅ Returned to branch: $ORIGINAL_BRANCH"
    fi

    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "❌ Deployment failed with exit code: $exit_code"
    fi

    exit $exit_code
}

trap 'echo ""; echo "⚠️  Received SIGINT (Ctrl+C), cleaning up..."; exit 130' INT
trap 'echo ""; echo "⚠️  Received SIGTERM, cleaning up..."; exit 143' TERM
trap cleanup_and_restore EXIT

read -p "Enter DEV | PROD: " env
env=$(echo "$env" | tr -d '\r')

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

read -p "Do you want to install dependencies? (yes/no, default: no): " INSTALL_DEPS
INSTALL_DEPS=$(echo "${INSTALL_DEPS:-no}" | tr -d '\r' | tr '[:upper:]' '[:lower:]')

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
    RESET_DB="no"
fi

SERVER_DIR="/srv/projects-deploy/${APP_NAME}"
ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "ℹ️  Current branch: $ORIGINAL_BRANCH"

echo "📦 Creating archive of source code..."
TAR_FILES=()
REQUIRED_PATHS=(src prisma package.json ecosystem.config.js nest-cli.json tsconfig.json)
OPTIONAL_PATHS=(scripts package-lock.json yarn.lock .eslintrc.js .prettierrc tsconfig.build.json .yarn .yarnrc.yml)

for path in "${REQUIRED_PATHS[@]}"; do
    if [ ! -e "$path" ]; then
        echo "❌ Missing required deployment path: $path"
        exit 1
    fi
    TAR_FILES+=("$path")
done

for path in "${OPTIONAL_PATHS[@]}"; do
    if [ -e "$path" ]; then
        TAR_FILES+=("$path")
        echo "  ✓ Including $path"
    fi
done

tar -czf be-source.tar.gz "${TAR_FILES[@]}"

echo "📤 Uploading..."
ssh "$SSH_USER@$HOST" "mkdir -p $SERVER_DIR"

if [ -f "be-source.tar.gz" ]; then
    scp be-source.tar.gz "$SSH_USER@$HOST:$SERVER_DIR/"
fi

if [ -f "$ENV_FILE" ]; then
    scp "$ENV_FILE" "$SSH_USER@$HOST:$SERVER_DIR/.env"
fi

echo "🚀 Deploying on server..."
ssh "$SSH_USER@$HOST" << EOF
set -euo pipefail

cd $SERVER_DIR

install_dependencies() {
    if [ -f "yarn.lock" ]; then
        if command -v yarn >/dev/null 2>&1; then
            yarn install --frozen-lockfile
            return
        fi

        if command -v corepack >/dev/null 2>&1; then
            corepack yarn install --frozen-lockfile
            return
        fi

        echo "❌ yarn.lock found but neither yarn nor corepack is available on server"
        exit 1
    fi

    if [ -f "package-lock.json" ]; then
        npm ci
        return
    fi

    npm install
}

run_build() {
    if [ -f "yarn.lock" ]; then
        if command -v yarn >/dev/null 2>&1; then
            yarn build
            return
        fi

        if command -v corepack >/dev/null 2>&1; then
            corepack yarn build
            return
        fi

        echo "❌ yarn.lock found but neither yarn nor corepack is available on server"
        exit 1
    fi

    npm run build
}

if [ -f "be-source.tar.gz" ]; then
    echo "Extracting source..."
    rm -rf src scripts prisma .yarn package.json package-lock.json yarn.lock ecosystem.config.js nest-cli.json tsconfig.json tsconfig.build.json .eslintrc.js .prettierrc .yarnrc.yml
    tar -xzf be-source.tar.gz
    rm -f be-source.tar.gz
fi

if [ "$INSTALL_DEPS" == "yes" ] || [ "$INSTALL_DEPS" == "y" ]; then
    echo "📦 Installing dependencies..."
    install_dependencies
else
    echo "⏭️ Skipping dependency installation..."
fi

echo "📦 Generating Prisma client..."
npx prisma generate

if [ "$RESET_DB" = "yes" ]; then
    echo "🗑️  Resetting database..."

    DB_URL=\$(grep '^DATABASE_URL=' .env | cut -d'=' -f2- | tr -d '"' | tr -d "'" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    if [ -z "\$DB_URL" ]; then
        echo "  ❌ Could not find DATABASE_URL in .env"
        exit 1
    fi

    DB_URL_CLEAN=\$(echo "\$DB_URL" | sed 's|^mysql://||')
    DB_USER=\$(echo "\$DB_URL_CLEAN" | cut -d':' -f1)
    DB_PASS=\$(echo "\$DB_URL_CLEAN" | sed 's|^[^:]*:||' | sed 's|@.*||')
    DB_HOST=\$(echo "\$DB_URL_CLEAN" | sed 's|.*@||' | cut -d':' -f1)
    DB_PORT=\$(echo "\$DB_URL_CLEAN" | sed 's|.*@[^:]*:||' | cut -d'/' -f1)
    DB_NAME=\$(echo "\$DB_URL_CLEAN" | sed 's|.*/||' | cut -d'?' -f1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    echo "  Database: [\$DB_NAME]"
    echo "  Host: \$DB_HOST:\$DB_PORT"
    echo "  User: \$DB_USER"

    echo "  Getting table list..."
    TABLES=\$(MYSQL_PWD="\$DB_PASS" mysql -u "\$DB_USER" -h "\$DB_HOST" -P "\$DB_PORT" "\$DB_NAME" -N -e "SHOW TABLES;" 2>/dev/null)

    if [ -n "\$TABLES" ]; then
        echo "  Found tables, creating drop script..."
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
    echo "🌱 Applying Prisma migrations..."
    npx prisma migrate deploy

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
    echo "📦 Applying Prisma migrations..."
    npx prisma migrate deploy
    echo "  ✅ Migrations applied"
fi

echo "📦 Building application on server..."
run_build

if [ -f "ecosystem.config.js" ]; then
    pm2 startOrReload ecosystem.config.js --update-env && pm2 save
fi

echo "✅ Deployed!"
pm2 list
EOF

echo ""
echo "✅ Deployment completed successfully!"
