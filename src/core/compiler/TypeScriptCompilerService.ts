import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { ITypeScriptCompilerService } from '../../types';

/**
 * TypeScript Compiler Service - Handles proper TypeScript compilation and module resolution
 * 
 * Key features based on redesign architecture:
 * - Proper .js → .ts import resolution (critical for real-world projects)
 * - Uses TypeScript's built-in module resolution instead of regex parsing
 * - Handles modern TypeScript module resolution (Node16, NodeNext)
 * - Supports complex project configurations
 */
export class TypeScriptCompilerService implements ITypeScriptCompilerService {
  private program?: ts.Program;
  private compilerOptions?: ts.CompilerOptions;

  async createProgram(projectPath: string, customOptions?: ts.CompilerOptions): Promise<ts.Program> {
    try {
      // Find tsconfig.json or create default configuration
      const configPath = this.findConfigFile(projectPath);
      const config = configPath ? this.loadConfig(configPath) : this.createDefaultConfig(projectPath);
      
      // Merge with custom options, prioritizing real-world module resolution
      this.compilerOptions = {
        ...config.options,
        ...customOptions,
        // Critical settings from redesign for .js → .ts resolution
        moduleResolution: ts.ModuleResolutionKind.Node16,
        allowJs: true,
        resolveJsonModule: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        // Performance optimizations
        skipLibCheck: true,
        skipDefaultLibCheck: true
      };

      // Create program with all project files
      const rootFiles = config.fileNames.length > 0 ? 
        config.fileNames : 
        await this.findSourceFiles(projectPath);

      this.program = ts.createProgram(rootFiles, this.compilerOptions);
      
      return this.program;
      
    } catch (error) {
      throw new Error(`Failed to create TypeScript program: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  resolveImport(from: string, importPath: string): string | null {
    if (!this.program || !this.compilerOptions) {
      throw new Error('Program not initialized. Call createProgram first.');
    }

    try {
      // Use TypeScript's built-in module resolution - this is the key improvement
      const result = ts.resolveModuleName(
        importPath,
        from,
        this.compilerOptions,
        ts.sys
      );

      return result.resolvedModule?.resolvedFileName || null;
      
    } catch (error) {
      // Fallback to manual resolution for edge cases
      return this.fallbackResolve(from, importPath);
    }
  }

  getSourceFiles(): readonly ts.SourceFile[] {
    if (!this.program) {
      throw new Error('Program not initialized. Call createProgram first.');
    }
    
    return this.program.getSourceFiles()
      .filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'));
  }

  private findConfigFile(projectPath: string): string | null {
    // Only look for tsconfig.json in the exact project directory
    // Don't traverse up to parent directories to avoid picking up unrelated configs
    const configPath = path.join(projectPath, 'tsconfig.json');
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    
    return null;
  }

  private loadConfig(configPath: string): ts.ParsedCommandLine {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    
    if (configFile.error) {
      throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`);
    }

    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath),
      undefined,
      configPath
    );

    if (parsedConfig.errors.length > 0) {
      const errors = parsedConfig.errors.map(e => e.messageText).join(', ');
      console.warn(`TypeScript config warnings: ${errors}`);
    }

    return parsedConfig;
  }

  private createDefaultConfig(projectPath: string): ts.ParsedCommandLine {
    const defaultOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      allowJs: true,
      resolveJsonModule: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false, // For broader compatibility during analysis
      skipLibCheck: true
    };

    return {
      options: defaultOptions,
      fileNames: [],
      errors: []
    };
  }

  private async findSourceFiles(projectPath: string): Promise<string[]> {
    const sourceFiles: string[] = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const normalizedProjectPath = path.resolve(projectPath);
    
    await this.walkDirectory(normalizedProjectPath, (filePath) => {
      const ext = path.extname(filePath);
      const relativePath = path.relative(normalizedProjectPath, filePath);
      
      // Only include files that are actually within the project directory
      if (extensions.includes(ext) && 
          !filePath.includes('node_modules') && 
          !relativePath.startsWith('..') &&
          !path.isAbsolute(relativePath)) {
        sourceFiles.push(filePath);
      }
    });

    return sourceFiles;
  }

  private async walkDirectory(dir: string, callback: (filePath: string) => void): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip common non-source directories
        if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
          await this.walkDirectory(fullPath, callback);
        }
      } else {
        callback(fullPath);
      }
    }
  }

  private fallbackResolve(from: string, importPath: string): string | null {
    const fromDir = path.dirname(from);
    
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(fromDir, importPath);
      
      // Try common extensions - critical for .js → .ts resolution
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
      
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
    }
    
    // Handle absolute imports (node_modules, etc.)
    // This is simplified - in practice, would need full Node.js resolution algorithm
    return null;
  }

  /**
   * Get diagnostics for a specific file - useful for validation
   */
  getDiagnostics(filePath?: string): readonly ts.Diagnostic[] {
    if (!this.program) {
      throw new Error('Program not initialized. Call createProgram first.');
    }

    if (filePath) {
      const sourceFile = this.program.getSourceFile(filePath);
      if (sourceFile) {
        return [
          ...this.program.getSemanticDiagnostics(sourceFile),
          ...this.program.getSyntacticDiagnostics(sourceFile)
        ];
      }
      return [];
    }

    return this.program.getGlobalDiagnostics();
  }

  /**
   * Check if a module specifier should be treated as external
   */
  isExternalModule(moduleSpecifier: string): boolean {
    return !moduleSpecifier.startsWith('.') && !path.isAbsolute(moduleSpecifier);
  }
}
