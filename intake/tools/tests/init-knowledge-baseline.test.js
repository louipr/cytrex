const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { InitKnowledgeBaselineCommand } = require('../src/commands/init-knowledge-baseline.js');
const fs = require('fs-extra');
const path = require('path');

describe('InitKnowledgeBaselineCommand', () => {
  let command;
  let testContextDir;
  
  beforeEach(async () => {
    testContextDir = path.join(__dirname, 'temp-context');
    await fs.ensureDir(testContextDir);
    command = new InitKnowledgeBaselineCommand(testContextDir);
  });
  
  afterEach(async () => {
    await fs.remove(testContextDir);
  });

  test('should create knowledge_iter0.json skeleton', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/knowledge baseline skeleton created/i);
    
    // Check file was created
    const knowledgeFile = path.join(testContextDir, 'knowledge_iter0.json');
    expect(await fs.pathExists(knowledgeFile)).toBe(true);
    
    // Check structure
    const knowledgeData = await fs.readJson(knowledgeFile);
    expect(knowledgeData).toHaveProperty('metadata');
    expect(knowledgeData).toHaveProperty('knowledge_domains');
    expect(knowledgeData.metadata.iteration).toBe(0);
    expect(knowledgeData.metadata).toHaveProperty('created');
    expect(knowledgeData.metadata.source_documents).toEqual([]);
    expect(knowledgeData.knowledge_domains).toEqual([]);
  });

  test('should validate created knowledge against schema', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.schemaValid).toBe(true);
  });

  test('should not overwrite existing knowledge baseline', async () => {
    // Create baseline first time
    await command.execute();
    
    // Modify the baseline
    const knowledgeFile = path.join(testContextDir, 'knowledge_iter0.json');
    const originalData = await fs.readJson(knowledgeFile);
    originalData.metadata.improvement_notes = 'Modified baseline';
    await fs.writeJson(knowledgeFile, originalData);
    
    // Try to create again
    const result = await command.execute();
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already exists/i);
    
    // Verify file was not overwritten
    const currentData = await fs.readJson(knowledgeFile);
    expect(currentData.metadata.improvement_notes).toBe('Modified baseline');
  });

  test('should handle filesystem errors gracefully', async () => {
    const invalidCommand = new InitKnowledgeBaselineCommand('/invalid/path');
    
    const result = await invalidCommand.execute();
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should create knowledge with proper metadata structure', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    
    const knowledgeFile = path.join(testContextDir, 'knowledge_iter0.json');
    const knowledgeData = await fs.readJson(knowledgeFile);
    
    // Check metadata structure
    expect(knowledgeData.metadata.iteration).toBe(0);
    expect(typeof knowledgeData.metadata.created).toBe('string');
    expect(Array.isArray(knowledgeData.metadata.source_documents)).toBe(true);
    expect(Array.isArray(knowledgeData.knowledge_domains)).toBe(true);
  });
});
