#\!/bin/bash
set -e
RED="\033[0;31m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
NC="\033[0m"

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

DEPLOY_TARGET=${1:-"all"}

print_info "Deployment: $DEPLOY_TARGET"

# Build Functions
if [ "$DEPLOY_TARGET" = "all" ] || [ "$DEPLOY_TARGET" = "functions" ]; then
    print_info "Building Cloud Functions..."
    cd functions && npm run build && cd ..
    print_success "Functions built"
fi

# Build Admin Panel  
if [ "$DEPLOY_TARGET" = "all" ] || [ "$DEPLOY_TARGET" = "hosting" ]; then
    print_info "Building Admin Panel..."
    cd admin-panel && npm run build && cd ..
    print_success "Admin Panel built"
fi

# Deploy
firebase deploy --only $DEPLOY_TARGET
print_success "Deployment complete\!"
