# Setup Guide
## Code Analysis Tool for TypeScript/JavaScript Projects

### 1. Development Environment Setup

#### 1.1 Prerequisites
```bash
# Required software versions
node --version  # >= 18.0.0
npm --version   # >= 9.0.0
git --version   # >= 2.0.0
```

#### 1.2 Project Initialization
```bash
# Create project directory
mkdir code-analyzer
cd code-analyzer

# Initialize npm project
npm init -y

# Initialize TypeScript
npm install --save-dev typescript @types/node
npx tsc --init

# Initialize Git
git init
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
echo "*.log" >> .gitignore
echo ".cache/" >> .gitignore
```

#### 1.3 TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests/**/*.test.ts"
  ]
}
```

#### 1.4 Development Dependencies
```bash
# Core dependencies
npm install --save-dev \
  typescript \
  @types/node \
  ts-node \
  nodemon \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin

# Testing utilities
npm install --save-dev \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @types/supertest
```

#### 1.5 Production Dependencies
```bash
# Core libraries
npm install \
  commander \
  chalk \
  ora \
  inquirer \
  fs-extra \
  glob \
  minimatch \
  semver

# Analysis libraries
npm install \
  typescript \
  @typescript-eslint/typescript-estree \
  acorn \
  acorn-walk
```

### 2. Project Structure Setup

#### 2.1 Directory Structure Creation
```bash
# Create directory structure
mkdir -p src/{cli,core,rules,plugins,utils,types,services}
mkdir -p src/core/{parser,analyzer,callgraph,reporter}
mkdir -p src/rules/{complexity,deadcode,dependencies,typescript}
mkdir -p config
mkdir -p schemas
mkdir -p tests/{unit,integration,fixtures}
mkdir -p docs
mkdir -p scripts
mkdir -p bin
```

#### 2.2 Directory Structure Overview
```
project-root/
├── src/
│   ├── cli/                    # Command-line interface
│   ├── core/                   # Core analysis engine
│   │   ├── parser/            # AST parsing and TypeScript integration
│   │   ├── analyzer/          # Main analysis orchestrator
│   │   ├── callgraph/         # Call graph construction
│   │   └── reporter/          # Output generation
│   ├── rules/                  # Built-in analysis rules
│   │   ├── complexity/        # Complexity-based rules
│   │   ├── deadcode/          # Dead code detection
│   │   ├── dependencies/      # Dependency analysis
│   │   └── typescript/        # TypeScript-specific rules
│   ├── plugins/               # Plugin management system
│   ├── utils/                 # Utility functions
│   ├── types/                 # TypeScript type definitions
│   └── services/              # Support services (cache, config, etc.)
├── config/                    # Default configurations
├── schemas/                   # JSON schemas for validation
├── tests/                     # Test suites
│   ├── unit/                  # Unit tests
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test data and mock projects
├── docs/                      # Documentation
├── scripts/                   # Build and utility scripts
└── bin/                       # Executable files
```

### 3. Configuration Management

#### 3.1 Configuration File Structure
```json
// cytrex.config.json (project-level configuration)
{
  "entryPoints": [
    "src/index.ts",
    "src/cli/cli.ts"
  ],
  "exclude": [
    "**/node_modules/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/dist/**",
    "**/.git/**"
  ],
  "rules": {
    "complexity": {
      "enabled": true,
      "threshold": 10,
      "cognitiveThreshold": 15,
      "severity": "warning"
    },
    "dead-code": {
      "enabled": true,
      "severity": "error",
      "excludeTests": true
    },
    "file-size": {
      "enabled": true,
      "maxFileSize": 500,
      "maxClassSize": 300,
      "severity": "warning"
    }
  },
  "dynamicMethods": {
    "patterns": [
      "*Controller.*",
      "*Handler.*",
      "*Service.*"
    ],
    "decorators": [
      "@api",
      "@route",
      "@handler",
      "@injectable"
    ],
    "keepAlive": [
      "main",
      "bootstrap",
      "setup"
    ]
  },
  "output": {
    "path": "./analysis-report.json",
    "format": "json",
    "includeCallGraph": true,
    "includeMetrics": true
  },
  "performance": {
    "maxWorkers": 4,
    "maxMemory": "4GB",
    "timeout": 300000,
    "incremental": true
  },
  "cache": {
    "enabled": true,
    "path": "./.cytrex-cache",
    "maxSize": "1GB",
    "ttl": 3600000
  }
}
```

#### 3.2 Global Configuration
```json
// ~/.cytrex/config.json (global defaults)
{
  "defaultRules": {
    "complexity": {
      "enabled": true,
      "threshold": 10,
      "severity": "warning"
    },
    "dead-code": {
      "enabled": true,
      "severity": "error"
    }
  },
  "performance": {
    "maxWorkers": 0,  // 0 = auto-detect CPU cores
    "maxMemory": "2GB",
    "timeout": 180000
  },
  "cache": {
    "enabled": true,
    "maxSize": "500MB",
    "ttl": 1800000
  },
  "telemetry": {
    "enabled": false,
    "endpoint": null
  }
}
```

### 4. Development Scripts

#### 4.1 Package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "ts-node src/cli/index.ts",
    "start": "node dist/cli/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "clean": "rm -rf dist",
    "prepack": "npm run build",
    "prepublishOnly": "npm run test && npm run lint",
    "format": "prettier --write src/**/*.ts",
    "format:check": "prettier --check src/**/*.ts"
  }
}
```

#### 4.2 Build Scripts
```bash
#!/bin/bash
# scripts/build.sh
set -e

echo "🧹 Cleaning previous build..."
npm run clean

echo "🔨 Building TypeScript..."
npm run build

echo "📦 Creating executable..."
chmod +x dist/cli/index.js

echo "✅ Build completed successfully!"
```

### 5. Testing Setup

#### 5.1 Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli/index.ts', // CLI entry point
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000
};
```

#### 5.2 Test Setup
```typescript
// tests/setup.ts
import * as path from 'path';
import * as fs from 'fs-extra';

// Global test configuration
global.testFixturesPath = path.join(__dirname, 'fixtures');
global.testOutputPath = path.join(__dirname, 'output');

// Setup test environment
beforeAll(async () => {
  // Ensure test output directory exists
  await fs.ensureDir(global.testOutputPath);
});

// Cleanup after tests
afterAll(async () => {
  // Clean up test output
  await fs.remove(global.testOutputPath);
});
```

### 6. Linting and Code Quality

#### 6.1 ESLint Configuration
```json
// .eslintrc.json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": [
    "@typescript-eslint"
  ],
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended"
  ],
  "env": {
    "node": true,
    "es2022": true
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": [
    "dist/",
    "node_modules/",
    "coverage/",
    "*.js"
  ]
}
```

#### 6.2 Prettier Configuration  
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "endOfLine": "lf"
}
```

### 7. Git and Version Control

#### 7.1 Git Hooks
```bash
#!/bin/sh
# .husky/pre-commit
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test
npm run format:check
```

#### 7.2 Git Ignore
```gitignore
# .gitignore
# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
*.tsbuildinfo

# Testing
coverage/
.nyc_output

# Environment variables
.env
.env.local

# Logs
logs
*.log

# Cache directories
.cache/
.cytrex-cache/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db
```

### 8. Documentation Setup

#### 8.1 TypeDoc Configuration
```json
// typedoc.json
{
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "theme": "default",
  "includeVersion": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeExternals": true,
  "readme": "README.md",
  "name": "Code Analyzer API Documentation",
  "tsconfig": "tsconfig.json"
}
```

#### 8.2 README Structure
```markdown
# Code Analyzer

## Installation
npm install -g code-analyzer

## Usage
code-analyzer analyze ./src

## Configuration
See [Configuration Guide](docs/configuration.md)

## API Documentation
See [API Docs](docs/api/index.html)
```

### 9. Deployment Preparation

#### 9.1 Package.json Configuration
```json
{
  "name": "code-analyzer",
  "version": "1.0.0",
  "description": "Real-time static code analysis tool for TypeScript/JavaScript projects",
  "main": "dist/index.js",
  "bin": {
    "code-analyzer": "dist/cli/index.js"
  },
  "files": [
    "dist/",
    "config/",
    "schemas/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "typescript",
    "javascript",
    "static-analysis",
    "code-quality",
    "dead-code-detection"
  ],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/code-analyzer.git"
  }
}
```

#### 9.2 CI/CD Configuration
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - run: npm run lint
    - run: npm run test
    - run: npm run test:coverage
```

This setup guide provides everything needed to establish a professional development environment for the code analysis tool, following industry best practices for TypeScript projects.
