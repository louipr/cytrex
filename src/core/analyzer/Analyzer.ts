// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/complete_implementation.md
// Generated on: 2025-09-27T09:28:40.523Z
// ============================================================================

// Main analyzer orchestrator with complete error handling

import { Worker } from 'worker_threads';
import * as os from 'os';
import * as pLimit from 'p-limit';

export class Analyzer {
  private logger = Logger.getInstance();
  private parser: TypeScriptParser;
  private cache: CacheService;
  private config: AnalyzerConfig;
  private workerPool: WorkerPool | null = null;

  constructor(config: AnalyzerConfig) {
    this.config = this.validateConfig(config);
    this.parser = new TypeScriptParser();
    this.cache = new CacheService(config.cache);
    
    if (config.performance?.maxWorkers) {
      this.workerPool = new WorkerPool(config.performance.maxWorkers);
    }
  }

  async analyze(projectPath: string): Promise<AnalysisResult> {
    this.logger.info(`Starting analysis of ${projectPath}`);
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = await this.cache.getProjectCacheKey(projectPath, this.config);
      const cachedResult = await this.cache.get<AnalysisResult>(cacheKey);
      
      if (cachedResult && !this.config.cache?.enabled === false) {
        this.logger.info('Using cached analysis result');
        return cachedResult;
      }

      // Parse project
      this.logger.info('Parsing project...');
      const projectAST = await this.parser.parseProject(projectPath);

      // Build call graph
      this.logger.info('Building call graph...');
      const callGraphBuilder = new CallGraphBuilder(
        projectAST.program,
        projectAST.typeChecker,
        this.config.entryPoints,
        this.config.dynamicMethods
      );
      const callGraph = callGraphBuilder.build();

      // Run rules
      this.logger.info('Running analysis rules...');
      const ruleEngine = new RuleEngine(this.config.rules);
      const issues = await ruleEngine.analyze(
        projectAST,
        callGraph,
        this.config
      );

      // Calculate metrics
      const metrics = this.calculateMetrics(projectAST, callGraph, issues);

      // Generate result
      const result: AnalysisResult = {
        timestamp: new Date().toISOString(),
        projectPath,
        filesAnalyzed: projectAST.files.size,
        linesOfCode: this.countLinesOfCode(projectAST),
        duration: Date.now() - startTime,
        totalIssues: issues.length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length,
        issues: this.sortIssues(issues),
        deadCode: callGraph.findUnreachableNodes().size,
        callGraph: this.config.output.includeCallGraph ? callGraph.toJSON() : undefined,
        metrics: this.config.output.includeMetrics ? metrics : undefined
      };

      // Cache result
      await this.cache.set(cacheKey, result);

      this.logger.info(
        `Analysis complete: ${result.totalIssues} issues found in ${result.duration}ms`
      );

      return result;

    } catch (error) {
      this.logger.error('Analysis failed', error as Error);
      throw new AnalyzerError(
        `Analysis failed: ${error.message}`,
        'ANALYSIS_ERROR',
        error
      );
    } finally {
      // Cleanup
      if (this.workerPool) {
        await this.workerPool.terminate();
      }
    }
  }

  private validateConfig(config: AnalyzerConfig): AnalyzerConfig {
    // Set defaults
    const validated: AnalyzerConfig = {
      entryPoints: config.entryPoints || ['src/index.ts', 'src/main.ts'],
      exclude: config.exclude || ['**/node_modules/**', '**/*.test.ts'],
      rules: config.rules || {},
      output: {
        path: config.output?.path || 'report.json',
        format: config.output?.format || 'json',
        includeCallGraph: config.output?.includeCallGraph !== false,
        includeMetrics: config.output?.includeMetrics !== false
      },
      dynamicMethods: config.dynamicMethods || {
        patterns: [],
        decorators: [],
        keepAlive: []
      },
      performance: {
        maxWorkers: config.performance?.maxWorkers || os.cpus().length,
        maxMemory: config.performance?.maxMemory || 4096,
        timeout: config.performance?.timeout || 300000,
        incremental: config.performance?.incremental !== false
      },
      cache: {
        enabled: config.cache?.enabled !== false,
        directory: config.cache?.directory || '.analyzer-cache',
        ttl: config.cache?.ttl || 3600000,
        maxSize: config.cache?.maxSize || 104857600
      }
    };

    // Validate entry points exist
    for (const entryPoint of validated.entryPoints) {
      if (!fs.existsSync(entryPoint) && !entryPoint.includes('*')) {
        this.logger.warn(`Entry point not found: ${entryPoint}`);
      }
    }

    return validated;
  }

  private calculateMetrics(
    projectAST: any,
    callGraph: CallGraph,
    issues: Issue[]
  ): ProjectMetrics {
    const complexityValues: number[] = [];
    const fileSizes: number[] = [];

    for (const file of projectAST.files.values()) {
      fileSizes.push(file.sourceFile.getFullText().length);
    }

    for (const node of callGraph.getAllNodes()) {
      if (node.complexity) {
        complexityValues.push(node.complexity);
      }
    }

    const avg = (arr: number[]) => 
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    
    const max = (arr: number[]) => 
      arr.length > 0 ? Math.max(...arr) : 0;

    return {
      averageComplexity: avg(complexityValues),
      maxComplexity: max(complexityValues),
      averageFileSize: avg(fileSizes),
      maxFileSize: max(fileSizes),
      technicalDebt: this.estimateTechnicalDebt(issues),
      maintainabilityIndex: this.calculateMaintainabilityIndex(
        avg(complexityValues),
        fileSizes.length,
        issues.length
      )
    };
  }

  private estimateTechnicalDebt(issues: Issue[]): number {
    // Estimate in hours
    const timePerIssue = {
      error: 2,
      warning: 0.5,
      info: 0.1
    };

    return issues.reduce((total, issue) => {
      return total + timePerIssue[issue.severity];
    }, 0);
  }

  private calculateMaintainabilityIndex(
    avgComplexity: number,
    fileCount: number,
    issueCount: number
  ): number {
    // Simple maintainability index (0-100)
    const complexityScore = Math.max(0, 100 - avgComplexity * 5);
    const issueScore = Math.max(0, 100 - (issueCount / fileCount) * 10);
    
    return Math.round((complexityScore + issueScore) / 2);
  }

  private countLinesOfCode(projectAST: any): number {
    let total = 0;
    
    for (const file of projectAST.files.values()) {
      const text = file.sourceFile.getFullText();
      const lines = text.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && 
               !trimmed.startsWith('//') && 
               !trimmed.startsWith('*');
      });
      total += lines.length;
    }
    
    return total;
  }

  private sortIssues(issues: Issue[]): Issue[] {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    
    return issues.sort((a, b) => {
      // Sort by severity first
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by file
      const fileDiff = a.file.localeCompare(b.file);
      if (fileDiff !== 0) return fileDiff;
      
      // Then by line number
      return a.line - b.line;
    });
  }
}

