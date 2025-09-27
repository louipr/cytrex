import * as ts from 'typescript';
import * as path from 'path';
import { 
  IUnifiedAnalysisEngine, 
  UnifiedAnalysisConfig, 
  UnifiedAnalysisResult,
  ITypeScriptCompilerService,
  IDependencyGraph,
  IPatternDetector,
  DynamicUsage,
  DeadFile,
  DependencyGraphInfo,
  PerformanceMetrics,
  DependencyType
} from '../../types';

/**
 * Unified Analysis Engine - Core implementation based on redesign architecture
 * 
 * Key improvements over separate analyzers:
 * - Single-pass analysis using TypeScript Compiler API
 * - Proper .js → .ts import resolution 
 * - Confidence-based dead code detection
 * - Smart entry point detection (including CLI patterns)
 * - Dynamic pattern recognition for service containers
 */
export class UnifiedAnalysisEngine implements IUnifiedAnalysisEngine {
  private compiler: ITypeScriptCompilerService;
  private graph: IDependencyGraph;
  private patterns: IPatternDetector;

  constructor(
    compiler: ITypeScriptCompilerService,
    graph: IDependencyGraph,
    patterns: IPatternDetector
  ) {
    this.compiler = compiler;
    this.graph = graph;
    this.patterns = patterns;
  }

  async analyze(projectPath: string, config?: UnifiedAnalysisConfig): Promise<UnifiedAnalysisResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Phase 1: Build complete AST using TypeScript API
      const program = await this.compiler.createProgram(projectPath, config?.compilerOptions);
      
      // Phase 2: Detect entry points (including CLI patterns from redesign)
      const entryPoints = await this.patterns.detectEntryPoints(projectPath);
      entryPoints.forEach(ep => this.graph.addEntryPoint(ep));
      
      // Phase 3: Extract all dependencies in one pass
      await this.extractDependencies(program);
      
      // Phase 4: Pattern detection for dynamic usage (key improvement)
      const dynamicUsage = await this.patterns.detect(program);
      
      // Phase 5: Reachability analysis from entry points
      const reachable = this.graph.findReachable();
      
      // Phase 6: Confidence-based dead code detection
      const deadFiles = this.findDeadCode(reachable, dynamicUsage, config);
      
      // Phase 7: Gather metrics and build result
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      return this.buildResult(
        deadFiles,
        entryPoints,
        dynamicUsage,
        {
          analysisTimeMs: endTime - startTime,
          memoryUsageMB: (endMemory - startMemory) / 1024 / 1024,
          filesProcessed: program.getSourceFiles().length,
          linesOfCode: this.calculateLinesOfCode(program)
        }
      );
      
    } catch (error) {
      console.error('❌ Analysis failed in phase:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async analyzeIncremental(changes: string[]): Promise<UnifiedAnalysisResult> {
    // TODO: Implement incremental analysis for performance
    // For now, fall back to full analysis
    throw new Error('Incremental analysis not yet implemented');
  }

  private async extractDependencies(program: ts.Program): Promise<void> {
    const sourceFiles = program.getSourceFiles()
      .filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'));

    for (const sourceFile of sourceFiles) {
      this.extractFileDependencies(sourceFile);
    }
  }

  private extractFileDependencies(sourceFile: ts.SourceFile): void {
    const filePath = sourceFile.fileName;

    try {
      ts.forEachChild(sourceFile, (node) => {
        try {
          if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
            const moduleSpecifier = node.moduleSpecifier;
            if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text) {
              const resolvedPath = this.compiler.resolveImport(filePath, moduleSpecifier.text);
              if (resolvedPath) {
                this.graph.addDependency(filePath, resolvedPath, this.getImportType(node));
              }
            }
          } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
            const moduleSpecifier = node.moduleSpecifier;
            if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text) {
              const resolvedPath = this.compiler.resolveImport(filePath, moduleSpecifier.text);
              if (resolvedPath) {
                this.graph.addDependency(filePath, resolvedPath, this.getImportType(node));
              }
            }
          } else if (ts.isCallExpression(node)) {
            // Handle dynamic imports: import('module')
            if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
              const arg = node.arguments[0];
              if (ts.isStringLiteral(arg) && arg.text) {
                const resolvedPath = this.compiler.resolveImport(filePath, arg.text);
                if (resolvedPath) {
                  this.graph.addDependency(filePath, resolvedPath, this.getImportType(node));
                }
              }
            }
          }
        } catch (nodeError) {
          console.warn(`Warning: Error processing node in ${filePath}:`, nodeError);
        }
      });
    } catch (fileError) {
      console.warn(`Warning: Error processing file ${filePath}:`, fileError);
    }
  }

  private getImportType(node: ts.Node): DependencyType {
    if (ts.isImportDeclaration(node)) {
      return node.importClause?.isTypeOnly ? 
        DependencyType.TYPE_IMPORT : 
        DependencyType.IMPORT;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      return DependencyType.DYNAMIC_IMPORT;
    }
    return DependencyType.REFERENCE;
  }

  private findDeadCode(
    reachable: Set<string>, 
    dynamicUsage: DynamicUsage,
    config?: UnifiedAnalysisConfig
  ): DeadFile[] {
    const allFiles = this.graph.getAllFiles();
    const dead: DeadFile[] = [];
    const threshold = config?.confidenceThresholds?.minimumThreshold ?? 50;
    const coreMultiplier = config?.confidenceThresholds?.architecturalCoreMultiplier ?? 0.5;

    for (const file of allFiles) {
      if (!reachable.has(file)) {
        let confidence = this.calculateBaseConfidence(file);
        
        // Key insight from redesign: reduce confidence for architectural core files 
        if (this.patterns.isArchitecturalCore(file)) {
          confidence *= coreMultiplier;
        }
        
        // Boost confidence if no dynamic usage detected
        if (!this.hasAnyDynamicUsage(file, dynamicUsage)) {
          confidence += (config?.confidenceThresholds?.dynamicPatternBonus ?? 20);
        }

        if (confidence >= threshold) {
          dead.push({
            path: file,
            confidence,
            reasons: this.analyzeDeadReasons(file),
            suggestions: this.generateSuggestions(file)
          });
        }
      }
    }

    return dead.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateBaseConfidence(filePath: string): number {
    const node = this.graph.getNode(filePath);
    if (!node) return 100;

    // Lower confidence for files with more imports (more likely to be used)
    const importPenalty = Math.min(node.importCount * 10, 50);
    return Math.max(100 - importPenalty, 10);
  }

  private hasAnyDynamicUsage(filePath: string, usage: DynamicUsage): boolean {
    const filename = path.basename(filePath, path.extname(filePath));
    
    for (const files of usage.serviceContainer.values()) {
      if (files.has(filename)) return true;
    }
    for (const files of usage.commandBus.values()) {
      if (files.has(filename)) return true;
    }
    for (const files of usage.dynamicImports.values()) {
      if (files.has(filename)) return true;
    }
    
    return false;
  }

  private analyzeDeadReasons(filePath: string): string[] {
    const reasons: string[] = [];
    const node = this.graph.getNode(filePath);
    
    if (!node) {
      reasons.push('File not found in dependency graph');
      return reasons;
    }

    if (node.importCount === 0) {
      reasons.push('No imports detected');
    }
    
    if (!node.isEntryPoint) {
      reasons.push('Not an entry point');
    }

    reasons.push('Not reachable from any entry point');
    
    return reasons;
  }

  private generateSuggestions(filePath: string): string[] {
    const suggestions: string[] = [];
    const basename = path.basename(filePath);
    
    if (basename.includes('Test') || basename.includes('Spec')) {
      suggestions.push('Consider if this test file covers important edge cases');
    }
    
    if (this.patterns.isArchitecturalCore(filePath)) {
      suggestions.push('Verify this architectural component is not used via service container');
    }
    
    suggestions.push('Review for dynamic usage patterns before deletion');
    
    return suggestions;
  }

  private calculateLinesOfCode(program: ts.Program): number {
    return program.getSourceFiles()
      .filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'))
      .reduce((total, sf) => total + sf.getLineAndCharacterOfPosition(sf.getEnd()).line + 1, 0);
  }

  private buildResult(
    deadFiles: DeadFile[],
    entryPoints: string[],
    dynamicUsage: DynamicUsage,
    metrics: PerformanceMetrics
  ): UnifiedAnalysisResult {
    const dependencyGraphInfo: DependencyGraphInfo = {
      totalNodes: this.graph.getAllFiles().length,
      totalEdges: 0, // TODO: Calculate from graph
      entryPointCount: entryPoints.length,
      reachableFiles: this.graph.findReachable().size,
      unreachableFiles: deadFiles.length,
      circularDependencies: this.graph.getCycles()
    };

    return {
      // Base AnalysisResult properties
      timestamp: new Date().toISOString(),
      projectPath: '', // Will be set by caller
      filesAnalyzed: metrics.filesProcessed,
      linesOfCode: metrics.linesOfCode,
      duration: metrics.analysisTimeMs,
      totalIssues: deadFiles.length,
      errors: 0,
      warnings: deadFiles.length,
      info: 0,
      issues: deadFiles.map(df => ({
        id: `dead-code-${Date.now()}`,
        ruleId: 'dead-code',
        severity: 'warning' as const,
        file: df.path,
        line: 1,
        column: 1,
        message: `Dead code detected (confidence: ${df.confidence}%)`,
        metadata: { confidence: df.confidence, reasons: df.reasons }
      })),
      deadCode: deadFiles.length,
      metrics: {
        averageComplexity: 0, // TODO: Calculate from AST
        maxComplexity: 0,
        averageFileSize: metrics.linesOfCode / (metrics.filesProcessed || 1),
        maxFileSize: 0, // TODO: Calculate
        technicalDebt: deadFiles.length * 10, // Rough estimate
        maintainabilityIndex: Math.max(100 - deadFiles.length, 0)
      },
      
      // Enhanced UnifiedAnalysisResult properties
      deadFiles,
      dependencyGraph: dependencyGraphInfo,
      entryPoints,
      dynamicUsage,
      performanceMetrics: metrics
    };
  }
}
