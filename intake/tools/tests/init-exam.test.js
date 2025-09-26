const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { InitExamCommand } = require('../src/commands/init-exam.js');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('InitExamCommand', () => {
  let command;
  let testContextDir;
  
  beforeEach(async () => {
    // Create temporary test directory
    testContextDir = path.join(__dirname, 'temp-context');
    await fs.ensureDir(testContextDir);
    command = new InitExamCommand(testContextDir);
  });
  
  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testContextDir);
  });

  test('should create exam directory and skeleton', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/exam skeleton created/i);
    
    // Check directory was created
    const examDir = path.join(testContextDir, 'exam');
    expect(await fs.pathExists(examDir)).toBe(true);
    
    // Check exam.yaml was created
    const examFile = path.join(examDir, 'exam.yaml');
    expect(await fs.pathExists(examFile)).toBe(true);
    
    // Check exam.yaml has correct structure
    const fileContent = await fs.readFile(examFile, 'utf8');
    const examData = yaml.load(fileContent);
    expect(examData).toHaveProperty('metadata');
    expect(examData).toHaveProperty('questions');
    expect(examData).toHaveProperty('solutions');
    expect(examData.metadata).toHaveProperty('created');
    expect(examData.metadata).toHaveProperty('version');
    expect(examData.metadata.total_questions).toBe(0);
    expect(examData.questions).toEqual([]);
    expect(examData.solutions).toEqual([]);
  });

  test('should validate created exam against schema', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.schemaValid).toBe(true);
  });

  test('should not overwrite existing exam', async () => {
    // Create exam first time
    await command.execute();
    
    // Modify the exam
    const examFile = path.join(testContextDir, 'exam', 'exam.yaml');
    const fileContent = await fs.readFile(examFile, 'utf8');
    const originalData = yaml.load(fileContent);
    originalData.metadata.version = '2.0.0';
    await fs.writeFile(examFile, yaml.dump({ test: 'data' }));
    
    // Try to create again
    const result = await command.execute();
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already exists/i);
    
    // Verify file was not overwritten
    const currentContent = await fs.readFile(examFile, 'utf8');
    const currentData = yaml.load(currentContent);
    expect(currentData.test).toBe('data'); // The file should still have the modified content
  });

  test('should handle filesystem errors gracefully', async () => {
    // Create command with invalid directory path
    const invalidCommand = new InitExamCommand('/invalid/path/that/cannot/be/created');
    
    const result = await invalidCommand.execute();
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
