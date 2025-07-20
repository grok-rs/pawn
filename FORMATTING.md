# Code Formatting Setup

This project uses automated code formatting for both frontend (TypeScript/React) and backend (Rust) code to ensure consistent code style across the codebase.

## Available Commands

### Frontend Formatting (Prettier)
- `npm run format` - Format all frontend code (TypeScript, JavaScript, JSON, CSS, Markdown)
- `npm run format:check` - Check if frontend code needs formatting

### Backend Formatting (rustfmt)
- `npm run format:backend` - Format all Rust code
- `npm run format:backend:check` - Check if Rust code needs formatting

### Combined Formatting
- `npm run format:all` - Format both frontend and backend code
- `npm run format:all:check` - Check formatting for both frontend and backend

## Pre-commit Hook

The project uses **Husky** to automatically format code before commits. The pre-commit hook:

1. **🎨 Code Formatting**: Automatically formats both frontend and backend code
   - Checks if any files need formatting using `npm run format:all:check`
   - If formatting is needed, applies fixes with `npm run format:all`
   - Re-adds formatted files to the staging area
   
2. **🔍 Linting & Type Checking**: Runs ESLint and TypeScript checks
3. **🧪 TDD Compliance**: Enforces test-driven development practices
4. **📋 Quality Gates**: Additional quality checks for permissions, coverage, etc.

## Manual Usage

### Format all code before committing:
```bash
npm run format:all
```

### Check if code needs formatting:
```bash
npm run format:all:check
```

### Format only frontend code:
```bash
npm run format
```

### Format only backend code:
```bash
npm run format:backend
```

## IDE Integration

### VSCode
Add these settings to your `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer",
    "editor.formatOnSave": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Rust Analyzer
Make sure you have the Rust Analyzer extension installed, which provides automatic formatting for Rust files.

## Configuration Files

- **Frontend**: `.prettierrc` (if present) or defaults in `package.json`
- **Backend**: `rustfmt.toml` (if present) or Rust standard formatting
- **Git Hooks**: `.husky/pre-commit`

## Lint-staged Integration

The project also uses `lint-staged` to run formatting only on staged files:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{js,jsx,json,css,md}": ["prettier --write"],
    "src-tauri/src/**/*.rs": ["cd src-tauri && cargo fmt --"]
  }
}
```

## Benefits

1. **Consistency**: Ensures all code follows the same formatting standards
2. **No Debates**: Eliminates discussions about code style in PRs
3. **Automatic**: Formatting happens automatically before commits
4. **Cross-platform**: Works the same way on all development environments
5. **Multi-language**: Handles both TypeScript/React and Rust code formatting

## Troubleshooting

### Pre-commit hook fails
If the pre-commit hook fails, you can:
1. Run `npm run format:all` manually
2. Stage the formatted files: `git add .`
3. Commit again

### Skipping formatting (not recommended)
If you need to skip formatting checks temporarily:
```bash
git commit --no-verify
```

**Note**: This should only be used in exceptional circumstances and the code should be formatted in a follow-up commit.# Test formatting hook
