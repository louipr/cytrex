const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { ValidateExamCommand } = require('../src/commands/validate-exam.js');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('ValidateExamCommand - Empty Exam Cases', () => {
  let command;
  let testContextDir;
  
  beforeEach(async () => {
    testContextDir = path.join(__dirname, 'temp-context');
    await fs.ensureDir(testContextDir);
    command = new ValidateExamCommand(testContextDir);
  });
  
  afterEach(async () => {
    await fs.remove(testContextDir);
  });

  test('should reject empty exam (no questions)', async () => {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const emptyExam = {
      metadata: {
        created: '2025-09-25T10:00:00Z',
        version: '1.0.0',
        total_questions: 0
      },
      questions: [],
      solutions: []
    };
    
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yaml.dump(emptyExam));
    
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('empty exam') || err.includes('no questions'))).toBe(true);
  });

  test('should accept exam with questions', async () => {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const validExam = {
      metadata: {
        created: '2025-09-25T10:00:00Z',
        version: '1.0.0',
        total_questions: 1
      },
      questions: [
        {
          id: 'q1',
          type: 'factual',
          question: 'What is TypeScript?',
          category: 'basics'
        }
      ],
      solutions: [
        {
          id: 'q1',
          answer: 'TypeScript is a superset of JavaScript',
          evidence_sources: ['doc1.md']
        }
      ]
    };
    
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yaml.dump(validExam));
    
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
