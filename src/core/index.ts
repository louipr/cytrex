import { UnifiedAnalysisEngine } from './engine/UnifiedAnalysisEngine';
import { TypeScriptCompilerService } from './compiler/TypeScriptCompilerService';
import { DependencyGraph } from './graph/DependencyGraph';
import { PatternDetector } from './patterns/PatternDetector';
import { UnifiedAnalysisConfig } from '../types';

/**
 * Factory for creating configured UnifiedAnalysisEngine instances
 * 
 * Provides convenient factory methods for different use cases based on
 * the redesign architecture improvements.
 */
export class AnalysisEngineFactory {
  
  /**
   * Create a standard analysis engine with default configuration
   */
  static createStandard(): UnifiedAnalysisEngine {
    const compiler = new TypeScriptCompilerService();
    const graph = new DependencyGraph();
    const patterns = new PatternDetector();
    
    return new UnifiedAnalysisEngine(compiler, graph, patterns);
  }

  /**
   * Create an analysis engine optimized for CLI projects
   * Based on the redesign insight about CLI entry point patterns
   */
  static createForCLI(): UnifiedAnalysisEngine {
    const compiler = new TypeScriptCompilerService();
    const graph = new DependencyGraph();
    const patterns = new PatternDetector();
    
    const engine = new UnifiedAnalysisEngine(compiler, graph, patterns);
    
    return engine;
  }

  /**
   * Create an analysis engine with custom configuration
   */
  static createWithConfig(config: Partial<UnifiedAnalysisConfig>): { engine: UnifiedAnalysisEngine, config: UnifiedAnalysisConfig } {
    const compiler = new TypeScriptCompilerService();
    const graph = new DependencyGraph();
    const patterns = new PatternDetector();
    
    // Merge with default config
    const fullConfig: UnifiedAnalysisConfig = {
      ...DEFAULT_UNIFIED_CONFIG,
      ...config
    };
    
    const engine = new UnifiedAnalysisEngine(compiler, graph, patterns);
    return { engine, config: fullConfig };
  }

  /**
   * Create an analysis engine optimized for service container architectures
   * Reduced confidence thresholds based on redesign findings
   */
  static createForServiceContainer(): { engine: UnifiedAnalysisEngine, config: UnifiedAnalysisConfig } {
    const compiler = new TypeScriptCompilerService();
    const graph = new DependencyGraph();
    const patterns = new PatternDetector();
    
    // Service container optimized config
    const serviceContainerConfig: UnifiedAnalysisConfig = {
      ...DEFAULT_UNIFIED_CONFIG,
      confidenceThresholds: {
        minimumThreshold: 40, // Even lower for service container architectures
        architecturalCoreMultiplier: 0.3, // More aggressive reduction
        dynamicPatternBonus: 30 // Higher bonus for dynamic patterns
      },
      dynamicPatterns: {
        serviceContainers: ['container', 'Container', 'di', 'DI', 'inject', 'Inject'],
        commandBus: ['commandBus', 'CommandBus', 'eventBus', 'EventBus', 'mediator', 'Mediator'],
        dynamicImports: true,
        customPatterns: []
      }
    };
    
    const engine = new UnifiedAnalysisEngine(compiler, graph, patterns);
    return { engine, config: serviceContainerConfig };
  }
}

/**
 * Default configuration based on redesign architecture insights
 */
export const DEFAULT_UNIFIED_CONFIG: UnifiedAnalysisConfig = {
  entryPoints: [],
  exclude: [
    'node_modules/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    'dist/**',
    'build/**',
    'coverage/**'
  ],
  rules: {},
  output: {
    path: './cytrex-analysis.json',
    format: 'json',
    includeCallGraph: true,
    includeMetrics: true
  },
  dynamicMethods: {
    patterns: [],
    decorators: ['Injectable', 'Service', 'Component'],
    keepAlive: []
  },
  // Enhanced configuration from redesign
  compilerOptions: {
    moduleResolution: 2, // ts.ModuleResolutionKind.Node16
    allowJs: true,
    resolveJsonModule: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    skipLibCheck: true
  },
  dynamicPatterns: {
    serviceContainers: ['container', 'Container', 'di', 'DI'],
    commandBus: ['commandBus', 'CommandBus', 'eventBus', 'EventBus'],
    dynamicImports: true,
    customPatterns: []
  },
  confidenceThresholds: {
    minimumThreshold: 50, // Reduced from typical 80 based on real-world validation
    architecturalCoreMultiplier: 0.5, // Key insight: architectural files need lower confidence
    dynamicPatternBonus: 20
  }
};

// Re-export main classes for convenience
export { UnifiedAnalysisEngine } from './engine/UnifiedAnalysisEngine';
export { TypeScriptCompilerService } from './compiler/TypeScriptCompilerService';
export { DependencyGraph } from './graph/DependencyGraph';
export { PatternDetector } from './patterns/PatternDetector';
