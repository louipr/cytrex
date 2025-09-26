const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { ValidateExamCommand } = require('../src/commands/validate-exam.js');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

describe('ValidateExamCommand', () => {
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

  test('should validate a correct exam file', async () => {
    // Create a valid exam file
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const validExam = {
      metadata: {
        created: '2025-09-25T10:00:00Z',
        version: '1.0.0',
        total_questions: 2
      },
      questions: [
        {
          id: 'q1',
          type: 'factual',
          question: 'What is TypeScript?',
          category: 'basics'
        },
        {
          id: 'q2',
          type: 'conceptual',
          question: 'How does type safety work?',
          category: 'advanced'
        }
      ],
      solutions: [
        {
          id: 'q1',
          answer: 'TypeScript is a superset of JavaScript',
          evidence_sources: ['doc1.md']
        },
        {
          id: 'q2',
          answer: 'Type safety prevents runtime errors',
          evidence_sources: ['doc2.md']
        }
      ]
    };
    
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yaml.dump(validExam));
    
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.message).toMatch(/exam is valid/i);
  });

  test('should detect exam file does not exist', async () => {
    const result = await command.execute();
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/exam.*not found/i);
  });

  test('should detect schema violations', async () => {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const invalidExam = {
      metadata: {
        created: 'invalid-date',
        version: '1.0.0',
        total_questions: 1
      },
      questions: [
        {
          id: 'q1',
          type: 'invalid-type', // Invalid question type
          question: 'What is this?',
          category: 'basics'
        }
      ],
      solutions: [
        {
          id: 'q1',
          answer: 'This is something',
          evidence_sources: []
        }
      ]
    };
    
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yaml.dump(invalidExam));
    
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.message).toMatch(/validation failed/i);
  });

  test('should detect mismatched question/solution counts', async () => {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const mismatchedExam = {
      metadata: {
        created: '2025-09-25T10:00:00Z',
        version: '1.0.0',
        total_questions: 2 // Says 2 but only has 1
      },
      questions: [
        {
          id: 'q1',
          type: 'factual',
          question: 'What is this?',
          category: 'basics'
        }
      ],
      solutions: [
        {
          id: 'q1',
          answer: 'This is something',
          evidence_sources: ['doc1.md']
        }
      ]
    };
    
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yaml.dump(mismatchedExam));
    
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('total_questions'))).toBe(true);
  });

  test('should detect question/solution ID mismatches', async () => {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const mismatchedIds = {
      metadata: {
        created: '2025-09-25T10:00:00Z',
        version: '1.0.0',
        total_questions: 1
      },
      questions: [
        {
          id: 'q1',
          type: 'factual',
          question: 'What is this?',
          category: 'basics'
        }
      ],
      solutions: [
        {
          id: 'q2', // Different ID!
          answer: 'This is something',
          evidence_sources: ['doc1.md']
        }
      ]
    };
    
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yaml.dump(mismatchedIds));
    
    const result = await command.execute();
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('mismatch'))).toBe(true);
  });

  test('should handle malformed JSON gracefully', async () => {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    // Write invalid JSON
    await fs.writeFile(path.join(examDir, 'exam.yaml'), 'invalid: yaml: [unclosed: bracket');
    
    const result = await command.execute();
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/parse.*invalid|failed.*parse.*yaml/i);
  });
});
