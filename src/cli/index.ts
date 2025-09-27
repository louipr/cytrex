// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/cli_and_tests.md
// Generated on: 2025-09-27T09:28:40.520Z
// ============================================================================

// Main CLI Entry Point with Complete Command Structure


import { Command } from 'commander';
import * as chalk from 'chalk';
import * as ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { version } from '../../package.json';
import { Analyzer } from '../core/analyzer/Analyzer';
import { loadConfig, createDefaultConfig } from '../utils/config';
import { Logger } from '../utils/logger';
import { ReportGenerator } from '../core/reporter/ReportGenerator';

const program = new Command();
const logger = Logger.getInstance();

// Main program configuration
program
  .name('code-analyzer')
  .description('Real-time static code analysis tool for TypeScript/JavaScript projects')
  .version(version)
  .option('--verbose', 'Enable verbose logging')
  .option('--quiet', 'Suppress all output except errors')
  .option('--no-color', 'Disable colored output')
  .hook('preAction', (thisCommand, actionCommand) => {
    const options = actionCommand.opts();
    if (options.verbose) {
      process.env.LOG_LEVEL = 'debug';
    }
    if (options.quiet) {
      process.env.LOG_LEVEL = 'error';
    }
    if (options.noColor) {
      chalk.level = 0;
    }
  });

// Analyze command
program
  .command('analyze [path]')
  .description('Analyze a TypeScript/JavaScript project')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --output <path>', 'Output file path')
  .option('-f, --format <type>', 'Output format (json|html|markdown)', 'json')
  .option('--rules <rules>', 'Comma-separated list of rules to run')
  .option('--severity <level>', 'Minimum severity level (error|warning|info)', 'info')
  .option('--fix', 'Automatically fix issues where possible')
  .option('--watch', 'Watch for file changes and re-analyze')
  .option('--incremental', 'Only analyze changed files')
  .option('--no-cache', 'Disable caching')
  .option('--fail-on-error', 'Exit with non-zero code if errors found')
  .option('--fail-on-warning', 'Exit with non-zero code if warnings found')
  .option('--max-warnings <number>', 'Maximum number of warnings before failing')
  .option('--json', 'Output results as JSON to stdout')
  .action(async (projectPath = '.', options) => {
    const spinner = options.quiet ? null : ora('Initializing analyzer...').start();

    try {
      // Load configuration
      spinner?.start('Loading configuration...');
      const config = await loadConfig(options.config);

      // Override with CLI options
      if (options.rules) {
        const ruleList = options.rules.split(',');
        config.rules = Object.keys(config.rules).reduce((acc, ruleId) => {
          acc[ruleId] = {
            ...config.rules[ruleId],
            enabled: ruleList.includes(ruleId)
          };
          return acc;
        }, {} as any);
      }

      if (options.output) {
        config.output.path = options.output;
      }

      if (options.format) {
        config.output.format = options.format;
      }

      if (options.noCache) {
        config.cache = { enabled: false };
      }

      // Create analyzer
      spinner?.start('Creating analyzer instance...');
      const analyzer = new Analyzer(config);

      // Watch mode
      if (options.watch) {
        spinner?.succeed('Starting watch mode...');
        await startWatchMode(analyzer, projectPath, config, options);
        return;
      }

      // Run analysis
      spinner?.start('Analyzing project...');
      const result = await analyzer.analyze(projectPath);

      spinner?.succeed(`Analysis complete: ${result.totalIssues} issues found`);

      // Display results
      if (!options.quiet && !options.json) {
        displayResults(result, options);
      }

      // Output results
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (config.output.path) {
        await saveResults(result, config.output);
        if (!options.quiet) {
          console.log(chalk.green(`✓ Report saved to ${config.output.path}`));
        }
      }

      // Determine exit code
      let exitCode = 0;
      if (options.failOnError && result.errors > 0) {
        exitCode = 1;
      } else if (options.failOnWarning && result.warnings > 0) {
        exitCode = 1;
      } else if (options.maxWarnings && result.warnings > parseInt(options.maxWarnings)) {
        exitCode = 1;
      }

      process.exit(exitCode);

    } catch (error) {
      spinner?.fail('Analysis failed');
      console.error(chalk.red(`Error: ${error.message}`));
      if (options.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a configuration file')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--preset <type>', 'Configuration preset (strict|recommended|minimal)', 'recommended')
  .action(async (options) => {
    try {
      const configPath = path.join(process.cwd(), 'analyzer.config.json');

      if (fs.existsSync(configPath) && !options.force) {
        console.error(chalk.yellow('Configuration file already exists. Use --force to overwrite.'));
        process.exit(1);
      }

      const config = await createDefaultConfig(options.preset);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      console.log(chalk.green('✓ Created analyzer.config.json'));
      console.log(chalk.gray('Edit this file to customize your analysis rules.'));

    } catch (error) {
      console.error(chalk.red(`Failed to create configuration: ${error.message}`));
      process.exit(1);
    }
  });

// List rules command
program
  .command('list-rules')
  .description('List all available analysis rules')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const rules = listAvailableRules();

    if (options.json) {
      console.log(JSON.stringify(rules, null, 2));
    } else {
      console.log(chalk.bold('\nAvailable Analysis Rules:\n'));
      console.log(chalk.gray('─'.repeat(60)));

      for (const rule of rules) {
        console.log(chalk.cyan(`  ${rule.id}`));
        console.log(`    ${rule.description}`);
        if (rule.configurable) {
          console.log(chalk.gray(`    Configurable: ${rule.configurable.join(', ')}`));
        }
        console.log();
      }

      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.gray('\nUse these IDs in your configuration file or --rules option'));
    }
  });

// Inspect command
program
  .command('inspect <file>')
  .description('Inspect a specific file for issues')
  .option('-r, --rule <rule>', 'Run only specific rule')
  .option('--ast', 'Show AST structure')
  .option('--complexity', 'Show complexity metrics')
  .option('--dependencies', 'Show file dependencies')
  .action(async (file, options) => {
    try {
      const inspector = new FileInspector();
      const result = await inspector.inspect(file, options);

      if (options.ast) {
        console.log(chalk.bold('\nAST Structure:'));
        console.log(result.ast);
      }

      if (options.complexity) {
        console.log(chalk.bold('\nComplexity Metrics:'));
        console.log(`  Cyclomatic: ${result.complexity.cyclomatic}`);
        console.log(`  Cognitive: ${result.complexity.cognitive}`);
      }

      if (options.dependencies) {
        console.log(chalk.bold('\nDependencies:'));
        result.dependencies.forEach(dep => {
          console.log(`  - ${dep}`);
        });
      }

      if (result.issues.length > 0) {
        console.log(chalk.bold('\nIssues:'));
        displayIssuesList(result.issues);
      }

    } catch (error) {
      console.error(chalk.red(`Inspection failed: ${error.message}`));
      process.exit(1);
    }
  });

// Fix command
program
  .command('fix [path]')
  .description('Automatically fix issues where possible')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .option('--rules <rules>', 'Only fix specific rules')
  .action(async (projectPath = '.', options) => {
    const spinner = ora('Preparing to fix issues...').start();

    try {
      const config = await loadConfig(options.config);
      const fixer = new AutoFixer(config);

      spinner.text = 'Analyzing issues...';
      const issues = await fixer.findFixableIssues(projectPath, options.rules?.split(','));

      if (issues.length === 0) {
        spinner.succeed('No fixable issues found');
        return;
      }

      spinner.info(`Found ${issues.length} fixable issues`);

      if (options.dryRun) {
        console.log(chalk.bold('\nIssues that would be fixed:\n'));
        issues.forEach(issue => {
          console.log(`  ${chalk.yellow('○')} ${issue.file}:${issue.line}:${issue.column}`);
          console.log(`    ${issue.message}`);
        });
      } else {
        spinner.start('Applying fixes...');
        const fixed = await fixer.applyFixes(issues);
        spinner.succeed(`Fixed ${fixed} issues`);
      }

    } catch (error) {
      spinner.fail('Fix operation failed');
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

// Helper functions
function displayResults(result: any, options: any): void {
  console.log('\n' + chalk.bold('Analysis Summary'));
  console.log(chalk.gray('─'.repeat(60)));

  const stats = [
    ['Files analyzed', chalk.cyan(result.filesAnalyzed)],
    ['Lines of code', chalk.cyan(result.linesOfCode)],
    ['Analysis time', chalk.cyan(`${result.duration}ms`)],
  ];

  stats.forEach(([label, value]) => {
    console.log(`  ${label}: ${value}`);
  });

  console.log();
  console.log('  ' + chalk.bold('Issues:'));

  const issueCounts = [
    ['Errors', result.errors, chalk.red],
    ['Warnings', result.warnings, chalk.yellow],
    ['Info', result.info, chalk.blue],
  ];

  issueCounts.forEach(([label, count, colorFn]) => {
    if (count > 0) {
      console.log(`    ${colorFn('●')} ${label}: ${colorFn(count)}`);
    }
  });

  if (result.deadCode > 0) {
    console.log(`\n  ${chalk.red('Dead code')}: ${result.deadCode} unreachable functions`);
  }

  if (result.metrics) {
    console.log('\n' + chalk.bold('  Code Metrics:'));
    console.log(`    Average complexity: ${result.metrics.averageComplexity.toFixed(1)}`);
    console.log(`    Maintainability index: ${result.metrics.maintainabilityIndex}/100`);
    console.log(`    Technical debt: ${result.metrics.technicalDebt.toFixed(1)} hours`);
  }

  console.log(chalk.gray('─'.repeat(60)));

  // Show top issues if not quiet
  if (!options.quiet && result.issues.length > 0) {
    console.log('\n' + chalk.bold('Top Issues:'));
    const topIssues = result.issues.slice(0, 5);
    displayIssuesList(topIssues);

    if (result.issues.length > 5) {
      console.log(chalk.gray(`\n  ... and ${result.issues.length - 5} more issues`));
    }
  }
}

function displayIssuesList(issues: any[]): void {
  issues.forEach(issue => {
    const icon = issue.severity === 'error' ? chalk.red('✖') :
                 issue.severity === 'warning' ? chalk.yellow('⚠') :
                 chalk.blue('ℹ');

    const location = chalk.gray(`${issue.file}:${issue.line}:${issue.column}`);
    console.log(`  ${icon} ${location}`);
    console.log(`    ${issue.message}`);
    console.log(`    ${chalk.gray(`[${issue.ruleId}]`)}`);
  });
}

async function saveResults(result: any, outputConfig: any): Promise<void> {
  const generator = new ReportGenerator();
  const report = await generator.generate(result, outputConfig.format);

  fs.writeFileSync(outputConfig.path, report);
}

async function startWatchMode(
  analyzer: Analyzer,
  projectPath: string,
  config: any,
  options: any
): Promise<void> {
  const chokidar = await import('chokidar');
  
  const watcher = chokidar.watch(projectPath, {
    ignored: [
      /(^|[\/\\])\../,
      /node_modules/,
      /dist/,
      /build/,
      new RegExp(config.output.path)
    ],
    persistent: true,
    ignoreInitial: true
  });

  console.log(chalk.blue('👁  Watching for changes...'));

  watcher.on('change', async (filePath) => {
    console.log(chalk.gray(`\n${new Date().toLocaleTimeString()} - File changed: ${filePath}`));
    
    try {
      const result = await analyzer.analyze(projectPath);
      displayResults(result, options);
    } catch (error) {
      console.error(chalk.red(`Analysis error: ${error.message}`));
    }
  });

  // Handle exit
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nStopping watch mode...'));
    watcher.close();
    process.exit(0);
  });
}

function listAvailableRules(): any[] {
  return [
    {
      id: 'complexity',
      description: 'Detects functions with high cyclomatic and cognitive complexity',
      configurable: ['threshold', 'cognitiveThreshold']
    },
    {
      id: 'dead-code',
      description: 'Detects unreachable code and unused functions',
      configurable: []
    },
    {
      id: 'unused-imports',
      description: 'Detects imports that are never used',
      configurable: []
    },
    {
      id: 'file-size',
      description: 'Detects files that exceed size thresholds',
      configurable: ['maxLines', 'maxCharacters']
    },
    {
      id: 'missing-types',
      description: 'Detects missing TypeScript type annotations',
      configurable: ['requireReturnType', 'requireParameterType', 'allowImplicitAny']
    },
    {
      id: 'circular-dependency',
      description: 'Detects circular dependencies between modules',
      configurable: []
    },
    {
      id: 'deprecated-api',
      description: 'Detects usage of deprecated APIs',
      configurable: []
    }
  ];
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

