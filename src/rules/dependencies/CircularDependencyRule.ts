// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.520Z
// ============================================================================

// Circular Dependency Detection

export class CircularDependencyRule extends Rule {
  readonly id = 'circular-dependency';
  readonly name = 'Circular Dependencies';
  readonly description = 'Detects circular dependencies between modules';

  private fileImports = new Map<string, Set<string>>();
  private visited = new Set<string>();
  private recursionStack = new Set<string>();
  private cycles: string[][] = [];

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Build import graph on source file level
    if (ts.isSourceFile(node)) {
      this.buildImportGraph(node);
      
      // Detect cycles once per project
      if (this.fileImports.size > 0 && this.cycles.length === 0) {
        this.detectCycles();
        
        // Report cycles
        for (const cycle of this.cycles) {
          if (cycle.includes(node.fileName)) {
            issues.push(
              this.createIssue(
                node,
                `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
                { 
                  type: 'circular-dependency',
                  cycle,
                  fileName: node.fileName
                }
              )
            );
          }
        }
      }
    }

    return issues;
  }

  private buildImportGraph(sourceFile: ts.SourceFile): void {
    const imports = new Set<string>();

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const resolvedPath = this.resolveImportPath(sourceFile.fileName, moduleSpecifier.text);
        
        if (resolvedPath && !this.isExternalModule(moduleSpecifier.text)) {
          imports.add(resolvedPath);
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const resolvedPath = this.resolveImportPath(sourceFile.fileName, moduleSpecifier.text);
        
        if (resolvedPath && !this.isExternalModule(moduleSpecifier.text)) {
          imports.add(resolvedPath);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    this.fileImports.set(sourceFile.fileName, imports);
  }

  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      let resolved = path.resolve(dir, importPath);
      
      // Try common extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      
      if (fs.existsSync(resolved)) {
        return resolved;
      }
      
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
    }

    // Could implement more complex module resolution here
    return null;
  }

  private isExternalModule(importPath: string): boolean {
    // External modules don't start with '.' or '/'
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  private detectCycles(): void {
    this.visited.clear();
    this.recursionStack.clear();
    this.cycles = [];

    for (const file of this.fileImports.keys()) {
      if (!this.visited.has(file)) {
        const path: string[] = [];
        this.detectCyclesUtil(file, path);
      }
    }
  }

  private detectCyclesUtil(file: string, path: string[]): void {
    this.visited.add(file);
    this.recursionStack.add(file);
    path.push(file);

    const imports = this.fileImports.get(file) || new Set();
    
    for (const importedFile of imports) {
      if (!this.visited.has(importedFile)) {
        this.detectCyclesUtil(importedFile, [...path]);
      } else if (this.recursionStack.has(importedFile)) {
        // Found a cycle
        const cycleStart = path.indexOf(importedFile);
        const cycle = path.slice(cycleStart);
        
        // Only add unique cycles
        if (!this.isCycleRecorded(cycle)) {
          this.cycles.push(cycle);
        }
      }
    }

    this.recursionStack.delete(file);
  }

  private isCycleRecorded(cycle: string[]): boolean {
    for (const recorded of this.cycles) {
      if (this.areCyclesEqual(cycle, recorded)) {
        return true;
      }
    }
    return false;
  }

  private areCyclesEqual(cycle1: string[], cycle2: string[]): boolean {
    if (cycle1.length !== cycle2.length) return false;
    
    // Cycles are equal if one is a rotation of the other
    const str1 = cycle1.join('|');
    const str2 = cycle2.join('|') + '|' + cycle2.join('|');
    
    return str2.includes(str1);
  }
}

