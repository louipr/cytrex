import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { IPatternDetector, DynamicUsage, PatternDefinition } from '../../types';

/**
 * Pattern Detector - Identifies dynamic usage patterns that cause false positives
 * 
 * Based on real-world validation from redesign architecture:
 * - Service container patterns (container.register, container.resolve)
 * - Command bus patterns (commandBus.register, commandBus.handle)
 * - Dynamic imports (import(), require())
 * - CLI entry point detection
 * - Architectural core file identification
 */
export class PatternDetector implements IPatternDetector {
  private readonly serviceContainerPatterns: RegExp[] = [
    /container\.register(?:Singleton)?\(['"`](\w+)['"`]/gi,
    /container\.resolve\(['"`](\w+)['"`]/gi,
    /container\.get\(['"`](\w+)['"`]/gi,
    /\.bind\(['"`](\w+)['"`]\)\.to\(/gi,
  ];

  private readonly commandBusPatterns: RegExp[] = [
    /commandBus\.register(?:Command|Handler)?\(['"`](\w+)['"`]/gi,
    /commandBus\.handle\(['"`](\w+)['"`]/gi,
    /\.when\(['"`](\w+)['"`]\)/gi,
  ];

  private readonly dynamicImportPatterns: RegExp[] = [
    /import\(['"`](.*?)['"`]\)/gi,
    /require\(['"`](.*?)['"`]\)/gi,
    /__import\(['"`](.*?)['"`]\)/gi,
  ];

  async detect(program: ts.Program): Promise<DynamicUsage> {
    const usage: DynamicUsage = {
      serviceContainer: new Map(),
      commandBus: new Map(),
      dynamicImports: new Map(),
      customPatterns: new Map()
    };

    const sourceFiles = program.getSourceFiles()
      .filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'));

    for (const sourceFile of sourceFiles) {
      await this.analyzeSourceFile(sourceFile, usage);
    }

    return usage;
  }

  async detectEntryPoints(projectPath: string): Promise<string[]> {
    const entryPoints: string[] = [];

    try {
      // 1. Package.json analysis - standard entry points
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        
        // Main entry point
        if (packageJson.main) {
          const mainPath = this.resolveEntryPoint(projectPath, packageJson.main);
          if (mainPath) entryPoints.push(mainPath);
        }

        // Binary entry points
        if (packageJson.bin) {
          if (typeof packageJson.bin === 'string') {
            const binPath = this.resolveEntryPoint(projectPath, packageJson.bin);
            if (binPath) entryPoints.push(binPath);
          } else {
            for (const binScript of Object.values(packageJson.bin)) {
              const binPath = this.resolveEntryPoint(projectPath, binScript as string);
              if (binPath) entryPoints.push(binPath);
            }
          }
        }
      }

      // 2. CLI pattern detection (critical insight from redesign)
      const cliPatterns = [
        'src/cli/cli.ts',
        'src/cli/index.ts', 
        'src/cli.ts',
        'cli/cli.ts',
        'cli/index.ts',
        'bin/cli.ts',
        'bin/index.ts'
      ];

      for (const pattern of cliPatterns) {
        const fullPath = path.join(projectPath, pattern);
        if (await this.fileExists(fullPath)) {
          entryPoints.push(path.resolve(fullPath));
        }
      }

      // 3. Conventional entry points
      const conventionalPatterns = [
        'src/index.ts',
        'src/main.ts',
        'index.ts',
        'main.ts',
        'src/app.ts',
        'app.ts'
      ];

      for (const pattern of conventionalPatterns) {
        const fullPath = path.join(projectPath, pattern);
        if (await this.fileExists(fullPath)) {
          entryPoints.push(path.resolve(fullPath));
        }
      }

      // 4. Test entry points (often missed but important)
      const testPatterns = [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'test/**/*.ts',
        'tests/**/*.ts'
      ];

      // TODO: Implement glob matching for test patterns
      // For now, skip test files as entry points unless explicitly configured

      // 5. Server/application entry points
      const serverPatterns = [
        'src/server.ts',
        'server.ts',
        'src/app.ts',
        'app.ts'
      ];

      for (const pattern of serverPatterns) {
        const fullPath = path.join(projectPath, pattern);
        if (await this.fileExists(fullPath)) {
          entryPoints.push(path.resolve(fullPath));
        }
      }

    } catch (error) {
      console.warn(`Warning: Error detecting entry points: ${error}`);
    }

    // Remove duplicates and return
    return Array.from(new Set(entryPoints));
  }

  isArchitecturalCore(filePath: string): boolean {
    const filename = path.basename(filePath);
    const corePatterns = [
      'Application',
      'Container',
      'ServiceContainer', 
      'CommandBus',
      'Config',
      'Bootstrap',
      'Kernel',
      'Registry',
      'Factory',
      'Builder',
      'Manager',
      'Service',
      'Provider'
    ];

    return corePatterns.some(pattern => 
      filename.includes(pattern) || 
      filename.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private async analyzeSourceFile(sourceFile: ts.SourceFile, usage: DynamicUsage): Promise<void> {
    const content = sourceFile.getFullText();

    // Analyze service container patterns
    this.extractPatterns(content, sourceFile.fileName, this.serviceContainerPatterns, usage.serviceContainer);
    
    // Analyze command bus patterns
    this.extractPatterns(content, sourceFile.fileName, this.commandBusPatterns, usage.commandBus);
    
    // Analyze dynamic import patterns
    this.extractPatterns(content, sourceFile.fileName, this.dynamicImportPatterns, usage.dynamicImports);

    // AST-based analysis for more complex patterns
    this.analyzeASTPatterns(sourceFile, usage);
  }

  private analyzeASTPatterns(sourceFile: ts.SourceFile, usage: DynamicUsage): void {
    const visit = (node: ts.Node): void => {
      // Analyze call expressions for service container patterns
      if (ts.isCallExpression(node)) {
        this.analyzeCallExpression(node, sourceFile.fileName, usage);
      }
      
      // Analyze decorator usage (common in dependency injection)
      if (ts.canHaveDecorators(node)) {
        const decorators = ts.getDecorators(node);
        if (decorators) {
          this.analyzeDecorators(decorators, sourceFile.fileName, usage);
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
  }

  private analyzeCallExpression(node: ts.CallExpression, fileName: string, usage: DynamicUsage): void {
    const expression = node.expression;

    // container.register() patterns
    if (ts.isPropertyAccessExpression(expression)) {
      try {
        // Safely get object name and method name
        const objectName = expression.expression ? expression.expression.getText() : '';
        const methodName = expression.name ? expression.name.getText() : '';

        if (objectName && methodName && 
            (objectName.includes('container') || objectName.includes('Container')) && 
            (methodName === 'register' || methodName === 'resolve' || methodName === 'get')) {
          
          // Extract the service name from the first argument
          const firstArg = node.arguments[0];
          if (firstArg && ts.isStringLiteral(firstArg)) {
            this.addToUsageMap(usage.serviceContainer, fileName, firstArg.text);
          }
        }

        // commandBus patterns
        if (objectName && methodName &&
            (objectName.includes('commandBus') || objectName.includes('CommandBus')) &&
            (methodName === 'register' || methodName === 'handle' || methodName === 'send')) {
          
          const firstArg = node.arguments[0];
          if (firstArg && ts.isStringLiteral(firstArg)) {
            this.addToUsageMap(usage.commandBus, fileName, firstArg.text);
          }
        }
      } catch (error) {
        // Ignore errors in pattern detection - this is not critical for analysis
      }
    }

    // Dynamic imports: import() or require()
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const moduleArg = node.arguments[0];
      if (moduleArg && ts.isStringLiteral(moduleArg)) {
        this.addToUsageMap(usage.dynamicImports, fileName, moduleArg.text);
      }
    }
  }

  private analyzeDecorators(decorators: readonly ts.Decorator[], fileName: string, usage: DynamicUsage): void {
    for (const decorator of decorators) {
      if (ts.isCallExpression(decorator.expression)) {
        const decoratorName = decorator.expression.expression.getText();
        
        // Common DI decorators that indicate service registration
        if (['Injectable', 'Service', 'Component', 'Repository'].includes(decoratorName)) {
          // Extract service name or use class name
          const arg = decorator.expression.arguments[0];
          if (arg && ts.isStringLiteral(arg)) {
            this.addToUsageMap(usage.serviceContainer, fileName, arg.text);
          }
        }
      }
    }
  }

  private extractPatterns(
    content: string, 
    fileName: string, 
    patterns: RegExp[], 
    usageMap: Map<string, Set<string>>
  ): void {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const serviceName = match[1];
        if (serviceName) {
          this.addToUsageMap(usageMap, fileName, serviceName);
        }
      }
      // Reset regex lastIndex to ensure we catch all matches
      pattern.lastIndex = 0;
    }
  }

  private addToUsageMap(usageMap: Map<string, Set<string>>, fileName: string, serviceName: string): void {
    if (!usageMap.has(serviceName)) {
      usageMap.set(serviceName, new Set());
    }
    usageMap.get(serviceName)!.add(fileName);
  }

  private resolveEntryPoint(projectPath: string, entryPath: string): string | null {
    const fullPath = path.resolve(projectPath, entryPath);
    
    // Try exact path first
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }

    // Try with common extensions
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    for (const ext of extensions) {
      const withExt = fullPath + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }

    // Try as directory with index file
    for (const ext of extensions) {
      const indexPath = path.join(fullPath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create PatternDetector with custom patterns
 */
export function createPatternDetector(customPatterns?: PatternDefinition[]): PatternDetector {
  const detector = new PatternDetector();
  
  // TODO: Add support for custom patterns if needed
  if (customPatterns) {
    console.log('Custom patterns not yet implemented, using default patterns');
  }
  
  return detector;
}
