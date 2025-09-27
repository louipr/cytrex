import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { 
  AnalysisEngineFactory, 
  DEFAULT_UNIFIED_CONFIG, 
  UnifiedAnalysisEngine 
} from '../core';
import { UnifiedAnalysisConfig, UnifiedAnalysisResult } from '../types';

/**
 * Modern CLI implementation using the UnifiedAnalysisEngine
 * Integrates the hybrid architecture with redesign improvements
 */

export interface CLIOptions {
  config?: string;
  output?: string;
  format?: 'json' | 'html' | 'markdown';
  verbose?: boolean;
  quiet?: boolean;
  watch?: boolean;
  incremental?: boolean;
  cache?: boolean;
  failOnError?: boolean;
  failOnWarning?: boolean;
  maxWarnings?: string;
  json?: boolean;
  threshold?: string;
  architecture?: 'standard' | 'service-container' | 'cli';
}

export class ModernCLI {
  private engine?: UnifiedAnalysisEngine;
  private config?: UnifiedAnalysisConfig;

  async analyze(projectPath: string, options: CLIOptions): Promise<UnifiedAnalysisResult> {
    const spinner = options.quiet ? null : ora('🔍 Initializing unified analysis engine...').start();

    try {
      // Step 1: Load and merge configuration
      spinner?.start('📋 Loading configuration...');
      await this.loadConfiguration(options);

      // Step 2: Create optimized engine based on architecture type
      spinner?.start('⚙️ Creating analysis engine...');
      this.createEngine(options.architecture || 'standard');

      // Step 3: Apply CLI overrides to config
      this.applyCliOverrides(options);

      // Step 4: Run analysis with unified engine
      spinner?.start('🔬 Analyzing project with hybrid architecture...');
      const result = await this.engine!.analyze(projectPath, this.config);

      spinner?.succeed(`✅ Analysis complete: ${result.deadFiles.length} potential dead files found`);

      // Step 5: Display results
      if (!options.quiet && !options.json) {
        this.displayResults(result, options);
      }

      // Step 6: Save results if requested
      if (options.output || options.json) {
        await this.outputResults(result, options);
      }

      return result;

    } catch (error) {
      spinner?.fail('❌ Analysis failed');
      throw error;
    }
  }

  private async loadConfiguration(options: CLIOptions): Promise<void> {
    if (options.config && fs.existsSync(options.config)) {
      // Load custom config file
      const configContent = await fs.promises.readFile(options.config, 'utf-8');
      const customConfig = JSON.parse(configContent);
      this.config = { ...DEFAULT_UNIFIED_CONFIG, ...customConfig };
    } else {
      // Use default config
      this.config = { ...DEFAULT_UNIFIED_CONFIG };
    }
  }

  private createEngine(architecture: string): void {
    switch (architecture) {
      case 'service-container':
        const serviceResult = AnalysisEngineFactory.createForServiceContainer();
        this.engine = serviceResult.engine;
        this.config = serviceResult.config;
        break;
        
      case 'cli':
        this.engine = AnalysisEngineFactory.createForCLI();
        break;
        
      default:
        this.engine = AnalysisEngineFactory.createStandard();
        break;
    }
  }

  private applyCliOverrides(options: CLIOptions): void {
    if (!this.config) return;

    // Override output settings
    if (options.output) {
      this.config.output.path = options.output;
    }

    if (options.format) {
      this.config.output.format = options.format;
    }

    // Override confidence threshold (key redesign feature)
    if (options.threshold) {
      const threshold = parseInt(options.threshold);
      if (!isNaN(threshold)) {
        this.config.confidenceThresholds = {
          ...this.config.confidenceThresholds!,
          minimumThreshold: threshold
        };
      }
    }

    // Disable cache if requested
    if (options.cache === false) {
      this.config.cache = { enabled: false };
    }
  }

  private displayResults(result: UnifiedAnalysisResult, options: CLIOptions): void {
    console.log('\n' + chalk.bold('📊 Analysis Results:'));
    console.log('─'.repeat(50));
    
    // Basic metrics
    console.log(`📁 Files processed: ${chalk.cyan(result.filesAnalyzed)}`);
    console.log(`📝 Lines of code: ${chalk.cyan(result.linesOfCode.toLocaleString())}`);
    console.log(`⏱️  Analysis time: ${chalk.cyan(result.performanceMetrics.analysisTimeMs)}ms`);
    console.log(`🎯 Entry points: ${chalk.cyan(result.entryPoints.length)}`);

    // Dependency graph info
    console.log(`\n🔗 Dependency Graph:`);
    console.log(`   Total files: ${result.dependencyGraph.totalNodes}`);
    console.log(`   Reachable: ${chalk.green(result.dependencyGraph.reachableFiles)}`);
    console.log(`   Unreachable: ${chalk.yellow(result.dependencyGraph.unreachableFiles)}`);

    // Dead code results with confidence scores
    if (result.deadFiles.length > 0) {
      console.log(`\n💀 Potential Dead Code:`);
      result.deadFiles.forEach(deadFile => {
        const confidenceColor = deadFile.confidence >= 80 ? chalk.red : 
                               deadFile.confidence >= 60 ? chalk.yellow : chalk.gray;
        console.log(`   ${confidenceColor('●')} ${path.relative(process.cwd(), deadFile.path)} ${confidenceColor(`(${deadFile.confidence}% confidence)`)}`);
        
        if (options.verbose && deadFile.reasons.length > 0) {
          deadFile.reasons.forEach(reason => {
            console.log(`     ${chalk.gray('└─')} ${reason}`);
          });
        }
      });
    } else {
      console.log(`\n✅ ${chalk.green('No dead code detected!')}`);
    }

    // Dynamic usage detection (redesign feature)
    const dynamicUsageCount = 
      result.dynamicUsage.serviceContainer.size +
      result.dynamicUsage.commandBus.size +
      result.dynamicUsage.dynamicImports.size;

    if (dynamicUsageCount > 0) {
      console.log(`\n🔮 Dynamic Usage Patterns Detected: ${chalk.cyan(dynamicUsageCount)}`);
      if (options.verbose) {
        if (result.dynamicUsage.serviceContainer.size > 0) {
          console.log(`   Service containers: ${result.dynamicUsage.serviceContainer.size}`);
        }
        if (result.dynamicUsage.commandBus.size > 0) {
          console.log(`   Command buses: ${result.dynamicUsage.commandBus.size}`);
        }
        if (result.dynamicUsage.dynamicImports.size > 0) {
          console.log(`   Dynamic imports: ${result.dynamicUsage.dynamicImports.size}`);
        }
      }
    }

    console.log(''); // Empty line for spacing
  }

  private async outputResults(result: UnifiedAnalysisResult, options: CLIOptions): Promise<void> {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (options.output) {
      const outputPath = path.resolve(options.output);
      
      if (options.format === 'json' || outputPath.endsWith('.json')) {
        await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2));
      } else if (options.format === 'markdown' || outputPath.endsWith('.md')) {
        const markdown = this.generateMarkdownReport(result);
        await fs.promises.writeFile(outputPath, markdown);
      } else {
        // Default to JSON
        await fs.promises.writeFile(outputPath, JSON.stringify(result, null, 2));
      }

      if (!options.quiet) {
        console.log(chalk.green(`📄 Report saved to ${outputPath}`));
      }
    }
  }

  private generateMarkdownReport(result: UnifiedAnalysisResult): string {
    const timestamp = new Date().toISOString();
    
    return `# Cytrex Analysis Report

Generated: ${timestamp}

## Summary

- **Files Analyzed**: ${result.filesAnalyzed}
- **Lines of Code**: ${result.linesOfCode.toLocaleString()}
- **Analysis Time**: ${result.performanceMetrics.analysisTimeMs}ms
- **Entry Points**: ${result.entryPoints.length}

## Dependency Graph

- **Total Files**: ${result.dependencyGraph.totalNodes}
- **Reachable Files**: ${result.dependencyGraph.reachableFiles}
- **Unreachable Files**: ${result.dependencyGraph.unreachableFiles}
- **Circular Dependencies**: ${result.dependencyGraph.circularDependencies.length}

## Dead Code Analysis

${result.deadFiles.length === 0 ? '✅ No dead code detected!' : `Found ${result.deadFiles.length} potentially dead files:`}

${result.deadFiles.map(df => `### ${path.basename(df.path)}

- **Path**: \`${df.path}\`
- **Confidence**: ${df.confidence}%
- **Reasons**: ${df.reasons.join(', ')}
${df.suggestions ? `- **Suggestions**: ${df.suggestions.join(', ')}` : ''}

`).join('')}

## Dynamic Usage Patterns

- **Service Container Patterns**: ${result.dynamicUsage.serviceContainer.size}
- **Command Bus Patterns**: ${result.dynamicUsage.commandBus.size}  
- **Dynamic Imports**: ${result.dynamicUsage.dynamicImports.size}

---
*Generated by Cytrex Static Analysis Tool*
`;
  }

  checkExitConditions(result: UnifiedAnalysisResult, options: CLIOptions): number {
    let exitCode = 0;

    if (options.failOnError && result.errors > 0) {
      exitCode = 1;
    } else if (options.failOnWarning && result.warnings > 0) {
      exitCode = 1;
    } else if (options.maxWarnings) {
      const maxWarnings = parseInt(options.maxWarnings);
      if (!isNaN(maxWarnings) && result.warnings > maxWarnings) {
        exitCode = 1;
      }
    }

    return exitCode;
  }
}
