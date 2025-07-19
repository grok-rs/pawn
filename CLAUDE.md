# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the **Pawn** professional chess tournament management application.

## 🎯 Application Overview

**Pawn** is a professional-grade chess tournament management system built with Tauri, featuring a comprehensive **Enhanced Player Registration and Management System** and **Team Tournament Support** alongside advanced tournament administration capabilities.

## 🧪 Test-Driven Development Guidelines

**Pawn follows a strict Test-Driven Development (TDD) approach. ALWAYS write tests before implementing features.**

### TDD Core Principles

**Red-Green-Refactor Cycle**:
1. **🔴 RED**: Write a failing test that describes the desired functionality
2. **🟢 GREEN**: Write the minimal code to make the test pass
3. **🔵 REFACTOR**: Clean up code while keeping tests green

### Test Categories & Coverage Requirements

**Test Types** (in order of implementation):
1. **Unit Tests**: Test individual functions/methods (90%+ coverage required)
2. **Integration Tests**: Test service layer with database (80%+ coverage required)
3. **Command Tests**: Test Tauri commands and API contracts (100% coverage required)
4. **End-to-End Tests**: Test complete user workflows (critical paths only)

**Coverage Standards**:
- **New Features**: 90% minimum test coverage before code review
- **Bug Fixes**: Must include regression tests
- **Refactoring**: All tests must pass, coverage cannot decrease

### TDD Workflow Commands

**Backend Testing**:
- **Run All Tests**: `cd src-tauri && cargo test`
- **Run Specific Module**: `cd src-tauri && cargo test swiss_pairing`
- **Run with Coverage**: `cd src-tauri && cargo tarpaulin --out Html`
- **Watch Tests**: `cd src-tauri && cargo watch -x test`

**Frontend Testing**:
- **Run Unit Tests**: `npm test` or `yarn test`
- **Run with Coverage**: `npm run test:coverage`
- **Watch Tests**: `npm run test:watch`
- **E2E Tests**: `npm run test:e2e`

**Integration Testing**:
- **Database Tests**: `cd src-tauri && cargo test --test integration`
- **Full Stack Tests**: `npm run test:integration`

## Essential Commands

### Development
- **Primary**: `yarn tauri dev` - Starts complete application with hot reload
- **Frontend Only**: `yarn dev` - Vite dev server on port 1420 (for UI-only work)
- **Backend Only**: `cd src-tauri && cargo build` - Compile Rust backend

### Testing (TDD Workflow)
- **Test First**: `cd src-tauri && cargo test [module_name] --watch` - Write failing tests
- **Implement**: Write minimal code to pass tests
- **Refactor**: Clean up while maintaining green tests
- **Coverage Check**: `cd src-tauri && cargo tarpaulin --out Html`

### Building
- **Frontend**: `yarn build` - TypeScript compilation and Vite build
- **Full Application**: `yarn tauri build` - Complete desktop app with installers
- **Development Build**: `cargo build` in src-tauri/ - Debug Rust build

### Database & Types
- **Migrations**: `cd src-tauri && sqlx migrate run --database-url sqlite:pawn.sqlite`
- **Type Generation**: Auto-generated on dev server start (TypeScript bindings from Rust)
- **Database Reset**: Remove `~/.local/share/pawn/db/pawn.sqlite` to reset database

### Enhanced Features Testing
- **Player Management**: Access comprehensive player features within tournament pages
- **Sample Data**: Use "Create Sample Tournament" in tournaments page for testing
- **Player Features**: All enhanced player management accessible via tournament info pages

### GitHub Operations
- **Issues & PRs**: Use `gh` command for all GitHub operations (view issues, PRs, comments)
- **View PR Comments**: `gh api repos/owner/repo/pulls/123/comments`
- **Analyze Issues**: `gh issue view 123` or `gh issue list`
- **Repository Info**: `gh repo view` for repository details
