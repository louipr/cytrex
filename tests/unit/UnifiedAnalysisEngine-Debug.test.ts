import { AnalysisEngineFactory } from '../../src/core';
import { IUnifiedAnalysisEngine } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('UnifiedAnalysisEngine - Entry Point Debug', () => {
  let testDir: string;
  let engine: IUnifiedAnalysisEngine;

  beforeEach(async () => {
    // Create temp directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-entry-points-'));
    engine = AnalysisEngineFactory.createStandard();
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should debug entry point detection step by step', async () => {
    // Create a simple project structure
    fs.writeFileSync(path.join(testDir, 'main.ts'), `
      import { UsedService } from './UsedService';
      console.log('Main app');
    `);
    
    fs.writeFileSync(path.join(testDir, 'UsedService.ts'), `
      export class UsedService {
        greet() { return 'Hello'; }
      }
    `);
    
    fs.writeFileSync(path.join(testDir, 'DeadService.ts'), `
      export class DeadService {
        unused() { return 'This should be dead'; }
      }
    `);

    console.log('\n=== DEBUGGING ENTRY POINT DETECTION ===');
    console.log('Test directory:', testDir);
    console.log('Files created:', fs.readdirSync(testDir));

    // Test entry point detection in isolation
    const entryPoints = await (engine as any).patterns.detectEntryPoints(testDir);
    console.log('Entry points detected:', entryPoints);
    
    // Run full analysis
    const result = await engine.analyze(testDir);
    
    console.log('\n=== ANALYSIS RESULTS ===');
    console.log('Entry points in result:', result.entryPoints);
    console.log('Total files processed:', result.performanceMetrics.filesProcessed);
    console.log('Dead files found:', result.deadFiles.length);
    console.log('Dead file paths:', result.deadFiles.map(f => f.path));
    console.log('All files in dependency graph:', (engine as any).graph.getAllFiles());
    
    // Debug the dependency graph state
    const reachable = (engine as any).graph.findReachable();
    console.log('Reachable files:', Array.from(reachable));
    console.log('Graph entry points:', Array.from(((engine as any).graph as any).entryPoints));
    
    // This should detect DeadService.ts as dead
    expect(result.deadFiles.length).toBeGreaterThan(0);
    expect(result.deadFiles.some(f => f.path.includes('DeadService.ts'))).toBe(true);
  });

  test('should debug with package.json main entry point', async () => {
    // Create package.json with main
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      main: 'src/main.ts'
    }, null, 2));
    
    fs.mkdirSync(path.join(testDir, 'src'));
    fs.writeFileSync(path.join(testDir, 'src/main.ts'), `
      import { Used } from './Used';
      console.log('Main from package.json');
    `);
    
    fs.writeFileSync(path.join(testDir, 'src/Used.ts'), `export const Used = 'used';`);
    fs.writeFileSync(path.join(testDir, 'src/Dead.ts'), `export const Dead = 'dead';`);
    
    console.log('\n=== PACKAGE.JSON ENTRY POINT TEST ===');
    
    const entryPoints = await (engine as any).patterns.detectEntryPoints(testDir);
    console.log('Entry points from package.json:', entryPoints);
    
    const result = await engine.analyze(testDir);
    console.log('Dead files with package.json:', result.deadFiles.map(f => path.basename(f.path)));
    
    expect(result.entryPoints).toContain(path.join(testDir, 'src/main.ts'));
    expect(result.deadFiles.some(f => f.path.includes('Dead.ts'))).toBe(true);
  });
});
