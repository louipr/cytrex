// Core type definitions and interfaces

export interface AnalyzerConfig {
  entryPoints: string[];
  exclude: string[];
  rules: RuleConfigMap;
  output: OutputConfig;
  dynamicMethods: DynamicMethodConfig;
  performance?: PerformanceConfig;
  cache?: CacheConfig;
}

export interface RuleConfigMap {
  [ruleId: string]: RuleConfig;
}

export interface RuleConfig {
  enabled: boolean;
  severity?: 'error' | 'warning' | 'info';
  threshold?: number;
  options?: Record<string, any>;
}

export interface OutputConfig {
  path: string;
  format: 'json' | 'html' | 'markdown';
  includeCallGraph?: boolean;
  includeMetrics?: boolean;
}

export interface DynamicMethodConfig {
  patterns: string[];
  decorators: string[];
  keepAlive?: string[];
}

export interface PerformanceConfig {
  maxWorkers?: number;
  maxMemory?: number;
  timeout?: number;
  incremental?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  directory?: string;
  ttl?: number;
  maxSize?: number;
}

export interface Issue {
  id: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  fix?: CodeFix;
  metadata?: Record<string, any>;
}

export interface CodeFix {
  description: string;
  changes: FileChange[];
}

export interface FileChange {
  file: string;
  start: Position;
  end: Position;
  replacement: string;
}

export interface Position {
  line: number;
  column: number;
}

export interface AnalysisResult {
  timestamp: string;
  projectPath: string;
  filesAnalyzed: number;
  linesOfCode: number;
  duration: number;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: Issue[];
  deadCode: number;
  callGraph?: CallGraphData;
  metrics?: ProjectMetrics;
}

export interface CallGraphData {
  nodes: CallNode[];
  edges: Edge[];
  entryPoints: string[];
  unreachable: string[];
}

export interface CallNode {
  id: string;
  name: string;
  file: string;
  line: number;
  type: 'function' | 'method' | 'constructor' | 'arrow' | 'dynamic';
  isAsync?: boolean;
  isExported?: boolean;
  isDynamic?: boolean;
  complexity?: number;
}

export interface Edge {
  from: string;
  to: string;
  type?: 'sync' | 'async' | 'dynamic';
}

export interface ProjectMetrics {
  averageComplexity: number;
  maxComplexity: number;
  averageFileSize: number;
  maxFileSize: number;
  testCoverage?: number;
  technicalDebt: number;
  maintainabilityIndex: number;
}

export interface ImportInfo {
  module: string;
  specifiers: string[];
  line: number;
  isTypeOnly?: boolean;
}

export interface ExportInfo {
  type: 'named' | 'default' | 'namespace';
  specifiers?: string[];
  line: number;
}

// Rule system interfaces
export interface RuleContext {
  sourceFile: import('typescript').SourceFile;
  program: import('typescript').Program;
  typeChecker: import('typescript').TypeChecker;
  filePath: string;
  config: RuleConfig;
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export abstract class Rule {
  abstract readonly id: string;
  abstract readonly description: string;
  abstract readonly category: string;
  
  protected createIssue(params: {
    file: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    message: string;
    severity?: 'error' | 'warning' | 'info';
    metadata?: Record<string, any>;
  }): Issue {
    return {
      id: `${this.id}-${Date.now()}`,
      ruleId: this.id,
      severity: params.severity || 'warning',
      file: params.file,
      line: params.line,
      column: params.column,
      endLine: params.endLine,
      endColumn: params.endColumn,
      message: params.message,
      metadata: params.metadata,
    };
  }
  
  abstract check(node: import('typescript').Node, context: RuleContext): Issue[];
}

// ============================================================================
// REDESIGN ARCHITECTURE TYPES - Based on real-world validation
// ============================================================================

export interface UnifiedAnalysisConfig extends AnalyzerConfig {
  // Enhanced configuration for unified engine
  compilerOptions?: import('typescript').CompilerOptions;
  moduleResolution?: 'node' | 'node16' | 'nodenext';
  dynamicPatterns?: DynamicPatternConfig;
  confidenceThresholds?: ConfidenceConfig;
}

export interface DynamicPatternConfig {
  serviceContainers: string[];
  commandBus: string[];
  dynamicImports: boolean;
  customPatterns: PatternDefinition[];
}

export interface PatternDefinition {
  name: string;
  patterns: RegExp[];
  extractSymbol: (match: RegExpMatchArray) => string;
}

export interface ConfidenceConfig {
  minimumThreshold: number; // Default: 50 (reduced from typical 80)
  architecturalCoreMultiplier: number; // Default: 0.5
  dynamicPatternBonus: number; // Default: 20 - PENALTY applied when dynamic patterns are detected (reduces confidence)
}

export enum DependencyType {
  IMPORT = 'import',
  REQUIRE = 'require', 
  DYNAMIC_IMPORT = 'dynamic_import',
  TYPE_IMPORT = 'type_import',
  REFERENCE = 'reference'
}

export interface DependencyNode {
  filePath: string;
  importCount: number;
  lastImportType: DependencyType;
  isEntryPoint: boolean;
  isArchitecturalCore: boolean;
  confidence: number;
}

export interface DynamicUsage {
  serviceContainer: Map<string, Set<string>>;
  commandBus: Map<string, Set<string>>;
  dynamicImports: Map<string, Set<string>>;
  customPatterns: Map<string, Set<string>>;
}

export interface DeadFile {
  path: string;
  confidence: number;
  reasons: string[];
  suggestions?: string[];
}

export interface UnifiedAnalysisResult extends AnalysisResult {
  // Enhanced results with confidence scoring
  deadFiles: DeadFile[];
  dependencyGraph: DependencyGraphInfo;
  entryPoints: string[];
  dynamicUsage: DynamicUsage;
  performanceMetrics: PerformanceMetrics;
}

export interface DependencyGraphInfo {
  totalNodes: number;
  totalEdges: number;
  entryPointCount: number;
  reachableFiles: number;
  unreachableFiles: number;
  circularDependencies: string[][];
}

export interface PerformanceMetrics {
  analysisTimeMs: number;
  memoryUsageMB: number;
  filesProcessed: number;
  linesOfCode: number;
  cacheHitRate?: number;
}

// Service interfaces for the unified engine
export interface ITypeScriptCompilerService {
  createProgram(projectPath: string, options?: import('typescript').CompilerOptions): Promise<import('typescript').Program>;
  resolveImport(from: string, importPath: string): string | null;
  getSourceFiles(): readonly import('typescript').SourceFile[];
}

export interface IDependencyGraph {
  addFile(filePath: string): void;
  addDependency(from: string, to: string, type: DependencyType): void;
  addEntryPoint(filePath: string): void;
  findReachable(): Set<string>;
  getAllFiles(): string[];
  getNode(filePath: string): DependencyNode | undefined;
  getCycles(): string[][];
}

export interface IPatternDetector {
  detect(program: import('typescript').Program): Promise<DynamicUsage>;
  detectEntryPoints(projectPath: string): Promise<string[]>;
  isArchitecturalCore(filePath: string): boolean;
}

export interface IUnifiedAnalysisEngine {
  analyze(projectPath: string, config?: UnifiedAnalysisConfig): Promise<UnifiedAnalysisResult>;
  analyzeIncremental(changes: string[]): Promise<UnifiedAnalysisResult>;
}

