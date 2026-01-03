# Publishing to npm

This guide explains how to publish the `documents-mcp` package to npm.

## Prerequisites

1. **npm account**: Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **npm CLI**: Comes with Node.js installation
3. **Built package**: Run `npm run build` first

## Step-by-Step Guide

### 1. Login to npm

```bash
npm login
```

Enter your npm username, password, and email when prompted.

### 2. Verify Package Contents

Check what files will be included in the package:

```bash
npm pack --dry-run
```

Expected files:
- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Package documentation
- `LICENSE` - MIT license file
- `package.json` - Package manifest

### 3. Update Version (if needed)

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major
```

### 4. Publish

```bash
npm publish
```

For the first publish, if the package name is scoped (e.g., `@username/documents-mcp`):

```bash
npm publish --access public
```

### 5. Verify Publication

```bash
npm view documents-mcp
```

Or visit: https://www.npmjs.com/package/documents-mcp

## Publishing Updates

1. Make your changes
2. Update the version: `npm version patch|minor|major`
3. Build: `npm run build`
4. Publish: `npm publish`

## Troubleshooting

### "Package name already exists"

Choose a different name or use a scoped package:
1. Update `name` in `package.json` to `@yourusername/documents-mcp`
2. Publish with `npm publish --access public`

### "Must be logged in"

Run `npm login` and try again.

### "Build errors"

Ensure the build completes successfully:
```bash
npm run build
```

## Unpublishing (within 72 hours)

```bash
npm unpublish documents-mcp@1.0.0
```

> ⚠️ After 72 hours, packages cannot be unpublished. Use `npm deprecate` instead.
