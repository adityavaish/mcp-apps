# Contributing to MCP Server Collection

Thank you for your interest in contributing to the MCP Server Collection! This document outlines the process and best practices for contributions.

## Getting Started

### Prerequisites

Before you begin contributing, make sure you have:

- Node.js 18.0 or higher
- npm 8.0 or higher
- Git
- Visual Studio Code (recommended)
- Basic knowledge of TypeScript and MCP (Model Context Protocol)

### Setting Up Development Environment

1. **Fork the repository**
   - Create a fork of the repository on GitHub

2. **Clone your fork**
   ```powershell
   git clone https://github.com/your-username/mcp-apps.git
   cd mcp-apps
   ```

3. **Install dependencies**
   ```powershell
   # Install root dependencies if any
   npm install
   
   # Install dependencies for specific MCP server
   cd api-tools # or azure-devops, kusto-server, pdf-tools
   npm install
   ```

4. **Build the project**
   ```powershell
   npm run build
   ```

5. **Setup environment variables**
   - Create a `.env` file in the specific MCP server directory
   - Add required credentials based on the server type

## Development Workflow

### Creating a New Feature or Fix

1. **Create a new branch**
   ```powershell
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-fix-name
   ```

2. **Make your changes**
   - Follow the coding standards outlined below
   - Ensure all tests pass
   - Add new tests for your feature or fix

3. **Commit your changes**
   ```powershell
   git commit -m "Meaningful commit message describing your changes"
   ```

4. **Push your changes**
   ```powershell
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Go to the original repository
   - Click on "New Pull Request"
   - Select your branch
   - Provide a descriptive title and detailed description
   - Link any related issues

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Maintain strict typing where possible
- Document interfaces and complex types
- Use async/await for asynchronous operations

### Code Organization

- Place new tools in the appropriate `src/tools` directory
- Services should go in `src/services`
- Utilities should go in `src/utils`
- Organize imports alphabetically
- Export all public interfaces, types, and classes

### Naming Conventions

- Use camelCase for variables and function names
- Use PascalCase for class names, interfaces, and types
- Use descriptive names that explain the purpose

### Documentation

- Document all public methods and classes
- Include JSDoc comments for better IDE integration
- Provide examples for complex functionality
- Update README.md when adding new features

## Testing

### Writing Tests

- Write unit tests for all new functionality
- Place tests in the `test` directory
- Name test files with the pattern `test-*.ts`
- Use descriptive test names that explain what is being tested

### Running Tests

```powershell
# Run all tests
npm test

# Run specific tests
npm run test:api
```

## Creating a New MCP Server

If you're adding a completely new MCP server:

1. **Create a new directory** for your server
2. **Copy the basic structure** from an existing server
3. **Update package.json** with appropriate name and dependencies
4. **Create necessary README.md** documentation
5. **Implement the server** following MCP protocol specifications
6. **Add your server** to the main README.md

## Best Practices

### Security

- Never commit sensitive information (tokens, keys, etc.)
- Use proper authentication methods
- Validate all user inputs
- Handle errors gracefully

### Performance

- Minimize dependencies
- Optimize database queries
- Use caching where appropriate
- Implement proper connection pooling

### Azure Integration

- Follow Azure best practices for authentication and authorization
- Use managed identities when possible
- Implement proper error handling for Azure service calls
- Consider rate limits and throttling in Azure services

### MCP Protocol

- Follow the [MCP specification](https://modelcontextprotocol.io/)
- Provide consistent interfaces for AI assistants
- Implement proper resource descriptions
- Ensure tools are well-documented and useful

## Release Process

1. **Version Bumping**
   - Use semantic versioning (MAJOR.MINOR.PATCH)
   - Update version in package.json

2. **Changelog**
   - Update CHANGELOG.md with all significant changes
   - Group changes by type (Added, Fixed, Changed, Removed)

3. **Documentation**
   - Ensure README.md is up to date
   - Update any documentation that refers to changed features

4. **Publishing**
   - Publish to npm using `npm publish`
   - Tag the release in git

## Getting Help

If you need help or clarification, you can:

- Open an issue with the "question" label
- Reach out to the maintainers
- Check existing documentation and issues

## Code of Conduct

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md) in all your interactions with the project.

Thank you for contributing to the MCP Server Collection!
