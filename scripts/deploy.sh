#!/bin/bash

#############################################################
# Enterprise Dropshipping Monitor - Automated Deployment
# Phase 4: Content Refinery + Ecosystem
#############################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║     Enterprise Dropshipping Monitor - Deployment         ║
║              Phase 4: AI Ecosystem                        ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if running from project root
if [ ! -f "firebase.json" ]; then
    log_error "Must run from project root directory"
    exit 1
fi

# Parse command line arguments
DEPLOY_FUNCTIONS=false
DEPLOY_DASHBOARD=false
DEPLOY_FIRESTORE=false
DEPLOY_ALL=false
SKIP_TESTS=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --functions)
            DEPLOY_FUNCTIONS=true
            shift
            ;;
        --dashboard)
            DEPLOY_DASHBOARD=true
            shift
            ;;
        --firestore)
            DEPLOY_FIRESTORE=true
            shift
            ;;
        --all)
            DEPLOY_ALL=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: ./deploy.sh [--functions] [--dashboard] [--firestore] [--all] [--skip-tests] [--dry-run]"
            exit 1
            ;;
    esac
done

# If --all, enable all deployments
if [ "$DEPLOY_ALL" = true ]; then
    DEPLOY_FUNCTIONS=true
    DEPLOY_DASHBOARD=true
    DEPLOY_FIRESTORE=true
fi

# If nothing specified, default to all
if [ "$DEPLOY_FUNCTIONS" = false ] && [ "$DEPLOY_DASHBOARD" = false ] && [ "$DEPLOY_FIRESTORE" = false ]; then
    DEPLOY_ALL=true
    DEPLOY_FUNCTIONS=true
    DEPLOY_DASHBOARD=true
    DEPLOY_FIRESTORE=true
fi

log_info "Deployment Configuration:"
echo "  Functions:  $DEPLOY_FUNCTIONS"
echo "  Dashboard:  $DEPLOY_DASHBOARD"
echo "  Firestore:  $DEPLOY_FIRESTORE"
echo "  Skip Tests: $SKIP_TESTS"
echo "  Dry Run:    $DRY_RUN"
echo ""

#############################################################
# Step 1: Pre-flight Checks
#############################################################

log_info "Step 1: Running pre-flight checks..."

# Check if required commands exist
command -v node >/dev/null 2>&1 || { log_error "node is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { log_error "npm is required but not installed."; exit 1; }

log_success "Node.js and npm are installed"

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version 18 or higher required (current: $(node --version))"
    exit 1
fi
log_success "Node.js version check passed"

# Check if Firebase CLI is installed
if [ "$DEPLOY_FUNCTIONS" = true ] || [ "$DEPLOY_FIRESTORE" = true ]; then
    if ! command -v firebase >/dev/null 2>&1; then
        log_warning "Firebase CLI not found. Installing..."
        npm install -g firebase-tools
    fi
    log_success "Firebase CLI is available"
fi

# Check if Vercel CLI is installed
if [ "$DEPLOY_DASHBOARD" = true ]; then
    if ! command -v vercel >/dev/null 2>&1; then
        log_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    log_success "Vercel CLI is available"
fi

# Check if logged in to Firebase
if [ "$DEPLOY_FUNCTIONS" = true ] || [ "$DEPLOY_FIRESTORE" = true ]; then
    if ! firebase projects:list >/dev/null 2>&1; then
        log_error "Not logged in to Firebase. Run: firebase login"
        exit 1
    fi
    log_success "Firebase authentication verified"
fi

# Check Firebase project configuration
FIREBASE_PROJECT=$(grep -A 1 '"projects"' .firebaserc | grep 'default' | cut -d'"' -f4)
if [ "$FIREBASE_PROJECT" = "your-firebase-project-id" ]; then
    log_error "Firebase project ID not configured in .firebaserc"
    log_info "Update .firebaserc with your actual Firebase project ID"
    exit 1
fi
log_success "Firebase project: $FIREBASE_PROJECT"

# Check for environment variables
if [ "$DEPLOY_FUNCTIONS" = true ]; then
    if [ ! -f "functions/.env" ]; then
        log_warning "functions/.env not found"
        log_info "Create functions/.env from functions/.env.example"
        log_info "Required: OPENAI_API_KEY, REPLICATE_API_TOKEN, SENDGRID_API_KEY, APIFY_API_KEY"

        if [ "$DRY_RUN" = false ]; then
            exit 1
        fi
    else
        log_success "Environment file found"
    fi
fi

#############################################################
# Step 2: Run Tests
#############################################################

if [ "$SKIP_TESTS" = false ]; then
    log_info "Step 2: Running tests..."

    # Run Functions tests
    if [ "$DEPLOY_FUNCTIONS" = true ]; then
        log_info "Running Functions tests..."
        cd functions

        # Check if test script exists
        if npm run | grep -q "test"; then
            npm test || {
                log_error "Functions tests failed"
                exit 1
            }
            log_success "Functions tests passed"
        else
            log_warning "No test script found in functions/package.json"
        fi

        cd ..
    fi

    # Run Dashboard tests
    if [ "$DEPLOY_DASHBOARD" = true ]; then
        log_info "Running Dashboard tests..."
        cd dashboard

        # Check if test script exists
        if npm run | grep -q "test"; then
            npm test || {
                log_error "Dashboard tests failed"
                exit 1
            }
            log_success "Dashboard tests passed"
        else
            log_warning "No test script found in dashboard/package.json"
        fi

        cd ..
    fi
else
    log_warning "Skipping tests (--skip-tests flag set)"
fi

#############################################################
# Step 3: Build Functions
#############################################################

if [ "$DEPLOY_FUNCTIONS" = true ]; then
    log_info "Step 3: Building Cloud Functions..."

    cd functions

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Build TypeScript
    log_info "Compiling TypeScript..."
    npm run build || {
        log_error "TypeScript compilation failed"
        exit 1
    }

    log_success "Functions built successfully"

    # Show function count
    FUNCTION_COUNT=$(ls lib/*.js 2>/dev/null | wc -l)
    log_info "Compiled $FUNCTION_COUNT function files"

    cd ..
fi

#############################################################
# Step 4: Build Dashboard
#############################################################

if [ "$DEPLOY_DASHBOARD" = true ]; then
    log_info "Step 4: Building Dashboard..."

    cd dashboard

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Build Next.js
    log_info "Building Next.js application..."
    npm run build || {
        log_error "Dashboard build failed"
        exit 1
    }

    log_success "Dashboard built successfully"

    cd ..
fi

#############################################################
# Step 5: Deploy to Firebase
#############################################################

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN MODE - Skipping actual deployment"
else
    if [ "$DEPLOY_FIRESTORE" = true ]; then
        log_info "Step 5a: Deploying Firestore rules and indexes..."

        firebase deploy --only firestore || {
            log_error "Firestore deployment failed"
            exit 1
        }

        log_success "Firestore deployed successfully"
    fi

    if [ "$DEPLOY_FUNCTIONS" = true ]; then
        log_info "Step 5b: Deploying Cloud Functions..."

        # Show what will be deployed
        log_info "Functions to deploy:"
        grep "export" functions/src/index.ts | grep "from" | sed 's/export.*from/  -/' | sed 's/[";]//g'

        firebase deploy --only functions || {
            log_error "Functions deployment failed"
            exit 1
        }

        log_success "Functions deployed successfully"

        # Get function URLs
        log_info "Function URLs:"
        firebase functions:list | grep -E "http|https"
    fi
fi

#############################################################
# Step 6: Deploy to Vercel
#############################################################

if [ "$DEPLOY_DASHBOARD" = true ]; then
    if [ "$DRY_RUN" = true ]; then
        log_warning "DRY RUN MODE - Would deploy to Vercel"
    else
        log_info "Step 6: Deploying Dashboard to Vercel..."

        cd dashboard

        # Deploy to production
        vercel --prod || {
            log_error "Vercel deployment failed"
            exit 1
        }

        log_success "Dashboard deployed to Vercel"

        cd ..
    fi
fi

#############################################################
# Step 7: Post-Deployment Tasks
#############################################################

if [ "$DRY_RUN" = false ]; then
    log_info "Step 7: Running post-deployment tasks..."

    if [ "$DEPLOY_FUNCTIONS" = true ]; then
        # Initialize plugins in Firestore
        log_info "Initializing plugins..."
        log_warning "TODO: Call initializePlugins function manually"
        log_info "Run: curl -X POST https://[region]-[project].cloudfunctions.net/initializePlugins"
    fi

    # Verify deployment
    log_info "Verifying deployment..."

    if [ "$DEPLOY_FUNCTIONS" = true ]; then
        log_info "Checking function health..."
        firebase functions:list >/dev/null 2>&1 && log_success "Functions are live" || log_error "Functions check failed"
    fi

    if [ "$DEPLOY_DASHBOARD" = true ]; then
        log_info "Checking dashboard health..."
        log_warning "TODO: Verify dashboard URL is accessible"
    fi
fi

#############################################################
# Step 8: Summary
#############################################################

echo ""
log_success "═══════════════════════════════════════════════════════════"
log_success "           DEPLOYMENT COMPLETED SUCCESSFULLY!"
log_success "═══════════════════════════════════════════════════════════"
echo ""

if [ "$DEPLOY_FUNCTIONS" = true ]; then
    echo -e "${GREEN}✓${NC} Cloud Functions deployed to Firebase"
fi

if [ "$DEPLOY_DASHBOARD" = true ]; then
    echo -e "${GREEN}✓${NC} Dashboard deployed to Vercel"
fi

if [ "$DEPLOY_FIRESTORE" = true ]; then
    echo -e "${GREEN}✓${NC} Firestore rules and indexes deployed"
fi

echo ""
log_info "Next Steps:"
echo "  1. Initialize plugins: Call initializePlugins function"
echo "  2. Configure Stripe: Follow STRIPE_SETUP.md"
echo "  3. Set up TikTok API: Follow TIKTOK_API_SETUP.md (optional)"
echo "  4. Test deployment: Follow TESTING_GUIDE.md"
echo ""

log_info "Documentation:"
echo "  - DEPLOYMENT.md - Deployment guide"
echo "  - STRIPE_SETUP.md - Payment setup"
echo "  - TESTING_GUIDE.md - Testing procedures"
echo "  - DEPLOYMENT_SUMMARY.md - Status overview"
echo ""

if [ "$DRY_RUN" = true ]; then
    log_warning "This was a DRY RUN - no actual deployment occurred"
    log_info "Run without --dry-run to deploy for real"
fi

log_success "Done! 🚀"
