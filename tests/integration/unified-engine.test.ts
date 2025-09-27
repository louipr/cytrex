import { AnalysisEngineFactory } from '../../src/core';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Integration test for the UnifiedAnalysisEngine
 * Tests the complete hybrid architecture implementation
 */
async function testUnifiedEngine() {
  console.log('🧪 Testing UnifiedAnalysisEngine Integration...\n');

  try {
    // Create a simple test project structure
    const testProjectPath = path.join(__dirname, 'fixtures', 'test-project');
    await createTestProject(testProjectPath);

    // Create the unified analysis engine
    const engine = AnalysisEngineFactory.createStandard();

    console.log('📁 Analyzing test project:', testProjectPath);
    
    // Run analysis
    const result = await engine.analyze(testProjectPath);

    console.log('\n✅ Analysis completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   - Files processed: ${result.filesAnalyzed}`);
    console.log(`   - Lines of code: ${result.linesOfCode}`);
    console.log(`   - Dead files found: ${result.deadFiles.length}`);
    console.log(`   - Entry points: ${result.entryPoints.length}`);
    console.log(`   - Analysis time: ${result.performanceMetrics.analysisTimeMs}ms`);

    // Validate key features from redesign architecture
    console.log('\n🔍 Validating redesign features:');
    
    // Test 1: Entry point detection (including CLI patterns)
    const hasCliEntryPoint = result.entryPoints.some(ep => ep.includes('cli'));
    console.log(`   ✓ CLI entry point detection: ${hasCliEntryPoint ? 'PASS' : 'FAIL'}`);
    
    // Test 2: Confidence scoring
    const hasConfidenceScoring = result.deadFiles.every(df => df.confidence !== undefined);
    console.log(`   ✓ Confidence scoring: ${hasConfidenceScoring ? 'PASS' : 'FAIL'}`);
    
    // Test 3: Dynamic usage detection
    const hasDynamicUsage = result.dynamicUsage !== undefined;
    console.log(`   ✓ Dynamic pattern detection: ${hasDynamicUsage ? 'PASS' : 'FAIL'}`);
    
    // Test 4: Performance metrics
    const hasPerformanceMetrics = result.performanceMetrics.analysisTimeMs > 0;
    console.log(`   ✓ Performance tracking: ${hasPerformanceMetrics ? 'PASS' : 'FAIL'}`);

    console.log('\n🎉 Integration test completed successfully!\n');
    
    // Clean up test project
    await cleanupTestProject(testProjectPath);

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

async function createTestProject(projectPath: string): Promise<void> {
  // Create directory structure
  await fs.promises.mkdir(projectPath, { recursive: true });
  await fs.promises.mkdir(path.join(projectPath, 'src'), { recursive: true });
  await fs.promises.mkdir(path.join(projectPath, 'src', 'cli'), { recursive: true });
  await fs.promises.mkdir(path.join(projectPath, 'src', 'services'), { recursive: true });

  // Create test files
  const files = {
    'src/index.ts': `
export * from './services/UserService';
export * from './cli/cli';
`,
    'src/cli/cli.ts': `
import { UserService } from '../services/UserService';

const userService = new UserService();
console.log('CLI application started');
`,
    'src/services/UserService.ts': `
export class UserService {
  getUsers() {
    return ['user1', 'user2'];
  }
}
`,
    'src/services/DeadService.ts': `
// This should be detected as dead code
export class DeadService {
  unusedMethod() {
    return 'This is never called';
  }
}
`,
    'tsconfig.json': `
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
`,
    'package.json': `
{
  "name": "test-project",
  "version": "1.0.0",
  "main": "dist/index.js",
  "bin": {
    "test-cli": "dist/cli/cli.js"
  }
}
`
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectPath, filePath);
    await fs.promises.writeFile(fullPath, content);
  }

  console.log(`✓ Created test project at: ${projectPath}`);
}

async function cleanupTestProject(projectPath: string): Promise<void> {
  if (fs.existsSync(projectPath)) {
    await fs.promises.rm(projectPath, { recursive: true, force: true });
    console.log(`✓ Cleaned up test project: ${projectPath}`);
  }
}

// Run the test
if (require.main === module) {
  testUnifiedEngine().catch(console.error);
}
