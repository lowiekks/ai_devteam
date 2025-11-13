#!/bin/bash

#############################################################
# Pre-flight Deployment Check
# Validates environment is ready for deployment
#############################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Pre-flight Deployment Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

#############################################################
# 1. System Requirements
#############################################################

echo "1. System Requirements"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        check_pass "Node.js $NODE_VERSION (>= 18 required)"
    else
        check_fail "Node.js $NODE_VERSION (>= 18 required)"
    fi
else
    check_fail "Node.js not installed"
fi

# npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    check_pass "npm $NPM_VERSION"
else
    check_fail "npm not installed"
fi

# Git
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    check_pass "Git $GIT_VERSION"
else
    check_warn "Git not installed (optional but recommended)"
fi

echo ""

#############################################################
# 2. CLI Tools
#############################################################

echo "2. CLI Tools"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Firebase CLI
if command -v firebase >/dev/null 2>&1; then
    FIREBASE_VERSION=$(firebase --version)
    check_pass "Firebase CLI $FIREBASE_VERSION"
else
    check_fail "Firebase CLI not installed (run: npm install -g firebase-tools)"
fi

# Vercel CLI
if command -v vercel >/dev/null 2>&1; then
    VERCEL_VERSION=$(vercel --version)
    check_pass "Vercel CLI $VERCEL_VERSION"
else
    check_fail "Vercel CLI not installed (run: npm install -g vercel)"
fi

echo ""

#############################################################
# 3. Authentication
#############################################################

echo "3. Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Firebase login
if command -v firebase >/dev/null 2>&1; then
    if firebase projects:list >/dev/null 2>&1; then
        check_pass "Firebase authenticated"

        # List projects
        PROJECTS=$(firebase projects:list 2>/dev/null | tail -n +4 | head -n -1 | wc -l)
        check_info "  Found $PROJECTS Firebase project(s)"
    else
        check_fail "Not logged in to Firebase (run: firebase login)"
    fi
else
    check_fail "Cannot check Firebase auth (CLI not installed)"
fi

# Vercel login
if command -v vercel >/dev/null 2>&1; then
    if vercel whoami >/dev/null 2>&1; then
        VERCEL_USER=$(vercel whoami 2>/dev/null)
        check_pass "Vercel authenticated (user: $VERCEL_USER)"
    else
        check_fail "Not logged in to Vercel (run: vercel login)"
    fi
else
    check_fail "Cannot check Vercel auth (CLI not installed)"
fi

echo ""

#############################################################
# 4. Project Configuration
#############################################################

echo "4. Project Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Check firebase.json
if [ -f "firebase.json" ]; then
    check_pass "firebase.json exists"
else
    check_fail "firebase.json not found"
fi

# Check .firebaserc
if [ -f ".firebaserc" ]; then
    check_pass ".firebaserc exists"

    FIREBASE_PROJECT=$(grep -A 1 '"projects"' .firebaserc | grep 'default' | cut -d'"' -f4)
    if [ "$FIREBASE_PROJECT" = "your-firebase-project-id" ]; then
        check_fail "  Firebase project ID not configured (update .firebaserc)"
    else
        check_pass "  Firebase project ID: $FIREBASE_PROJECT"
    fi
else
    check_fail ".firebaserc not found"
fi

# Check functions/package.json
if [ -f "functions/package.json" ]; then
    check_pass "functions/package.json exists"
else
    check_fail "functions/package.json not found"
fi

# Check dashboard/package.json
if [ -f "dashboard/package.json" ]; then
    check_pass "dashboard/package.json exists"
else
    check_fail "dashboard/package.json not found"
fi

echo ""

#############################################################
# 5. Dependencies
#############################################################

echo "5. Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Functions dependencies
if [ -d "functions/node_modules" ]; then
    FUNC_DEPS=$(ls functions/node_modules | wc -l)
    check_pass "Functions dependencies installed ($FUNC_DEPS packages)"
else
    check_warn "Functions dependencies not installed (run: cd functions && npm install)"
fi

# Dashboard dependencies
if [ -d "dashboard/node_modules" ]; then
    DASH_DEPS=$(ls dashboard/node_modules | wc -l)
    check_pass "Dashboard dependencies installed ($DASH_DEPS packages)"
else
    check_warn "Dashboard dependencies not installed (run: cd dashboard && npm install)"
fi

echo ""

#############################################################
# 6. Environment Variables
#############################################################

echo "6. Environment Variables"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Functions .env
if [ -f "functions/.env" ]; then
    check_pass "functions/.env exists"

    # Check required variables
    if grep -q "OPENAI_API_KEY=sk-" functions/.env; then
        check_pass "  OPENAI_API_KEY configured"
    else
        check_fail "  OPENAI_API_KEY not configured"
    fi

    if grep -q "REPLICATE_API_TOKEN=r8_" functions/.env; then
        check_pass "  REPLICATE_API_TOKEN configured"
    else
        check_fail "  REPLICATE_API_TOKEN not configured"
    fi

    if grep -q "SENDGRID_API_KEY=SG." functions/.env; then
        check_pass "  SENDGRID_API_KEY configured"
    else
        check_warn "  SENDGRID_API_KEY not configured (optional)"
    fi

    if grep -q "APIFY_API_KEY=apify_api_" functions/.env; then
        check_pass "  APIFY_API_KEY configured"
    else
        check_warn "  APIFY_API_KEY not configured (optional)"
    fi
else
    check_fail "functions/.env not found (copy from .env.example)"
fi

# Dashboard .env.local
if [ -f "dashboard/.env.local" ]; then
    check_pass "dashboard/.env.local exists"

    if grep -q "NEXT_PUBLIC_FIREBASE_API_KEY=AIza" dashboard/.env.local; then
        check_pass "  Firebase config present"
    else
        check_fail "  Firebase config incomplete"
    fi
else
    check_warn "dashboard/.env.local not found (copy from .env.local.example)"
fi

echo ""

#############################################################
# 7. Build Status
#############################################################

echo "7. Build Status"
echo "━━━━━━━━━━━━━━━━━━━━━━"

# Functions build
if [ -d "functions/lib" ]; then
    FUNC_BUILD_FILES=$(ls functions/lib/*.js 2>/dev/null | wc -l)
    if [ $FUNC_BUILD_FILES -gt 0 ]; then
        check_pass "Functions built ($FUNC_BUILD_FILES JS files)"
    else
        check_warn "Functions lib directory empty (run: cd functions && npm run build)"
    fi
else
    check_warn "Functions not built (run: cd functions && npm run build)"
fi

# Dashboard build
if [ -d "dashboard/.next" ]; then
    check_pass "Dashboard built (.next directory exists)"
else
    check_warn "Dashboard not built (run: cd dashboard && npm run build)"
fi

echo ""

#############################################################
# 8. Firestore Configuration
#############################################################

echo "8. Firestore Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "firestore.rules" ]; then
    check_pass "firestore.rules exists"
else
    check_fail "firestore.rules not found"
fi

if [ -f "firestore.indexes.json" ]; then
    check_pass "firestore.indexes.json exists"

    INDEX_COUNT=$(grep -c '"collectionGroup"' firestore.indexes.json 2>/dev/null || echo "0")
    check_info "  $INDEX_COUNT index(es) defined"
else
    check_fail "firestore.indexes.json not found"
fi

echo ""

#############################################################
# 9. Documentation
#############################################################

echo "9. Documentation"
echo "━━━━━━━━━━━━━━━━━━━━━━"

REQUIRED_DOCS=(
    "DEPLOYMENT.md"
    "DEPLOYMENT_SUMMARY.md"
    "STRIPE_SETUP.md"
    "TIKTOK_API_SETUP.md"
    "TESTING_GUIDE.md"
    "CONTENT_REFINERY.md"
    "ECOSYSTEM.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$doc exists"
    else
        check_warn "$doc not found"
    fi
done

echo ""

#############################################################
# 10. Git Status
#############################################################

echo "10. Git Status"
echo "━━━━━━━━━━━━━━━━━━━━━━"

if command -v git >/dev/null 2>&1; then
    if git rev-parse --git-dir > /dev/null 2>&1; then
        BRANCH=$(git branch --show-current)
        check_pass "Git repository initialized (branch: $BRANCH)"

        UNCOMMITTED=$(git status --porcelain | wc -l)
        if [ $UNCOMMITTED -eq 0 ]; then
            check_pass "  No uncommitted changes"
        else
            check_warn "  $UNCOMMITTED uncommitted change(s)"
        fi

        UNPUSHED=$(git log --branches --not --remotes | wc -l)
        if [ $UNPUSHED -eq 0 ]; then
            check_pass "  All changes pushed"
        else
            check_warn "  $UNPUSHED unpushed commit(s)"
        fi
    else
        check_warn "Not a git repository"
    fi
fi

echo ""

#############################################################
# Summary
#############################################################

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy.${NC}"
    echo ""
    echo "Run deployment with:"
    echo "  ./scripts/deploy.sh --all"
    echo ""
    EXIT_CODE=0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found. Review before deploying.${NC}"
    echo ""
    echo "You can proceed with:"
    echo "  ./scripts/deploy.sh --all"
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo ""
    echo "Fix errors before deploying. See above for details."
    echo ""
    EXIT_CODE=1
fi

echo "For detailed deployment instructions, see: DEPLOYMENT.md"
echo ""

exit $EXIT_CODE
