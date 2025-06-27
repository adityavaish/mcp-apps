# Azure DevOps MCP Server Tests

This directory contains test files for the 7 PR analysis tools ported from the Copilot.Commerce.BM project.

## Test Files

### 1. `test-get-pr-basic-info.ts`
Tests the `get-pr-basic-info` tool which retrieves basic PR metadata including title, description, author, reviewers, and status.

### 2. `test-get-pr-code-diffs.ts`
Tests the `get-pr-code-diffs` tool which provides line-by-line diff information for code changes in pull requests.

### 3. `test-get-pr-detailed-changes.ts`
Tests the `get-pr-detailed-changes` tool which provides comprehensive file change information including additions, deletions, and modifications.

### 4. `test-get-pr-test-impact.ts`
Tests the `get-pr-test-impact` tool which analyzes test coverage implications of PR changes. Includes 5 comprehensive test scenarios:
- Basic test impact analysis
- Analysis without test files
- Basic depth analysis
- Comprehensive depth analysis  
- Error handling for invalid PRs

### 5. `test-get-prs-since-last-deployment.ts`
Tests the `get-prs-since-last-deployment` tool which retrieves PRs merged since the last successful production deployment.

### 6. `test-get-recent-prs.ts`
Tests the `get-recent-prs` tool which fetches recently completed PRs for risk assessment.

### 7. `test-get-repository-context.ts`
Tests the `get-repository-context` tool which provides comprehensive repository analysis. Includes 6 test scenarios:
- Full context analysis
- File structure only
- Activity analysis only
- Minimal context
- Error handling for invalid repos
- Error handling for invalid projects

## Running Tests

Use npm scripts to run individual tests:

```bash
# Run basic info test
npm run test:basic-info

# Run code diffs test
npm run test:code-diffs

# Run detailed changes test
npm run test:detailed-changes

# Run test impact analysis
npm run test:test-impact

# Run deployment tracking test
npm run test:deployment

# Run recent PRs test
npm run test:recent-prs

# Run repository context test
npm run test:repository-context

# Run default test (basic info)
npm test
```

## Test Requirements

- Valid Azure DevOps credentials configured
- Access to the target Azure DevOps organization and projects
- Node.js and TypeScript runtime (ts-node)

## Test Structure

Each test file includes:
- Multiple test scenarios covering different parameter combinations
- Error handling validation
- Response structure verification
- Comprehensive parameter testing
- Authentication failure handling

## Notes

- Tests use ES module imports with `.js` extensions for compatibility
- All tests include proper TypeScript typing
- Error handling tests verify graceful failure scenarios
- Tests are designed to work with the service-based architecture of the MCP server
