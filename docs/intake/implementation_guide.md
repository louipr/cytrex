# Implementation Guide
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
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### 1.4 Development Dependencies
```bash
# Core dependencies
npm install --save-dev \
  @types/node \
  jest @types/jest ts-jest \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  prettier \
  nodemon \
  ts-node

# Testing utilities
npm install --save-dev \
  @jest/globals \
  jest-extended \
  jest-mock-extended
```

#### 1.5 Production Dependencies
```bash
# Core libraries
npm install \
  typescript \
  commander \
  chalk \
  ora \
  glob \
  ajv \
  lru-cache \
  p-queue \
  winston

# Analysis libraries
npm install \
  @typescript-eslint/typescript-estree \
  @typescript-eslint/parser \
  enhanced-resolve \
  madge
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

#### 2.2 Initial File Structure
```typescript
// src/types/index.ts - Core type definitions
export interface AnalyzerConfig {
  entryPoints: string[];
  exclude: string[];
  rules: RuleConfig;
  output: OutputConfig;
  dynamicMethods: DynamicMethodConfig;
}

export interface Issue {
  id: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column: number;
  message: string;
}

// src/core/analyzer/Analyzer.ts
export class Analyzer {
  constructor(private config: AnalyzerConfig) {}
  
  async analyze(projectPath: string): Promise<AnalysisResult> {
    // Implementation to follow
    throw new Error('Not implemented');
  }
}
```

### 3. Core Component Implementation

#### 3.1 Parser Engine Implementation

##### Step 1: Create Parser Interface
```typescript
// src/core/parser/ParserInterface.ts
import * as ts from 'typescript';

export interface IParser {
  parseProject(rootPath: string): Promise<ProjectAST>;
  parseFile(filePath: string): Promise<FileAST>;
  getProgram(): ts.Program | null;
  getTypeChecker(): ts.TypeChecker | null;
}

export interface ProjectAST {
  files: Map<string, FileAST>;
  program: ts.Program;
  typeChecker: ts.TypeChecker;
}

export interface FileAST {
  path: string;
  sourceFile: ts.SourceFile;
  hash: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
}
```

##### Step 2: Implement TypeScript Parser
```typescript
// src/core/parser/TypeScriptParser.ts
import * as ts from 'typescript';
import * as path from 'path';
import * as crypto from 'crypto';
import { IParser, ProjectAST, FileAST } from './ParserInterface';

export class TypeScriptParser implements IParser {
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private projectAST: ProjectAST | null = null;

  async parseProject(rootPath: string): Promise<ProjectAST> {
    // Step 1: Find tsconfig.json
    const configPath = ts.findConfigFile(
      rootPath,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    if (!configPath) {
      throw new Error('No tsconfig.json found');
    }

    // Step 2: Read and parse config
    const { config } = ts.readConfigFile(configPath, ts.sys.readFile);
    const { options, fileNames, errors } = ts.parseJsonConfigFileContent(
      config,
      ts.sys,
      path.dirname(configPath)
    );

    if (errors.length > 0) {
      throw new Error(`TypeScript config errors: ${errors.map(e => e.messageText).join(', ')}`);
    }

    // Step 3: Create program
    this.program = ts.createProgram(fileNames, options);
    this.typeChecker = this.program.getTypeChecker();

    // Step 4: Parse all files
    const files = new Map<string, FileAST>();
    
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        const fileAST = await this.parseSourceFile(sourceFile);
        files.set(sourceFile.fileName, fileAST);
      }
    }

    this.projectAST = {
      files,
      program: this.program,
      typeChecker: this.typeChecker
    };

    return this.projectAST;
  }

  async parseFile(filePath: string): Promise<FileAST> {
    if (!this.program) {
      throw new Error('Project not parsed yet');
    }

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      throw new Error(`File not found in program: ${filePath}`);
    }

    return this.parseSourceFile(sourceFile);
  }

  private async parseSourceFile(sourceFile: ts.SourceFile): Promise<FileAST> {
    const content = sourceFile.getFullText();
    const hash = crypto.createHash('md5').update(content).digest('hex');

    const imports = this.extractImports(sourceFile);
    const exports = this.extractExports(sourceFile);

    return {
      path: sourceFile.fileName,
      sourceFile,
      hash,
      imports,
      exports
    };
  }

  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        imports.push({
          module: moduleSpecifier.text,
          specifiers: this.getImportSpecifiers(node),
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }
    });

    return imports;
  }

  private extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    ts.forEachChild(sourceFile, node => {
      if (ts.isExportDeclaration(node)) {
        exports.push({
          type: 'named',
          specifiers: this.getExportSpecifiers(node),
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      } else if (ts.isExportAssignment(node)) {
        exports.push({
          type: 'default',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }
    });

    return exports;
  }

  getProgram(): ts.Program | null {
    return this.program;
  }

  getTypeChecker(): ts.TypeChecker | null {
    return this.typeChecker;
  }
}
```

#### 3.2 Call Graph Builder Implementation

##### Step 1: Create Call Graph Structure
```typescript
// src/core/callgraph/CallGraph.ts
export class CallGraph {
  private nodes: Map<string, CallNode> = new Map();
  private edges: Map<string, Set<string>> = new Map();
  private reverseEdges: Map<string, Set<string>> = new Map();
  private entryPoints: Set<string>;

  constructor(entryPoints: string[]) {
    this.entryPoints = new Set(entryPoints);
  }

  addNode(node: CallNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, new Set());
    }
  }

  addEdge(fromId: string, toId: string): void {
    // Forward edge
    if (!this.edges.has(fromId)) {
      this.edges.set(fromId, new Set());
    }
    this.edges.get(fromId)!.add(toId);

    // Reverse edge for efficient lookups
    if (!this.reverseEdges.has(toId)) {
      this.reverseEdges.set(toId, new Set());
    }
    this.reverseEdges.get(toId)!.add(fromId);
  }

  findReachableNodes(): Set<string> {
    const visited = new Set<string>();
    const queue = [...this.entryPoints];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const edges = this.edges.get(nodeId);
      if (edges) {
        for (const targetId of edges) {
          if (!visited.has(targetId)) {
            queue.push(targetId);
          }
        }
      }
    }

    return visited;
  }

  findUnreachableNodes(): Set<string> {
    const reachable = this.findReachableNodes();
    const unreachable = new Set<string>();

    for (const nodeId of this.nodes.keys()) {
      if (!reachable.has(nodeId)) {
        unreachable.add(nodeId);
      }
    }

    return unreachable;
  }

  getNode(id: string): CallNode | undefined {
    return this.nodes.get(id);
  }

  getCallersOf(nodeId: string): Set<string> {
    return this.reverseEdges.get(nodeId) || new Set();
  }

  getCalleesOf(nodeId: string): Set<string> {
    return this.edges.get(nodeId) || new Set();
  }
}
```

##### Step 2: Implement Call Graph Builder
```typescript
// src/core/callgraph/CallGraphBuilder.ts
import * as ts from 'typescript';
import { CallGraph, CallNode } from './CallGraph';
import { DynamicMethodConfig } from '../types';

export class CallGraphBuilder {
  private callGraph: CallGraph;
  private functionMap: Map<ts.Node, string> = new Map();
  private idCounter = 0;

  constructor(
    private program: ts.Program,
    private typeChecker: ts.TypeChecker,
    private entryPoints: string[],
    private dynamicConfig: DynamicMethodConfig
  ) {
    this.callGraph = new CallGraph(entryPoints);
  }

  build(): CallGraph {
    // Step 1: First pass - identify all functions
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        this.visitNodeForFunctions(sourceFile);
      }
    }

    // Step 2: Identify entry points
    this.identifyEntryPoints();

    // Step 3: Second pass - build call relationships
    for (const sourceFile of this.program.getSourceFiles()) {
      if (!sourceFile.isDeclarationFile) {
        this.visitNodeForCalls(sourceFile);
      }
    }

    return this.callGraph;
  }

  private visitNodeForFunctions(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node) || 
        ts.isMethodDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)) {
      
      const callNode = this.createCallNode(node);
      this.callGraph.addNode(callNode);
      this.functionMap.set(node, callNode.id);
    }

    ts.forEachChild(node, child => this.visitNodeForFunctions(child));
  }

  private visitNodeForCalls(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      this.processCallExpression(node);
    }

    ts.forEachChild(node, child => this.visitNodeForCalls(child));
  }

  private processCallExpression(node: ts.CallExpression): void {
    const caller = this.findContainingFunction(node);
    if (!caller) return;

    const symbol = this.typeChecker.getSymbolAtLocation(node.expression);
    if (!symbol) {
      // Handle dynamic calls
      this.processDynamicCall(node, caller);
      return;
    }

    const declaration = symbol.valueDeclaration;
    if (declaration && this.functionMap.has(declaration)) {
      const targetId = this.functionMap.get(declaration)!;
      this.callGraph.addEdge(caller, targetId);
    }
  }

  private processDynamicCall(node: ts.CallExpression, callerId: string): void {
    const text = node.expression.getText();
    
    // Check against dynamic method patterns
    for (const pattern of this.dynamicConfig.patterns) {
      if (this.matchesPattern(text, pattern)) {
        // Create a virtual node for the dynamic call
        const dynamicNode: CallNode = {
          id: `dynamic:${text}:${this.idCounter++}`,
          name: text,
          file: 'dynamic',
          line: 0,
          type: 'dynamic',
          isDynamic: true
        };
        
        this.callGraph.addNode(dynamicNode);
        this.callGraph.addEdge(callerId, dynamicNode.id);
      }
    }
  }

  private createCallNode(node: ts.Node): CallNode {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    
    let name = 'anonymous';
    let type: CallNode['type'] = 'function';

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      name = node.name?.getText() || 'anonymous';
      type = ts.isMethodDeclaration(node) ? 'method' : 'function';
    } else if (ts.isArrowFunction(node)) {
      type = 'arrow';
      // Try to get variable name if assigned
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent)) {
        name = parent.name.getText();
      }
    }

    return {
      id: `${sourceFile.fileName}:${name}:${line}:${character}`,
      name,
      file: sourceFile.fileName,
      line: line + 1,
      type,
      isDynamic: false
    };
  }

  private findContainingFunction(node: ts.Node): string | null {
    let current: ts.Node | undefined = node.parent;

    while (current) {
      if (this.functionMap.has(current)) {
        return this.functionMap.get(current)!;
      }
      current = current.parent;
    }

    return null;
  }

  private identifyEntryPoints(): void {
    for (const entryPoint of this.entryPoints) {
      // Find nodes matching entry point patterns
      for (const [node, id] of this.functionMap) {
        const sourceFile = node.getSourceFile();
        if (sourceFile.fileName.includes(entryPoint)) {
          // Mark as entry point in call graph
          this.callGraph.entryPoints.add(id);
        }
      }
    }
  }

  private matchesPattern(text: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(text);
  }
}
```

#### 3.3 Rule Engine Implementation

##### Step 1: Create Base Rule Class
```typescript
// src/core/rules/Rule.ts
import * as ts from 'typescript';
import { Issue, RuleConfig, RuleContext } from '../types';

export abstract class Rule {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  
  protected config: RuleConfig = {};
  protected enabled: boolean = true;
  protected severity: Issue['severity'] = 'warning';

  configure(config: RuleConfig): void {
    this.config = { ...this.config, ...config };
    this.enabled = config.enabled !== false;
    this.severity = config.severity || this.severity;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  abstract check(node: ts.Node, context: RuleContext): Issue[];

  protected createIssue(
    node: ts.Node,
    message: string,
    metadata?: any
  ): Issue {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );

    return {
      id: `${this.id}-${Date.now()}-${Math.random()}`,
      ruleId: this.id,
      severity: this.severity,
      file: sourceFile.fileName,
      line: line + 1,
      column: character + 1,
      message,
      metadata
    };
  }
}
```

##### Step 2: Implement Complexity Rule
```typescript
// src/rules/complexity/ComplexityRule.ts
import * as ts from 'typescript';
import { Rule } from '../../core/rules/Rule';
import { Issue, RuleContext } from '../../types';

export class ComplexityRule extends Rule {
  readonly id = 'complexity';
  readonly name = 'Cyclomatic Complexity';
  readonly description = 'Detects functions with high cyclomatic complexity';

  private threshold = 10;

  configure(config: any): void {
    super.configure(config);
    this.threshold = config.threshold || 10;
  }

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    if (this.isFunctionNode(node)) {
      const complexity = this.calculateComplexity(node);
      
      if (complexity > this.threshold) {
        const functionName = this.getFunctionName(node);
        issues.push(
          this.createIssue(
            node,
            `Function '${functionName}' has a complexity of ${complexity} (threshold: ${this.threshold})`,
            { complexity, threshold: this.threshold }
          )
        );
      }
    }

    return issues;
  }

  private isFunctionNode(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isArrowFunction(node) ||
           ts.isFunctionExpression(node);
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node): void => {
      // Increment for decision points
      if (ts.isIfStatement(n) ||
          ts.isConditionalExpression(n) ||
          ts.isCaseClause(n) ||
          ts.isWhileStatement(n) ||
          ts.isForStatement(n) ||
          ts.isForInStatement(n) ||
          ts.isForOfStatement(n) ||
          ts.isDoStatement(n)) {
        complexity++;
      }

      // Increment for logical operators
      if (ts.isBinaryExpression(n)) {
        const operator = n.operatorToken.kind;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
            operator === ts.SyntaxKind.BarBarToken ||
            operator === ts.SyntaxKind.QuestionQuestionToken) {
          complexity++;
        }
      }

      // Increment for catch clauses
      if (ts.isCatchClause(n)) {
        complexity++;
      }

      ts.forEachChild(n, visit);
    };

    ts.forEachChild(node, visit);
    return complexity;
  }

  private getFunctionName(node: ts.Node): string {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      return node.name.getText();
    }
    
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent)) {
        return parent.name.getText();
      }
      if (ts.isPropertyAssignment(parent)) {
        return parent.name.getText();
      }
    }

    return '<anonymous>';
  }
}
```

##### Step 3: Implement Dead Code Rule
```typescript
// src/rules/deadcode/DeadCodeRule.ts
import * * as ts from 'typescript';
import { Rule } from '../../core/rules/Rule';
import { Issue, RuleContext } from '../../types';

export class DeadCodeRule extends Rule {
  readonly id = 'dead-code';
  readonly name = 'Dead Code Detection';
  readonly description = 'Detects unreachable code and unused functions';

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Check for unreachable code after return statements
    if (ts.isReturnStatement(node)) {
      issues.push(...this.checkUnreachableCode(node));
    }

    // Check for unused functions using call graph
    if (this.isFunctionNode(node)) {
      const functionId = this.getFunctionId(node, context);
      if (functionId && !context.callGraph.isReachable(functionId)) {
        const functionName = this.getFunctionName(node);
        
        // Check if it matches dynamic patterns
        if (!this.isDynamicFunction(functionName, context)) {
          issues.push(
            this.createIssue(
              node,
              `Function '${functionName}' is never called`,
              { type: 'unused-function' }
            )
          );
        }
      }
    }

    // Check for unused imports
    if (ts.isImportDeclaration(node)) {
      issues.push(...this.checkUnusedImport(node, context));
    }

    return issues;
  }

  private checkUnreachableCode(returnNode: ts.ReturnStatement): Issue[] {
    const issues: Issue[] = [];
    const parent = returnNode.parent;

    if (ts.isBlock(parent)) {
      const statements = parent.statements;
      const returnIndex = statements.indexOf(returnNode);

      for (let i = returnIndex + 1; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip comments and empty statements
        if (statement.kind === ts.SyntaxKind.EmptyStatement) continue;

        issues.push(
          this.createIssue(
            statement,
            'Unreachable code detected',
            { type: 'unreachable' }
          )
        );
      }
    }

    return issues;
  }

  private checkUnusedImport(
    importNode: ts.ImportDeclaration,
    context: RuleContext
  ): Issue[] {
    const issues: Issue[] = [];
    const importClause = importNode.importClause;

    if (!importClause) return issues;

    const sourceFile = importNode.getSourceFile();
    const typeChecker = context.typeChecker;

    // Check named imports
    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const specifier of importClause.namedBindings.elements) {
        const symbol = typeChecker.getSymbolAtLocation(specifier.name);
        if (symbol) {
          const references = this.findReferences(symbol, sourceFile);
          if (references.length === 0) {
            issues.push(
              this.createIssue(
                specifier,
                `Unused import '${specifier.name.getText()}'`,
                { type: 'unused-import' }
              )
            );
          }
        }
      }
    }

    // Check default import
    if (importClause.name) {
      const symbol = typeChecker.getSymbolAtLocation(importClause.name);
      if (symbol) {
        const references = this.findReferences(symbol, sourceFile);
        if (references.length === 0) {
          issues.push(
            this.createIssue(
              importClause.name,
              `Unused import '${importClause.name.getText()}'`,
              { type: 'unused-import' }
            )
          );
        }
      }
    }

    return issues;
  }

  private findReferences(symbol: ts.Symbol, sourceFile: ts.SourceFile): ts.Node[] {
    const references: ts.Node[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        const nodeSymbol = this.typeChecker.getSymbolAtLocation(node);
        if (nodeSymbol === symbol) {
          references.push(node);
        }
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return references.filter(ref => ref !== symbol.valueDeclaration);
  }

  private isFunctionNode(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isArrowFunction(node) ||
           ts.isFunctionExpression(node);
  }

  private getFunctionId(node: ts.Node, context: RuleContext): string | null {
    // Generate consistent ID matching call graph
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart()
    );
    const name = this.getFunctionName(node);
    
    return `${sourceFile.fileName}:${name}:${line}:${character}`;
  }

  private getFunctionName(node: ts.Node): string {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      return node.name.getText();
    }
    return '<anonymous>';
  }

  private isDynamicFunction(name: string, context: RuleContext): boolean {
    const dynamicPatterns = context.config.dynamicMethods?.patterns || [];
    
    for (const pattern of dynamicPatterns) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(name)) {
        return true;
      }
    }

    return false;
  }
}
```

### 4. CLI Implementation

#### 4.1 CLI Entry Point
```typescript
// src/cli/index.ts
#!/usr/bin/env node

import { Command } from 'commander';
import * as chalk from 'chalk';
import * as ora from 'ora';
import { Analyzer } from '../core/analyzer/Analyzer';
import { loadConfig } from '../utils/config';
import { version } from '../../package.json';

const program = new Command();

program
  .name('code-analyzer')
  .description('Real-time code analysis tool for TypeScript/JavaScript')
  .version(version);

program
  .command('analyze [path]')
  .description('Analyze a TypeScript/JavaScript project')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --output <path>', 'Output file path', 'report.json')
  .option('-f, --format <type>', 'Output format (json|html|markdown)', 'json')
  .option('--rules <rules>', 'Comma-separated list of rules to run')
  .option('--severity <level>', 'Minimum severity level (error|warning|info)', 'info')
  .option('--quiet', 'Suppress console output')
  .option('--verbose', 'Verbose output')
  .action(async (path = '.', options) => {
    const spinner = options.quiet ? null : ora('Loading configuration...').start();

    try {
      // Load configuration
      const config = await loadConfig(options.config);
      
      // Override with CLI options
      if (options.rules) {
        const ruleList = options.rules.split(',');
        config.rules = ruleList.reduce((acc, rule) => {
          acc[rule] = { enabled: true };
          return acc;
        }, {});
      }

      if (options.output) {
        config.output = {
          ...config.output,
          path: options.output,
          format: options.format
        };
      }

      spinner?.text = 'Initializing analyzer...';

      // Create analyzer instance
      const analyzer = new Analyzer(config);

      spinner?.text = 'Analyzing project...';

      // Run analysis
      const result = await analyzer.analyze(path);

      spinner?.succeed('Analysis complete');

      // Display summary
      if (!options.quiet) {
        displaySummary(result);
      }

      // Write output
      await writeOutput(result, config.output);

      // Exit with appropriate code
      process.exit(result.errors > 0 ? 1 : 0);

    } catch (error) {
      spinner?.fail('Analysis failed');
      console.error(chalk.red(`Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .action(async () => {
    const { createDefaultConfig } = await import('../utils/init');
    await createDefaultConfig();
    console.log(chalk.green('✓ Created analyzer.config.json'));
  });

function displaySummary(result: any): void {
  console.log('\n' + chalk.bold('Analysis Summary:'));
  console.log(chalk.gray('─'.repeat(40)));
  
  console.log(`Files analyzed: ${chalk.cyan(result.filesAnalyzed)}`);
  console.log(`Total issues: ${chalk.yellow(result.totalIssues)}`);
  
  if (result.errors > 0) {
    console.log(`  ${chalk.red('●')} Errors: ${chalk.red(result.errors)}`);
  }
  if (result.warnings > 0) {
    console.log(`  ${chalk.yellow('●')} Warnings: ${chalk.yellow(result.warnings)}`);
  }
  if (result.info > 0) {
    console.log(`  ${chalk.blue('●')} Info: ${chalk.blue(result.info)}`);
  }

  if (result.deadCode > 0) {
    console.log(`\nDead code found: ${chalk.red(result.deadCode)} functions`);
  }

  console.log(chalk.gray('─'.repeat(40)));
}

async function writeOutput(result: any, outputConfig: any): Promise<void> {
  const { writeReport } = await import('../core/reporter/ReportWriter');
  await writeReport(result, outputConfig);
}

program.parse(process.argv);
```

#### 4.2 Configuration Loader
```typescript
// src/utils/config.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import Ajv from 'ajv';
import { AnalyzerConfig } from '../types';

const DEFAULT_CONFIG: AnalyzerConfig = {
  entryPoints: ['src/index.ts', 'src/main.ts', 'src/app.ts'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  rules: {
    'complexity': { enabled: true, threshold: 10, severity: 'warning' },
    'dead-code': { enabled: true, severity: 'error' },
    'unused-imports': { enabled: true, severity: 'warning' },
    'excessive-file-size': { enabled: true, threshold: 500, severity: 'warning' },
    'missing-types': { enabled: true, severity: 'info' }
  },
  dynamicMethods: {
    patterns: ['*Controller.*', '*Handler', '*Service.*'],
    decorators: ['@Get', '@Post', '@Put', '@Delete', '@EventHandler']
  },
  output: {
    path: './report.json',
    format: 'json'
  }
};

export async function loadConfig(configPath?: string): Promise<AnalyzerConfig> {
  let config = { ...DEFAULT_CONFIG };

  if (configPath) {
    const configFile = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(configFile);
    config = mergeConfig(config, userConfig);
  } else {
    // Try to find config file in common locations
    const possiblePaths = [
      'analyzer.config.json',
      '.analyzerrc.json',
      'package.json'
    ];

    for (const possiblePath of possiblePaths) {
      try {
        const fullPath = path.resolve(process.cwd(), possiblePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        
        if (possiblePath === 'package.json') {
          const pkg = JSON.parse(content);
          if (pkg.analyzer) {
            config = mergeConfig(config, pkg.analyzer);
            break;
          }
        } else {
          const userConfig = JSON.parse(content);
          config = mergeConfig(config, userConfig);
          break;
        }
      } catch {
        // File doesn't exist or is invalid, continue
      }
    }
  }

  // Validate configuration
  validateConfig(config);

  return config;
}

function mergeConfig(base: AnalyzerConfig, override: Partial<AnalyzerConfig>): AnalyzerConfig {
  return {
    ...base,
    ...override,
    rules: {
      ...base.rules,
      ...(override.rules || {})
    },
    dynamicMethods: {
      ...base.dynamicMethods,
      ...(override.dynamicMethods || {})
    },
    output: {
      ...base.output,
      ...(override.output || {})
    }
  };
}

function validateConfig(config: AnalyzerConfig): void {
  const ajv = new Ajv();
  const schema = {
    type: 'object',
    properties: {
      entryPoints: {
        type: 'array',
        items: { type: 'string' }
      },
      exclude: {
        type: 'array',
        items: { type: 'string' }
      },
      rules: { type: 'object' },
      dynamicMethods: {
        type: 'object',
        properties: {
          patterns: {
            type: 'array',
            items: { type: 'string' }
          },
          decorators: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      output: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          format: {
            type: 'string',
            enum: ['json', 'html', 'markdown']
          }
        }
      }
    },
    required: ['entryPoints', 'exclude', 'rules']
  };

  const valid = ajv.validate(schema, config);
  if (!valid) {
    throw new Error(`Invalid configuration: ${ajv.errorsText()}`);
  }
}
```

### 5. Testing Implementation

#### 5.1 Unit Test Setup
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 90,
      statements: 90
    }
  }
};
```

#### 5.2 Parser Tests
```typescript
// tests/unit/parser.test.ts
import { TypeScriptParser } from '../../src/core/parser/TypeScriptParser';
import * as path from 'path';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  describe('parseProject', () => {
    it('should parse a TypeScript project', async () => {
      const projectPath = path.join(__dirname, '../fixtures/sample-project');
      const ast = await parser.parseProject(projectPath);

      expect(ast.files.size).toBeGreaterThan(0);
      expect(ast.program).toBeDefined();
      expect(ast.typeChecker).toBeDefined();
    });

    it('should extract imports correctly', async () => {
      const projectPath = path.join(__dirname, '../fixtures/sample-project');
      const ast = await parser.parseProject(projectPath);

      const mainFile = ast.files.get(path.join(projectPath, 'src/index.ts'));
      expect(mainFile).toBeDefined();
      expect(mainFile!.imports.length).toBeGreaterThan(0);
    });

    it('should handle parsing errors gracefully', async () => {
      const invalidPath = '/non/existent/path';
      await expect(parser.parseProject(invalidPath)).rejects.toThrow();
    });
  });
});
```

#### 5.3 Rule Tests
```typescript
// tests/unit/rules/complexity.test.ts
import { ComplexityRule } from '../../../src/rules/complexity/ComplexityRule';
import * as ts from 'typescript';

describe('ComplexityRule', () => {
  let rule: ComplexityRule;

  beforeEach(() => {
    rule = new ComplexityRule();
    rule.configure({ threshold: 3 });
  });

  it('should detect high complexity functions', () => {
    const code = `
      function complexFunction(x: number): number {
        if (x > 0) {
          if (x > 10) {
            return x * 2;
          } else if (x > 5) {
            return x + 10;
          } else {
            return x;
          }
        } else if (x < -10) {
          return -x;
        } else {
          return 0;
        }
      }
    `;

    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );

    const issues: any[] = [];
    const visit = (node: ts.Node): void => {
      const nodeIssues = rule.check(node, {} as any);
      issues.push(...nodeIssues);
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toContain('complexity');
  });

  it('should not flag simple functions', () => {
    const code = `
      function simpleFunction(x: number): number {
        return x * 2;
      }
    `;

    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );

    const issues: any[] = [];
    const visit = (node: ts.Node): void => {
      const nodeIssues = rule.check(node, {} as any);
      issues.push(...nodeIssues);
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    expect(issues.length).toBe(0);
  });
});
```

### 6. Build and Deployment

#### 6.1 Build Scripts
```json
// package.json
{
  "name": "code-analyzer",
  "version": "1.0.0",
  "description": "Real-time code analysis tool for TypeScript/JavaScript",
  "main": "dist/index.js",
  "bin": {
    "code-analyzer": "dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "nodemon --exec ts-node src/cli/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "prebuild": "npm run lint && npm run test",
    "prepare": "npm run build",
    "release": "npm version patch && npm publish"
  },
  "files": [
    "dist",
    "schemas",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "typescript",
    "javascript",
    "code-analysis",
    "static-analysis",
    "code-quality",
    "dead-code",
    "complexity"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### 6.2 ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

#### 6.3 Docker Setup
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/schemas ./schemas

# Install production dependencies only
RUN npm ci --only=production

# Create symlink for global usage
RUN npm link

ENTRYPOINT ["code-analyzer"]
CMD ["--help"]
```

### 7. Documentation

#### 7.1 README Template
```markdown
# Code Analyzer

Real-time static code analysis tool for TypeScript/JavaScript projects.

## Features

- 🔍 **Dead Code Detection**: Find unused functions, unreachable code, and orphaned imports
- 📊 **Complexity Analysis**: Measure cyclomatic and cognitive complexity
- 🔗 **Dependency Analysis**: Detect circular dependencies and unused packages
- 📝 **TypeScript Support**: Full TypeScript support with type checking
- ⚡ **Real-time Performance**: Analyze large codebases in seconds
- 🔧 **Configurable**: Extensive configuration options and custom rules
- 🔌 **Extensible**: Plugin system for custom analysis rules

## Installation

\`\`\`bash
npm install -g code-analyzer
\`\`\`

## Quick Start

\`\`\`bash
# Analyze current directory
code-analyzer analyze

# Analyze specific directory
code-analyzer analyze ./src

# Use custom configuration
code-analyzer analyze --config analyzer.config.json

# Generate configuration file
code-analyzer init
\`\`\`

## Configuration

Create an `analyzer.config.json` file:

\`\`\`json
{
  "entryPoints": ["src/index.ts"],
  "exclude": ["**/node_modules/**", "**/*.test.ts"],
  "rules": {
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
  "dynamicMethods": {
    "patterns": ["*Controller.*", "*Handler"],
    "decorators": ["@api", "@route"]
  }
}
\`\`\`

## API Usage

\`\`\`typescript
import { Analyzer } from 'code-analyzer';

const analyzer = new Analyzer({
  entryPoints: ['src/index.ts'],
  rules: {
    'complexity': { enabled: true, threshold: 10 }
  }
});

const results = await analyzer.analyze('./src');
console.log(results);
\`\`\`

## License

MIT
```

### 8. Performance Optimization

#### 8.1 Caching Implementation
```typescript
// src/services/CacheService.ts
import { LRUCache } from 'lru-cache';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CacheService {
  private memoryCache: LRUCache<string, any>;
  private cacheDir: string;

  constructor(cacheDir = '.analyzer-cache') {
    this.cacheDir = cacheDir;
    this.memoryCache = new LRUCache({
      max: 100_000_000, // 100MB
      ttl: 1000 * 60 * 60, // 1 hour
      sizeCalculation: (value) => {
        const str = JSON.stringify(value);
        return str.length;
      }
    });

    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memResult = this.memoryCache.get(key);
    if (memResult) {
      return memResult as T;
    }

    // Check disk cache
    try {
      const filePath = this.getCachePath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Store in memory cache for faster access
      this.memoryCache.set(key, data);
      
      return data as T;
    } catch (error) {
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    // Store in memory cache
    this.memoryCache.set(key, value);

    // Store on disk
    const filePath = this.getCachePath(key);
    const content = JSON.stringify(value);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private getCachePath(key: string): string {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.cacheDir, `${hash}.json`);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => 
          fs.unlink(path.join(this.cacheDir, file))
        )
      );
    } catch (error) {
      // Ignore errors
    }
  }
}
```

### 9. Final Integration

#### 9.1 Main Analyzer Class
```typescript
// src/core/analyzer/Analyzer.ts
import { TypeScriptParser } from '../parser/TypeScriptParser';
import { CallGraphBuilder } from '../callgraph/CallGraphBuilder';
import { RuleEngine } from '../rules/RuleEngine';
import { ReportGenerator } from '../reporter/ReportGenerator';
import { CacheService } from '../../services/CacheService';
import { AnalyzerConfig, AnalysisResult } from '../../types';

export class Analyzer {
  private parser: TypeScriptParser;
  private ruleEngine: RuleEngine;
  private cache: CacheService;
  private reportGenerator: ReportGenerator;

  constructor(private config: AnalyzerConfig) {
    this.parser = new TypeScriptParser();
    this.ruleEngine = new RuleEngine(config.rules);
    this.cache = new CacheService();
    this.reportGenerator = new ReportGenerator();
  }

  async analyze(projectPath: string): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Parse project
    const projectAST = await this.parser.parseProject(projectPath);

    // Build call graph
    const callGraphBuilder = new CallGraphBuilder(
      projectAST.program,
      projectAST.typeChecker,
      this.config.entryPoints,
      this.config.dynamicMethods
    );
    const callGraph = callGraphBuilder.build();

    // Run rules
    const issues = await this.ruleEngine.analyze(
      projectAST,
      callGraph,
      this.config
    );

    // Generate report
    const report = this.reportGenerator.generate(
      issues,
      callGraph,
      {
        projectPath,
        filesAnalyzed: projectAST.files.size,
        duration: Date.now() - startTime
      }
    );

    return report;
  }
}
```

### 10. Deployment Instructions

#### 10.1 Local Installation
```bash
# Clone and install
git clone https://github.com/your-org/code-analyzer.git
cd code-analyzer
npm install
npm run build

# Link globally
npm link

# Test installation
code-analyzer --version
```

#### 10.2 CI/CD Integration
```yaml
# .github/workflows/analyze.yml
name: Code Analysis

on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Code Analyzer
        run: npm install -g code-analyzer
      
      - name: Run Analysis
        run: code-analyzer analyze --output analysis-report.json
      
      - name: Upload Report
        uses: actions/upload-artifact@v2
        with:
          name: analysis-report
          path: analysis-report.json
      
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('analysis-report.json'));
            const comment = `## Code Analysis Results
            - **Files Analyzed**: ${report.filesAnalyzed}
            - **Issues Found**: ${report.totalIssues}
            - **Errors**: ${report.errors}
            - **Warnings**: ${report.warnings}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

This completes the comprehensive implementation guide for your code analysis tool!