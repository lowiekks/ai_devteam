# 🔒 Security Policy

## ⚠️ CRITICAL: Firebase Service Account Key

**NEVER commit `firebase-service-account.json` or files matching `*-firebase-adminsdk-*.json` to git!**

These files contain private keys that grant full admin access to your Firebase project.

### What to do if you accidentally committed keys:

1. **Revoke the key immediately** in [Firebase Console](https://console.firebase.google.com/)
   - Go to Project Settings > Service Accounts
   - Delete the compromised key

2. **Remove from git history:**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch firebase-service-account.json" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **Generate new service account key** in Firebase Console

4. **Force push** (⚠️ coordinate with team first!)
   ```bash
   git push origin --force --all
   ```

### Correct Storage:

- ✅ Store in secure password manager (1Password, LastPass, etc.)
- ✅ Use environment variables in CI/CD (GitHub Secrets, etc.)
- ✅ Add to `.gitignore` (already configured)
- ✅ Encrypt if stored locally
- ❌ Never commit to repository
- ❌ Never share via Slack/email/messaging apps
- ❌ Never store in cloud storage (Dropbox, Google Drive, etc.)

---

## 🛡️ Reporting Security Issues

If you discover a security vulnerability in this project:

1. **DO NOT** open a public GitHub issue
2. Email: **security@example.com** (replace with your email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within **48 hours** and provide updates every **7 days** until resolved.

---

## 🔐 Best Practices

### API Keys & Credentials

- ✅ Use environment variables for all sensitive data
- ✅ Rotate API keys every 90 days
- ✅ Use separate keys for dev/staging/production
- ✅ Implement key expiration policies
- ❌ Never hardcode keys in source code
- ❌ Never log sensitive data

### Firebase Security

#### Authentication
- ✅ Enable 2FA on all Firebase/Google accounts
- ✅ Use Firebase Auth for user authentication
- ✅ Implement email verification
- ✅ Set password strength requirements
- ✅ Monitor auth logs for suspicious activity

#### Firestore Rules
```javascript
// Example secure rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Products - users can only modify their own
    match /products/{productId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null
        && request.resource.data.user_id == request.auth.uid;
    }
  }
}
```

#### Storage Rules
```javascript
// Example secure storage rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Cloud Functions

- ✅ Validate all input data
- ✅ Implement rate limiting
- ✅ Use HTTPS only
- ✅ Set appropriate CORS policies
- ✅ Log security-relevant events
- ❌ Never trust client-side data
- ❌ Never expose internal errors to clients

### Dependencies

- ✅ Run `npm audit` regularly
- ✅ Keep dependencies up to date
- ✅ Use `npm audit fix` to patch vulnerabilities
- ✅ Review security advisories
- ❌ Don't ignore security warnings

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# For breaking changes
npm audit fix --force
```

### Environment Variables

Never commit these files:
- `.env`
- `.env.local`
- `.env.development.local`
- `.env.production.local`
- `firebase-service-account.json`

Use `.env.example` files instead:
```env
# .env.example
OPENAI_API_KEY=your-key-here
FIREBASE_PROJECT_ID=your-project-id
```

---

## 🔍 Security Checklist

### Before Deployment

- [ ] All sensitive data in environment variables
- [ ] No hardcoded credentials in code
- [ ] Firebase rules reviewed and tested
- [ ] HTTPS enforced for all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies scanned (`npm audit`)
- [ ] 2FA enabled on all accounts

### Regular Maintenance

- [ ] Rotate API keys (quarterly)
- [ ] Review access logs (monthly)
- [ ] Update dependencies (weekly)
- [ ] Security audit (quarterly)
- [ ] Backup encryption keys (monthly)

---

## 🚨 Incident Response

If a security breach occurs:

1. **Contain**
   - Disable compromised credentials immediately
   - Block suspicious IP addresses
   - Enable maintenance mode if necessary

2. **Assess**
   - Determine scope of breach
   - Identify affected systems/data
   - Document timeline of events

3. **Notify**
   - Inform security team
   - Notify affected users (if PII compromised)
   - Report to authorities (if required by law)

4. **Remediate**
   - Patch vulnerabilities
   - Reset all credentials
   - Update security measures

5. **Review**
   - Conduct post-mortem
   - Update security policies
   - Implement preventive measures

---

## 📚 Resources

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Next.js Security](https://nextjs.org/docs/pages/building-your-application/configuring/content-security-policy)

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-14 | Initial security policy |

---

**Stay secure! 🔒**
