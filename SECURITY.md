# Security Policy

## Overview

This document outlines the security practices, policies, and guidelines for the Enterprise Dropshipping Monitor platform. Security is a critical aspect of our SaaS platform, as we handle sensitive data including user information, API credentials, and business data.

## Supported Versions

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.x.x   | :white_check_mark: | Current stable release |
| < 1.0   | :x:                | Development versions - not recommended for production |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email security concerns to: [your-security-email@example.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Every 7 days until resolution
- **Resolution Target**: Critical issues within 7 days, High within 14 days

## Security Best Practices

### 1. Credential Management

#### Firebase Service Account Keys

**CRITICAL**: Never commit Firebase service account keys to version control.

```bash
# These files should NEVER be committed:
*-firebase-adminsdk-*.json
service-account-key.json
serviceAccountKey.json
```

**Proper Usage**:
- Store service account keys in Google Cloud Secret Manager
- Use environment variables in Cloud Functions (set via Firebase CLI)
- For local development, store keys outside the repository

```bash
# Set service account for local development
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

#### API Keys

**Never commit real API keys**. Use `.env.example` with placeholder values:

```bash
# ❌ WRONG
OPENAI_API_KEY=sk-proj-X3if-K7M7kWqSh...

# ✅ CORRECT
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
```

**Setting API Keys in Production**:

```bash
# Firebase Cloud Functions
firebase functions:config:set \
  openai.api_key="sk-proj-..." \
  replicate.api_token="r8_..."

# Deploy
firebase deploy --only functions
```

### 2. Authentication & Authorization

#### User Authentication

- **Firebase Authentication** is the primary auth mechanism
- Supported methods: Email/Password, Google OAuth, Anonymous (demo only)
- **Production**: Disable anonymous authentication

```typescript
// ❌ DO NOT use in production
await signInAnonymously(auth);

// ✅ Use proper authentication
await signInWithEmailAndPassword(auth, email, password);
```

#### Function Authorization

All Cloud Functions must verify authentication:

```typescript
export const sensitiveFunction = functions.https.onCall(async (data, context) => {
  // Always verify auth
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  // Verify ownership
  if (resource.user_id !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized");
  }

  // ... function logic
});
```

#### Admin Endpoints

Admin endpoints must use secure authentication:

```typescript
// ❌ WEAK: Plain text header check
const adminKey = req.headers["x-admin-key"];
if (adminKey !== process.env.ADMIN_KEY) {
  res.status(403).send("Forbidden");
}

// ✅ BETTER: Use Firebase Admin SDK verification
const token = req.headers.authorization?.split('Bearer ')[1];
const decodedToken = await admin.auth().verifyIdToken(token);
const userRecord = await admin.auth().getUser(decodedToken.uid);

if (!userRecord.customClaims?.admin) {
  throw new functions.https.HttpsError("permission-denied", "Admin only");
}
```

### 3. Firestore Security Rules

**CRITICAL**: Always implement proper Firestore security rules.

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Products: users can only access their own
    match /products/{productId} {
      allow read, write: if request.auth != null &&
        resource.data.user_id == request.auth.uid;
    }

    // System metrics: read-only for authenticated users
    match /system_metrics/{metricId} {
      allow read: if request.auth != null;
      allow write: if false; // Only Cloud Functions can write
    }
  }
}
```

### 4. Input Validation

Always validate and sanitize user inputs to prevent injection attacks:

```typescript
// ✅ Validate inputs
import * as functions from "firebase-functions";

export const addProduct = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
  }

  // Validate required fields
  if (!data.url || typeof data.url !== 'string') {
    throw new functions.https.HttpsError("invalid-argument", "Valid URL required");
  }

  // Validate URL format
  const urlPattern = /^https?:\/\/(www\.)?(aliexpress|amazon|walmart)\.com\/.+$/;
  if (!urlPattern.test(data.url)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid supplier URL");
  }

  // Sanitize inputs before storage
  const sanitizedUrl = data.url.trim().toLowerCase();

  // ... continue with logic
});
```

### 5. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// Use Firebase App Check for mobile/web apps
// Use Cloud Armor for HTTP endpoints
```

### 6. Data Encryption

#### In Transit
- All API calls use HTTPS (enforced by Firebase)
- Cloud Tasks use HTTPS with service account authentication

#### At Rest
- Firestore data is encrypted by default
- Sensitive fields (API keys, tokens) stored in Google Cloud Secret Manager
- User passwords hashed by Firebase Authentication

### 7. Dependency Security

#### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Manual review required for breaking changes
npm audit fix --force
```

#### Automated Scanning

Enable GitHub Dependabot for automatic security updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/functions"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/dashboard"
    schedule:
      interval: "weekly"
```

### 8. Logging & Monitoring

#### Structured Logging

Use Firebase Logger for production logging:

```typescript
// ❌ DO NOT use console.log
console.log("User signed in:", userId);

// ✅ Use structured logging
functions.logger.info("User signed in", { userId, timestamp: new Date() });
```

#### Security Event Monitoring

Log security-relevant events:

```typescript
// Log authentication events
functions.logger.warn("Failed authentication attempt", {
  userId,
  ipAddress: req.ip,
  timestamp: new Date()
});

// Log authorization failures
functions.logger.error("Unauthorized access attempt", {
  userId,
  resource: productId,
  action: "delete"
});
```

## Security Checklist

Before deploying to production:

- [ ] All Firebase service account keys removed from repository
- [ ] All real API keys replaced with placeholders in `.env.example`
- [ ] `.gitignore` includes all sensitive file patterns
- [ ] Firestore security rules implemented and tested
- [ ] Anonymous authentication disabled (or restricted)
- [ ] All Cloud Functions verify authentication
- [ ] Input validation implemented for all user inputs
- [ ] HTTPS enforced for all endpoints
- [ ] Rate limiting configured
- [ ] Structured logging implemented
- [ ] Error messages don't expose sensitive information
- [ ] Dependencies audited for vulnerabilities (`npm audit`)
- [ ] Security monitoring enabled (Cloud Logging, Error Reporting)

## Known Security Issues (Resolved)

### 2024-11-14: Exposed Firebase Service Account Key
- **Severity**: Critical
- **Issue**: Firebase service account key committed to repository in `package.json`
- **Resolution**: Key revoked, proper package.json created, .gitignore updated
- **Action Required**: Rotate all API keys if repository was public

### 2024-11-14: Exposed API Keys in .env.example
- **Severity**: High
- **Issue**: Real OpenAI and Replicate API keys in .env.example files
- **Resolution**: Keys replaced with placeholders
- **Action Required**: Rotate exposed API keys

## Incident Response Plan

In case of a security incident:

1. **Immediate Actions**:
   - Revoke compromised credentials
   - Enable additional logging
   - Notify affected users (if applicable)

2. **Investigation**:
   - Review logs for unauthorized access
   - Identify scope of breach
   - Document timeline

3. **Remediation**:
   - Patch vulnerability
   - Deploy security fix
   - Update security documentation

4. **Post-Incident**:
   - Conduct security review
   - Update security practices
   - Train team on lessons learned

## Security Resources

- [Firebase Security Documentation](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security-related questions or concerns:
- Email: [your-security-email@example.com]
- Response time: Within 48 hours

---

**Last Updated**: 2024-11-14
**Version**: 1.0
