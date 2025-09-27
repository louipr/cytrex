# Contributing to Cytrex

Welcome to the Cytrex code analysis tool development! This guide outlines the development workflow, coding standards, and contribution process.

## Development Philosophy

### Architecture-First Development
- **Complete Design**: System architecture fully documented before implementation
- **Validated Approach**: Real-world testing confirms design effectiveness (57% false positive reduction)
- **Performance-Driven**: Specific performance targets guide implementation decisions

### Quality Standards
- **Type Safety**: Full TypeScript strict mode compliance
- **Test Coverage**: >90% test coverage requirement
- **Documentation**: JSDoc for all public APIs
- **Performance**: Meets specified benchmarks for all project sizes

## Project Status & Phases

### Current Phase: Implementation Preparation
**Status**: Architecture & Documentation Complete ✅

**Next Steps**:
1. **Code Extraction**: Parse implementation files from `intake/docs/`
2. **Module Organization**: Structure code according to architecture design
3. **Test Suite**: Implement comprehensive testing framework
4. **Performance Validation**: Verify performance targets

### Implementation Resources Available
- **Complete Implementation**: Working code in `intake/docs/` files (Opus-generated)
- **Architecture Documentation**: System design in `cytrex/docs/`
- **Real-world Validation**: Tested against Spark project edge cases
- **Performance Benchmarks**: Established targets and optimization strategies

## Development Workflow

### 1. Environment Setup
Follow the complete setup guide in [setup-guide.md](setup-guide.md):

```bash
# Prerequisites: Node.js 18+, npm 9+, git 2+
git clone <repository-url>
cd cytrex
npm install
npm run build
npm test
```

### 2. Code Organization Strategy

#### From `intake/docs/` to `src/` Structure:
```
intake/docs/ (Source Files)           →    src/ (Target Structure)
├── complete_implementation.md        →    ├── types/index.ts
├── builtin_rules_implementation.md   →    ├── rules/{complexity,deadcode,etc}/
├── cli_and_tests.md                  →    ├── cli/index.ts
└── architecture.md (code sections)   →    └── core/{parser,analyzer,etc}/
```

#### Implementation Parsing Approach:
1. **Extract TypeScript Blocks**: Parse ```typescript blocks from markdown
2. **Organize by File Path**: Use file path comments to structure modules  
3. **Validate Architecture**: Ensure extracted code aligns with architecture design
4. **Test Integration**: Implement tests alongside code extraction

### 3. Coding Standards

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

#### Code Style Requirements
- **ESLint**: All code must pass linting without warnings
- **Prettier**: Consistent code formatting (2 spaces, single quotes, 100 char width)
- **Naming Conventions**: 
  - Classes: PascalCase (`AnalysisEngine`)
  - Functions/Variables: camelCase (`parseProject`)
  - Constants: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
  - Files: kebab-case (`call-graph-builder.ts`)

#### Documentation Requirements
```typescript
/**
 * Analyzes a TypeScript project for code quality issues.
 * 
 * @param projectPath - Root path of the project to analyze
 * @param config - Analysis configuration options
 * @returns Promise resolving to complete analysis results
 * @throws {InvalidProjectError} When project structure is invalid
 * 
 * @example
 * ```typescript
 * const analyzer = new Analyzer(config);
 * const results = await analyzer.analyze('./src');
 * console.log(`Found ${results.issues.length} issues`);
 * ```
 */
async analyze(projectPath: string, config: AnalyzerConfig): Promise<AnalysisResult>
```

### 4. Testing Requirements

#### Test Structure
```
tests/
├── unit/                    # Component-level tests
│   ├── parser/             # Parser engine tests
│   ├── rules/              # Rule implementation tests
│   └── utils/              # Utility function tests
├── integration/            # End-to-end workflow tests
│   ├── small-project/      # < 1000 files test
│   ├── medium-project/     # 1000-10000 files test
│   └── large-project/      # > 10000 files test
└── fixtures/               # Test data and mock projects
    ├── spark-project/      # Real-world validation project
    └── synthetic/          # Generated test projects
```

#### Test Coverage Requirements
- **Unit Tests**: >95% coverage for core components
- **Integration Tests**: Complete workflow validation
- **Performance Tests**: Verify analysis speed targets
- **Edge Case Tests**: Handle malformed code gracefully

#### Performance Test Benchmarks
```typescript
describe('Performance Requirements', () => {
  it('should analyze small projects in <5 seconds', async () => {
    const start = Date.now();
    await analyzer.analyze('./fixtures/small-project');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  it('should use <500MB memory for small projects', async () => {
    const memBefore = process.memoryUsage().heapUsed;
    await analyzer.analyze('./fixtures/small-project');  
    const memAfter = process.memoryUsage().heapUsed;
    expect(memAfter - memBefore).toBeLessThan(500 * 1024 * 1024);
  });
});
```

### 5. Implementation Guidelines

#### Architecture Compliance
- **Single Responsibility**: Each class/module has one clear purpose
- **Dependency Injection**: Constructor-based dependency management
- **Interface Segregation**: Small, focused interfaces
- **Plugin Architecture**: Extensible rule system with stable APIs

#### Error Handling Strategy
```typescript
// Classify errors appropriately
class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly file: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

// Graceful degradation
try {
  const result = await parseFile(filePath);
  return result;
} catch (error) {
  if (error instanceof AnalysisError && error.recoverable) {
    logger.warn(`Skipping file ${error.file}: ${error.message}`);
    return null; // Continue with other files
  }
  throw error; // Re-throw critical errors
}
```

#### Performance Optimization Guidelines
- **Lazy Loading**: Load TypeScript programs only when needed
- **Caching**: Cache AST parsing results with file hash validation
- **Streaming**: Process large projects in batches
- **Worker Threads**: Parallelize independent analysis tasks

### 6. Code Review Process

#### Pre-Review Checklist
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Architecture compliance verified

#### Review Criteria
1. **Correctness**: Code works as intended with edge cases handled
2. **Performance**: Meets established performance targets
3. **Maintainability**: Clean, readable code with appropriate abstractions
4. **Security**: Input validation and resource management
5. **Testing**: Comprehensive test coverage with meaningful assertions

### 7. Git Workflow

#### Branch Naming Convention
- `feature/parser-engine-implementation`
- `bugfix/call-graph-memory-leak`
- `performance/parallel-processing`
- `docs/api-documentation-update`

#### Commit Message Format
```
type(scope): short description

Longer description explaining the change and why it was made.

- Specific change 1
- Specific change 2

Refs: #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

#### Pull Request Template
```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Performance benchmarks met

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

### 8. Release Process

#### Version Numbering
- **Major** (x.0.0): Breaking API changes
- **Minor** (0.x.0): New features, backwards compatible
- **Patch** (0.0.x): Bug fixes, performance improvements

#### Release Checklist
1. **Version Bump**: Update package.json version
2. **Changelog**: Document all changes since last release
3. **Performance Validation**: Verify all benchmarks still pass
4. **Documentation**: Update API docs and examples
5. **Testing**: Full test suite with real-world projects
6. **Build**: Create production build and validate
7. **Tag**: Git tag with version number
8. **Publish**: npm publish with appropriate dist-tags

### 9. Community Guidelines

#### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Architecture discussions and questions
- **Pull Requests**: Code contributions and reviews

#### Issue Templates
**Bug Report Template**:
```markdown
## Bug Description
Clear description of the issue.

## Reproduction Steps
1. Step one
2. Step two
3. Observed behavior

## Expected Behavior
What should have happened.

## Environment
- Node.js version:
- TypeScript version:
- Project size:
- Operating system:
```

**Feature Request Template**:
```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why this feature would be valuable.

## Implementation Ideas
Any thoughts on how this could be implemented.

## Architecture Impact
How this fits with current architecture.
```

### 10. Troubleshooting Guide

#### Common Development Issues

**TypeScript Compilation Errors**:
```bash
# Clear cache and rebuild
npm run clean
rm -rf node_modules/.cache
npm run build
```

**Memory Issues During Testing**:
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm test
```

**Performance Test Failures**:
```bash
# Profile memory and CPU usage
npm run test:performance -- --verbose
npm run profile:memory
```

#### Getting Help
1. **Check Documentation**: Architecture and setup guides
2. **Search Issues**: Existing GitHub issues and discussions  
3. **Create Issue**: Detailed bug report or question
4. **Code Review**: Request feedback on approach

---

## Quick Start for Contributors

```bash
# 1. Setup environment
git clone <repo> && cd cytrex
npm install && npm run build

# 2. Run tests to validate setup
npm test

# 3. Start with code extraction task
# Parse implementation from intake/docs/ to src/
node scripts/extract-implementation.js

# 4. Validate architecture alignment
npm run validate:architecture

# 5. Run performance benchmarks
npm run test:performance
```

Welcome to the team! The architecture is solid, the implementation exists, and the performance targets are proven. Let's build something amazing! 🚀
