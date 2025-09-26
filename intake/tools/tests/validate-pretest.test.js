const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { ValidatePretestCommand } = require('../src/commands/validate-pretest.js');
const fs = require('fs-extra');
const path = require('path');

describe('ValidatePretestCommand', () => {
  let command;
  let testContextDir;
  
  beforeEach(async () => {
    testContextDir = path.join(__dirname, 'temp-context');
    await fs.ensureDir(testContextDir);
    command = new ValidatePretestCommand(testContextDir);
  });
  
  afterEach(async () => {
    await fs.remove(testContextDir);
  });

  test('should validate ready-to-test iteration setup', async () => {
    await setupValidIteration('iter1');
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.message).toMatch(/ready for exam/i);
    expect(result.errors).toEqual([]);
  });

  test('should detect missing iteration directory', async () => {
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/iteration.*not found/i);
  });

  test('should detect missing knowledge file', async () => {
    const iterDir = path.join(testContextDir, 'iter1');
    await fs.ensureDir(iterDir);
    
    // Create answers.json but not knowledge file
    await fs.writeJson(path.join(iterDir, 'answers.json'), {
      metadata: { iteration: 'iter1', created: '2025-09-25T10:00:00Z' },
      answers: []
    });
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('knowledge_iter1.json'))).toBe(true);
  });

  test('should detect missing answers file', async () => {
    const iterDir = path.join(testContextDir, 'iter1');
    await fs.ensureDir(iterDir);
    
    // Create knowledge file but not answers
    await fs.writeJson(path.join(iterDir, 'knowledge_iter1.json'), {
      metadata: { iteration: 1, created: '2025-09-25T10:00:00Z', source_documents: [] },
      knowledge_domains: []
    });
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('answers.json'))).toBe(true);
  });

  test('should detect pre-filled answers (cheating prevention)', async () => {
    await setupValidIteration('iter1');
    
    // Modify answers to have content (simulate cheating)
    const answersFile = path.join(testContextDir, 'iter1', 'answers.json');
    const answersData = await fs.readJson(answersFile);
    answersData.answers[0].answer = 'Some answer'; // Pre-fill answer
    await fs.writeJson(answersFile, answersData);
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('pre-filled') || err.includes('empty'))).toBe(true);
  });

  test('should detect question/answer mismatch with exam', async () => {
    await setupValidIteration('iter1');
    
    // Modify answers to have different questions than exam
    const answersFile = path.join(testContextDir, 'iter1', 'answers.json');
    const answersData = await fs.readJson(answersFile);
    answersData.answers[0].question = 'Different question';
    await fs.writeJson(answersFile, answersData);
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('mismatch'))).toBe(true);
  });

  test('should detect existing score.json (iteration already completed)', async () => {
    await setupValidIteration('iter1');
    
    // Create score.json (should not exist before exam)
    const scoreFile = path.join(testContextDir, 'iter1', 'score.json');
    await fs.writeJson(scoreFile, {
      metadata: { iteration: 'iter1', graded: '2025-09-25T10:00:00Z', total_questions: 2 },
      results: []
    });
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('score.json') && err.includes('exists'))).toBe(true);
  });

  test('should validate file schemas', async () => {
    await setupValidIteration('iter1');
    
    // Corrupt knowledge file schema
    const knowledgeFile = path.join(testContextDir, 'iter1', 'knowledge_iter1.json');
    await fs.writeJson(knowledgeFile, { invalid: 'schema' });
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.some(err => err.includes('schema'))).toBe(true);
  });

  // Helper function
  async function setupValidIteration(iterName) {
    // Create exam
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    const examData = {
      metadata: { created: '2025-09-25T10:00:00Z', version: '1.0.0', total_questions: 2 },
      questions: [
        { id: 'q1', type: 'factual', question: 'What is TypeScript?', category: 'basics' },
        { id: 'q2', type: 'conceptual', question: 'How does type safety work?', category: 'advanced' }
      ],
      solutions: [
        { id: 'q1', answer: 'TypeScript is a superset of JavaScript', evidence_sources: ['doc1.md'] },
        { id: 'q2', answer: 'Type safety prevents runtime errors', evidence_sources: ['doc2.md'] }
      ]
    };
    await fs.writeJson(path.join(examDir, 'exam.json'), examData);

    // Create iteration directory
    const iterDir = path.join(testContextDir, iterName);
    await fs.ensureDir(iterDir);

    // Create knowledge file
    const knowledgeData = {
      metadata: { iteration: 1, created: '2025-09-25T10:00:00Z', source_documents: ['doc1.md'] },
      knowledge_domains: [{
        domain: 'basics',
        facts: [{ fact: 'TypeScript is a superset of JavaScript', confidence: 0.9, source: 'doc1.md' }],
        concepts: []
      }]
    };
    await fs.writeJson(path.join(iterDir, `knowledge_${iterName}.json`), knowledgeData);

    // Create answers file with empty answers
    const answersData = {
      metadata: { iteration: iterName, created: '2025-09-25T10:00:00Z' },
      answers: [
        { id: 'q1', question: 'What is TypeScript?', answer: '', confidence: 0, reasoning: '' },
        { id: 'q2', question: 'How does type safety work?', answer: '', confidence: 0, reasoning: '' }
      ]
    };
    await fs.writeJson(path.join(iterDir, 'answers.json'), answersData);
  }
});
