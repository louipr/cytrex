import { AnalysisEngineFactory } from '../../src/core';
import { IUnifiedAnalysisEngine } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Confidence Debug', () => {
  let testDir: string;
  let engine: IUnifiedAnalysisEngine;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'confidence-debug-'));
    engine = AnalysisEngineFactory.createStandard();
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should debug confidence calculation for architectural files', async () => {
    // Create test files
    fs.writeFileSync(path.join(testDir, 'index.ts'), `console.log('entry');`);
    fs.writeFileSync(path.join(testDir, 'ApplicationContainer.ts'), `
// Architectural core file
export class ApplicationContainer {}
`);
    fs.writeFileSync(path.join(testDir, 'RandomUtils.ts'), `
// Regular unused file - NOT architectural core
export class RandomUtils {}
`);

    console.log('\n=== CONFIDENCE DEBUG ===');
    
    // Run analysis with low threshold to see all confidence values
    const result = await engine.analyze(testDir);

    console.log('Dead files found:', result.deadFiles.length);
    result.deadFiles.forEach(f => {
      console.log(`  ${path.basename(f.path)}: ${f.confidence}% confidence`);
    });

    // Check if architectural multiplier is working
    const containerFile = result.deadFiles.find(f => f.path.includes('ApplicationContainer'));
    const regularFile = result.deadFiles.find(f => f.path.includes('RandomUtils'));
    
    console.log(`Container confidence: ${containerFile?.confidence}`);
    console.log(`Regular confidence: ${regularFile?.confidence}`);
    console.log(`Container < Regular? ${(containerFile?.confidence || 0) < (regularFile?.confidence || 0)}`);
  });
});
