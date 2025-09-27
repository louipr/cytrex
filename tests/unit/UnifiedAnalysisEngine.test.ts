import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { UnifiedAnalysisEngine } from '../../src/core/engine/UnifiedAnalysisEngine';
import { TypeScriptCompilerService } from '../../src/core/compiler/TypeScriptCompilerService';
import { DependencyGraph } from '../../src/core/graph/DependencyGraph';
import { PatternDetector } from '../../src/core/patterns/PatternDetector';
import { DependencyType } from '../../src/types';

describe('UnifiedAnalysisEngine', () => {
  let testDir: string;
  let engine: UnifiedAnalysisEngine;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = path.join(__dirname, 'temp-test-' + Date.now());
    await fs.promises.mkdir(testDir, { recursive: true });

    // Create fresh engine instances
    const compiler = new TypeScriptCompilerService();
    const graph = new DependencyGraph();
    const patterns = new PatternDetector();
    engine = new UnifiedAnalysisEngine(compiler, graph, patterns);
  });

  afterEach(async () => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  describe('Dead Code Detection', () => {
    test('should detect unused file with no imports', async () => {
      // Arrange - Create a simple project with one dead file
      await createTestProject(testDir, {
        'index.ts': `
import { UserService } from './UserService';
const userService = new UserService();
console.log('App started');
`,
        'UserService.ts': `
export class UserService {
  getUsers() { return ['user1']; }
}
`,
        'DeadService.ts': `
// This file is never imported
export class DeadService {
  deadMethod() { return 'unused'; }
}
`,
        'package.json': `{
  "name": "test-project",
  "main": "index.js"
}`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.deadFiles).toHaveLength(1);
      expect(result.deadFiles[0].path).toContain('DeadService.ts');
      expect(result.deadFiles[0].confidence).toBeGreaterThan(50);
    });

    test('should NOT detect files that are imported', async () => {
      // Arrange - Create project where all files are used
      await createTestProject(testDir, {
        'index.ts': `
import { UserService } from './UserService';
import { EmailService } from './EmailService';

const userService = new UserService();
const emailService = new EmailService();
console.log('App started');
`,
        'UserService.ts': `
export class UserService {
  getUsers() { return ['user1']; }
}
`,
        'EmailService.ts': `
export class EmailService {
  sendEmail() { return 'sent'; }
}
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.deadFiles).toHaveLength(0);
      expect(result.dependencyGraph.reachableFiles).toBe(3); // index, UserService, EmailService
    });

    test('should detect multiple dead files', async () => {
      // Arrange - Create project with multiple unused files
      await createTestProject(testDir, {
        'index.ts': `
import { UserService } from './UserService';
console.log('App started');
`,
        'UserService.ts': `
export class UserService {
  getUsers() { return ['user1']; }
}
`,
        'DeadService1.ts': `
export class DeadService1 {}
`,
        'DeadService2.ts': `
export class DeadService2 {}
`,
        'helpers.ts': `
export function deadHelper() { return 'unused'; }
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.deadFiles).toHaveLength(3);
      const deadFilenames = result.deadFiles.map(df => path.basename(df.path));
      expect(deadFilenames).toContain('DeadService1.ts');
      expect(deadFilenames).toContain('DeadService2.ts');
      expect(deadFilenames).toContain('helpers.ts');
    });

    test('should handle circular dependencies correctly', async () => {
      // Arrange - Create circular dependency
      await createTestProject(testDir, {
        'index.ts': `
import { ServiceA } from './ServiceA';
const service = new ServiceA();
`,
        'ServiceA.ts': `
import { ServiceB } from './ServiceB';
export class ServiceA {
  constructor() {
    new ServiceB();
  }
}
`,
        'ServiceB.ts': `
import { ServiceA } from './ServiceA';
export class ServiceB {
  getA(): ServiceA { return null as any; }
}
`,
        'UnusedService.ts': `
export class UnusedService {}
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.dependencyGraph.circularDependencies).toHaveLength(1);
      expect(result.deadFiles).toHaveLength(1);
      expect(result.deadFiles[0].path).toContain('UnusedService.ts');
    });
  });

  describe('Entry Point Detection', () => {
    test('should detect package.json main entry point', async () => {
      // Arrange
      await createTestProject(testDir, {
        'main.ts': `console.log('main entry');`,
        'unused.ts': `export const unused = true;`,
        'package.json': `{
  "name": "test",
  "main": "main.ts"
}`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.entryPoints).toContain(path.join(testDir, 'main.ts'));
      expect(result.deadFiles).toHaveLength(1);
      expect(result.deadFiles[0].path).toContain('unused.ts');
    });

    test('should detect CLI entry points', async () => {
      // Arrange
      await createTestProject(testDir, {
        'src/cli/cli.ts': `console.log('CLI app');`,
        'src/unused.ts': `export const unused = true;`,
        'package.json': `{
  "name": "test",
  "bin": { "test": "src/cli/cli.ts" }
}`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.entryPoints.some(ep => ep.includes('cli.ts'))).toBe(true);
      expect(result.deadFiles).toHaveLength(1);
    });

    test('should detect conventional entry points when no package.json', async () => {
      // Arrange
      await createTestProject(testDir, {
        'src/index.ts': `
import { Helper } from './helper';
console.log('App');
`,
        'src/helper.ts': `
export class Helper {}
`,
        'src/unused.ts': `
export const unused = true;
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.entryPoints.some(ep => ep.includes('index.ts'))).toBe(true);
      expect(result.deadFiles).toHaveLength(1);
      expect(result.deadFiles[0].path).toContain('unused.ts');
    });
  });

  describe('Confidence Scoring', () => {
    test('should assign higher confidence to clearly unused files', async () => {
      // Arrange
      await createTestProject(testDir, {
        'index.ts': `console.log('simple app');`,
        'CompletelyUnused.ts': `
// File with no imports at all
export class CompletelyUnused {
  unusedMethod() { return 'never called'; }
}
`,
        'PartiallyReferenced.ts': `
// File that might be used in comments or strings
export class PartiallyReferenced {}
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.deadFiles).toHaveLength(2);
      
      const completelyUnused = result.deadFiles.find(df => df.path.includes('CompletelyUnused'));
      const partiallyReferenced = result.deadFiles.find(df => df.path.includes('PartiallyReferenced'));
      
      expect(completelyUnused?.confidence).toBeGreaterThan(80);
      expect(partiallyReferenced?.confidence).toBeGreaterThan(50);
    });

    test('should reduce confidence for architectural core files', async () => {
      // Arrange
      await createTestProject(testDir, {
        'index.ts': `console.log('app');`,
        'ApplicationContainer.ts': `
// Architectural core file - should have reduced confidence
export class ApplicationContainer {}
`,
        'RegularService.ts': `
// Regular unused file
export class RegularService {}
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.deadFiles).toHaveLength(2);
      
      const containerFile = result.deadFiles.find(df => df.path.includes('ApplicationContainer'));
      const regularFile = result.deadFiles.find(df => df.path.includes('RegularService'));
      
      // Architectural core files should have lower confidence due to multiplier
      expect(containerFile?.confidence).toBeLessThan(regularFile?.confidence || 100);
    });
  });

  describe('Dynamic Pattern Detection', () => {
    test('should detect service container patterns', async () => {
      // Arrange
      await createTestProject(testDir, {
        'index.ts': `
import { Container } from './Container';
const container = new Container();
container.register('UserService', './UserService');
container.resolve('EmailService');
`,
        'Container.ts': `
export class Container {
  register(name: string, path: string) {}
  resolve(name: string) {}
}
`,
        'UserService.ts': `
export class UserService {}
`,
        'EmailService.ts': `
export class EmailService {}
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.dynamicUsage.serviceContainer.size).toBeGreaterThan(0);
      expect(result.dynamicUsage.serviceContainer.has('UserService')).toBe(true);
      expect(result.dynamicUsage.serviceContainer.has('EmailService')).toBe(true);
    });

    test('should detect dynamic imports', async () => {
      // Arrange
      await createTestProject(testDir, {
        'index.ts': `
async function loadModule() {
  const module = await import('./DynamicModule');
  return module;
}
`,
        'DynamicModule.ts': `
export class DynamicModule {}
`,
        'UnusedModule.ts': `
export class UnusedModule {}
`
      });

      // Act
      const result = await engine.analyze(testDir);

      // Assert
      expect(result.dynamicUsage.dynamicImports.size).toBeGreaterThan(0);
      expect(result.deadFiles).toHaveLength(1);
      expect(result.deadFiles[0].path).toContain('UnusedModule.ts');
    });
  });
});

// Helper function to create test projects
async function createTestProject(dir: string, files: Record<string, string>): Promise<void> {
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, filePath);
    const dirPath = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await fs.promises.mkdir(dirPath, { recursive: true });
    
    // Write file
    await fs.promises.writeFile(fullPath, content.trim());
  }
}
