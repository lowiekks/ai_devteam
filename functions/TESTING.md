# Testing Guide

## Overview

This document describes the testing strategy and setup for the Enterprise Dropshipping Monitor Cloud Functions.

## Test Stack

- **Test Framework**: Jest
- **Test Utilities**: Firebase Functions Test
- **Coverage Tool**: Jest Coverage (built-in)
- **TypeScript Support**: ts-jest

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- content-refinery.test.ts
```

## Test Structure

```
functions/
├── src/
│   ├── __tests__/              # Test files
│   │   ├── content-refinery.test.ts
│   │   ├── monitoring.test.ts
│   │   └── ...
│   ├── content-refinery/       # Source code
│   ├── monitoring/
│   └── ...
├── jest.config.js              # Jest configuration
└── package.json
```

## Writing Tests

### Basic Test Structure

```typescript
import * as admin from 'firebase-admin';
import * as functionsTest from 'firebase-functions-test';

const test = functionsTest();

describe('My Feature', () => {
  beforeAll(() => {
    // Setup
  });

  afterAll(() => {
    test.cleanup();
  });

  it('should do something', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

### Testing Cloud Functions

```typescript
import * as functions from '../index';
import * as functionsTest from 'firebase-functions-test';

const test = functionsTest();

describe('My Cloud Function', () => {
  afterAll(() => {
    test.cleanup();
  });

  it('should handle valid input', async () => {
    const wrapped = test.wrap(functions.myFunction);
    const result = await wrapped({ data: 'test' });

    expect(result.success).toBe(true);
  });
});
```

### Mocking Firestore

```typescript
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({ name: 'Test Product' }),
        })),
      })),
    })),
  })),
}));
```

### Testing API Calls

```typescript
import axios from 'axios';
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

it('should call external API', async () => {
  mockedAxios.get.mockResolvedValue({
    data: { result: 'success' },
  });

  const result = await myAPIFunction();
  expect(result).toBe('success');
  expect(mockedAxios.get).toHaveBeenCalledWith('https://api.example.com');
});
```

## Test Categories

### 1. Unit Tests

Test individual functions in isolation:

```typescript
describe('Text Refinement Utils', () => {
  it('should remove spam words', () => {
    const result = removeSpamWords('Hot New 2024 Product Sale');
    expect(result).not.toContain('Hot');
    expect(result).not.toContain('Sale');
  });
});
```

### 2. Integration Tests

Test multiple components working together:

```typescript
describe('Product Monitoring Integration', () => {
  it('should create product and start monitoring', async () => {
    const product = await createProduct(productData);
    const monitoring = await startMonitoring(product.id);

    expect(monitoring.status).toBe('ACTIVE');
  });
});
```

### 3. E2E Tests

Test complete workflows:

```typescript
describe('Complete Product Workflow', () => {
  it('should import, refine, and publish product', async () => {
    // 1. Import product
    const imported = await importProduct(url);

    // 2. Refine content
    const refined = await refineContent(imported.id);

    // 3. Publish to store
    const published = await publishToShopify(refined.id);

    expect(published.success).toBe(true);
  });
});
```

## Coverage Goals

- **Overall Coverage**: > 70%
- **Critical Modules**: > 80%
  - Content Refinery
  - Monitoring System
  - Payment/Billing

## Running Tests in CI/CD

Tests are automatically run in GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd functions && npm ci
      - run: cd functions && npm test
      - run: cd functions && npm run test:coverage
```

## Mocking External Services

### OpenAI API

```typescript
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"title": "Test"}' } }],
        }),
      },
    },
  })),
}));
```

### Replicate API

```typescript
jest.mock('replicate', () => ({
  Replicate: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue(['https://example.com/image.jpg']),
  })),
}));
```

### Firebase Admin

```typescript
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-user' }),
  }),
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
      })),
    })),
  }),
}));
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock External Dependencies**: Don't make real API calls in tests
3. **Use Descriptive Names**: Test names should clearly state what they test
4. **Test Edge Cases**: Include tests for error conditions
5. **Keep Tests Fast**: Unit tests should run in milliseconds
6. **Clean Up**: Always clean up resources after tests

## Debugging Tests

```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- content-refinery.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should refine text"

# Debug in VS Code
# Add breakpoint and use "Debug Jest Tests" configuration
```

## VS Code Debug Configuration

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/functions/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "cwd": "${workspaceFolder}/functions"
    }
  ]
}
```

## Common Issues

### Issue: "Cannot find module 'firebase-admin'"

**Solution**: Install dependencies
```bash
cd functions && npm install
```

### Issue: "firestore is not a function"

**Solution**: Properly mock firebase-admin
```typescript
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({ /* mock methods */ })),
}));
```

### Issue: Tests timeout

**Solution**: Increase timeout for slow tests
```typescript
jest.setTimeout(10000); // 10 seconds
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Firebase Functions Test](https://firebase.google.com/docs/functions/unit-testing)
- [Testing TypeScript](https://jestjs.io/docs/getting-started#via-ts-jest)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Last Updated**: 2024-11-14
