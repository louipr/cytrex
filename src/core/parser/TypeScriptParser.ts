// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/complete_implementation.md
// Generated on: 2025-09-27T09:28:40.522Z
// ============================================================================

// TypeScript/JavaScript AST parser with full error handling

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { ParseError } from '../errors/CustomErrors';
import { Logger } from '../../utils/logger';

interface ProjectAST {
  files: Map<string, FileAST>;
  program: ts.Program;
  typeChecker: ts.TypeChecker;
  diagnostics: ts.Diagnostic[];
}

interface FileAST {
  path: string;
  sourceFile: ts.SourceFile;
  hash: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  symbols: Map<string, ts.Symbol>;
}

export class TypeScriptParser {
  private logger = Logger.getInstance();
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private projectAST: ProjectAST | null = null;
  private fileHashes = new Map<string, string>();

  async parseProject(rootPath: string, config?: ts.CompilerOptions): Promise<ProjectAST> {
    this.logger.info(`Starting project parse: ${rootPath}`);
    const startTime = Date.now();

    try {
      // Find and read TypeScript configuration
      const configPath = ts.findConfigFile(
        rootPath,
        ts.sys.fileExists,
        'tsconfig.json'
      );

      let compilerOptions: ts.CompilerOptions;
      let fileNames: string[];

      if (configPath) {
        const { config: tsConfig, error } = ts.readConfigFile(configPath, ts.sys.readFile);
        
        if (error) {
          throw new ParseError('Failed to read tsconfig.json', configPath, error);
        }

        const parsedConfig = ts.parseJsonConfigFileContent(
          tsConfig,
          ts.sys,
          path.dirname(configPath)
        );

        compilerOptions = { ...parsedConfig.options, ...config };
        fileNames = parsedConfig.fileNames;
        
        if (parsedConfig.errors.length > 0) {
          this.logger.warn('TypeScript config warnings:', parsedConfig.errors);
        }
      } else {
        // Fallback: find all TS/JS files
        this.logger.warn('No tsconfig.json found, using default configuration');
        compilerOptions = this.getDefaultCompilerOptions(config);
        fileNames = this.findSourceFiles(rootPath);
      }

      // Create TypeScript program
      this.program = ts.createProgram(fileNames, compilerOptions);
      this.typeChecker = this.program.getTypeChecker();

      // Get diagnostics
      const diagnostics = [
        ...this.program.getSyntacticDiagnostics(),
        ...this.program.getSemanticDiagnostics()
      ];

      // Parse all source files
      const files = new Map<string, FileAST>();
      let successCount = 0;
      let errorCount = 0;

      for (const sourceFile of this.program.getSourceFiles()) {
        if (this.shouldProcessFile(sourceFile)) {
          try {
            const fileAST = await this.parseSourceFile(sourceFile);
            files.set(sourceFile.fileName, fileAST);
            successCount++;
          } catch (error) {
            this.logger.error(`Failed to parse file: ${sourceFile.fileName}`, error as Error);
            errorCount++;
          }
        }
      }

      this.logger.info(`Parse complete: ${successCount} files parsed, ${errorCount} errors, ${Date.now() - startTime}ms`);

      this.projectAST = {
        files,
        program: this.program,
        typeChecker: this.typeChecker,
        diagnostics
      };

      return this.projectAST;

    } catch (error) {
      this.logger.error('Project parse failed', error as Error);
      throw new ParseError(`Failed to parse project: ${error.message}`, rootPath, error);
    }
  }

  private async parseSourceFile(sourceFile: ts.SourceFile): Promise<FileAST> {
    const content = sourceFile.getFullText();
    const hash = crypto.createHash('md5').update(content).digest('hex');
    
    this.fileHashes.set(sourceFile.fileName, hash);

    const imports = this.extractImports(sourceFile);
    const exports = this.extractExports(sourceFile);
    const symbols = this.extractSymbols(sourceFile);

    return {
      path: sourceFile.fileName,
      sourceFile,
      hash,
      imports,
      exports,
      symbols
    };
  }

  private extractImports(sourceFile: ts.SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const importClause = node.importClause;
        const specifiers: string[] = [];
        const isTypeOnly = node.importClause?.isTypeOnly || false;

        if (importClause) {
          // Default import
          if (importClause.name) {
            specifiers.push(importClause.name.getText());
          }

          // Named imports
          if (importClause.namedBindings) {
            if (ts.isNamedImports(importClause.namedBindings)) {
              importClause.namedBindings.elements.forEach(element => {
                specifiers.push(element.name.getText());
              });
            } else if (ts.isNamespaceImport(importClause.namedBindings)) {
              specifiers.push(`* as ${importClause.namedBindings.name.getText()}`);
            }
          }
        }

        imports.push({
          module: moduleSpecifier.text,
          specifiers,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          isTypeOnly
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  private extractExports(sourceFile: ts.SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isExportDeclaration(node)) {
        const exportClause = node.exportClause;
        const specifiers: string[] = [];

        if (exportClause && ts.isNamedExports(exportClause)) {
          exportClause.elements.forEach(element => {
            specifiers.push(element.name.getText());
          });
        }

        exports.push({
          type: 'named',
          specifiers,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      } else if (ts.isExportAssignment(node)) {
        exports.push({
          type: node.isExportEquals ? 'namespace' : 'default',
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return exports;
  }

  private extractSymbols(sourceFile: ts.SourceFile): Map<string, ts.Symbol> {
    const symbols = new Map<string, ts.Symbol>();
    
    if (!this.typeChecker) return symbols;

    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        try {
          const symbol = this.typeChecker!.getSymbolAtLocation(node);
          if (symbol) {
            symbols.set(symbol.getName(), symbol);
          }
        } catch (error) {
          // Symbol resolution might fail for some nodes
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  private shouldProcessFile(sourceFile: ts.SourceFile): boolean {
    // Skip declaration files
    if (sourceFile.isDeclarationFile) return false;
    
    // Skip node_modules
    if (sourceFile.fileName.includes('node_modules')) return false;
    
    // Only process TS/JS/TSX/JSX files
    const ext = path.extname(sourceFile.fileName).toLowerCase();
    return ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].includes(ext);
  }

  private getDefaultCompilerOptions(overrides?: ts.CompilerOptions): ts.CompilerOptions {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      lib: ['lib.es2022.d.ts'],
      allowJs: true,
      checkJs: false,
      jsx: ts.JsxEmit.React,
      strict: false,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      allowSyntheticDefaultImports: true,
      ...overrides
    };
  }

  private findSourceFiles(rootPath: string): string[] {
    const files: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'];

    const walk = (dir: string): void => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
              walk(fullPath);
            }
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Cannot read directory: ${dir}`);
      }
    };

    walk(rootPath);
    return files;
  }

  getProgram(): ts.Program | null {
    return this.program;
  }

  getTypeChecker(): ts.TypeChecker | null {
    return this.typeChecker;
  }

  getFileHash(filePath: string): string | undefined {
    return this.fileHashes.get(filePath);
  }
}

