# Publishing to JSR (JavaScript Registry)

This guide explains how to publish the `documents-mcp` package to [jsr.io](https://jsr.io).

## Prerequisites

1. **JSR account**: Sign up at [jsr.io](https://jsr.io) using GitHub
2. **Deno CLI** (optional but recommended): https://deno.land/manual/getting_started/installation
3. **Built package**: Run `npm run build` first

## Step-by-Step Guide

### 1. Create jsr.json Configuration

Create a `jsr.json` file in your project root:

```json
{
  "$schema": "https://jsr.io/schema/config-file.v1.json",
  "name": "@harjjotsinghh/documents-mcp",
  "version": "1.0.0",
  "exports": {
    ".": "./src/index.ts"
  },
  "publish": {
    "include": [
      "src/**/*.ts",
      "README.md",
      "LICENSE"
    ]
  }
}
```

### 2. Login to JSR

Using Deno:
```bash
deno publish --dry-run
```

This will prompt you to authenticate via browser.

Using npx:
```bash
npx jsr login
```

### 3. Verify Package Contents

```bash
deno publish --dry-run
# or
npx jsr publish --dry-run
```

### 4. Publish

```bash
deno publish --allow-slow-types
# or
npx jsr publish --allow-slow-types
```

### 5. Verify Publication

Visit: https://jsr.io/@harjjotsinghh/documents-mcp

## Package Naming on JSR

JSR uses scoped packages by default:
- Format: `@scope/package-name`
- Your scope is typically your GitHub username
- Example: `@harjjotsinghh/documents-mcp`

## Publishing Updates

1. Update the version in `jsr.json`
2. Build: `npm run build`
3. Publish: `deno publish` or `npx jsr publish`

## Using JSR Packages

### In Deno

```typescript
import { ... } from "jsr:@harjjotsinghh/documents-mcp";
```

### In Node.js

Add the JSR registry to `.npmrc`:

```
@jsr:registry=https://npm.jsr.io
```

Then install:

```bash
npm install @jsr/harjjotsinghh__documents-mcp
```

## Troubleshooting

### "Scope not found"

Create a scope first at https://jsr.io/new

### "Package already exists"

Each scope+name combination must be unique. Either:
1. Use a different name
2. Request scope transfer if it's your username

### "Build artifacts not found"

Ensure the build was successful:
```bash
npm run build
ls dist/
```

## Key Differences from npm

| Feature | npm | JSR |
|---------|-----|-----|
| Package names | Global or scoped | Always scoped |
| TypeScript | Requires build | Native support |
| Registry | npmjs.com | jsr.io |
| Install command | `npm install pkg` | `deno add pkg` or via npm |
