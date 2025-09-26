const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');
const { UnifiedCommand } = require('../src/commands/unified-command.js');
const fs = require('fs-extra');
const path = require('path');

describe('Init Iteration', () => {
  let command;
  let testContextDir;
  
  beforeEach(async () => {
    testContextDir = path.join(__dirname, 'temp-context');
    await fs.ensureDir(testContextDir);
    command = new UnifiedCommand(testContextDir);
  });
  
  afterEach(async () => {
    await fs.remove(testContextDir);
  });

  test('should create iter1 directory and copy knowledge_iter0 to knowledge_iter1', async () => {
    // Setup: Create prerequisite files
    await setupPrerequisites();
    
    command = new InitIterCommand(testContextDir);
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/iteration iter1 setup complete/i);
    
    // Check iter1 directory was created
    const iter1Dir = path.join(testContextDir, 'iter1');
    expect(await fs.pathExists(iter1Dir)).toBe(true);
    
    // Check knowledge_iter1.json was created
    const knowledgeFile = path.join(iter1Dir, 'knowledge_iter1.json');
    expect(await fs.pathExists(knowledgeFile)).toBe(true);
    
    // Check it's a copy of knowledge_iter0.json
    const originalKnowledge = await fs.readJson(path.join(testContextDir, 'knowledge_iter0.json'));
    const copiedKnowledge = await fs.readJson(knowledgeFile);
    expect(copiedKnowledge).toEqual(originalKnowledge);
    
    // Check answers.json was created with questions from exam
    const answersFile = path.join(iter1Dir, 'answers.json');
    expect(await fs.pathExists(answersFile)).toBe(true);
    
    const answersData = await fs.readJson(answersFile);
    expect(answersData.metadata.iteration).toBe('iter1');
    expect(answersData.answers).toHaveLength(2); // Should match exam questions
    expect(answersData.answers[0].answer).toBe(''); // Should be empty
    expect(answersData.answers[0].question).toBe('What is TypeScript?'); // Should copy question
  });

  test('should handle iter2 by copying knowledge_iter1', async () => {
    // Setup: Create iter1 first
    await setupPrerequisites();
    command = new InitIterCommand(testContextDir);
    await command.execute('iter1');
    
    // Modify knowledge_iter1 to verify correct copying
    const iter1KnowledgeFile = path.join(testContextDir, 'iter1', 'knowledge_iter1.json');
    const iter1Knowledge = await fs.readJson(iter1KnowledgeFile);
    iter1Knowledge.metadata.improvement_notes = 'Modified in iter1';
    await fs.writeJson(iter1KnowledgeFile, iter1Knowledge);
    
    // Now create iter2
    const result = await command.execute('iter2');
    
    expect(result.success).toBe(true);
    
    // Check knowledge_iter2 was copied from iter1, not iter0
    const iter2KnowledgeFile = path.join(testContextDir, 'iter2', 'knowledge_iter2.json');
    const iter2Knowledge = await fs.readJson(iter2KnowledgeFile);
    expect(iter2Knowledge.metadata.improvement_notes).toBe('Modified in iter1');
  });

  test('should reject if exam does not exist', async () => {
    // Don't create exam
    await fs.writeJson(path.join(testContextDir, 'knowledge_iter0.json'), {
      metadata: { iteration: 0, created: '2025-09-25T10:00:00Z', source_documents: [] },
      knowledge_domains: []
    });
    
    command = new InitIterCommand(testContextDir);
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/exam.*not found/i);
  });

  test('should reject if knowledge_iter0 does not exist for iter1', async () => {
    // Create exam but not knowledge_iter0
    await createValidExam();
    
    command = new InitIterCommand(testContextDir);
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/knowledge_iter0.*not found/i);
  });

  test('should reject if previous iteration does not exist', async () => {
    await setupPrerequisites();
    
    command = new InitIterCommand(testContextDir);
    const result = await command.execute('iter5'); // Skip iter1-4
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/knowledge_iter4.*not found/i);
  });

  test('should not overwrite existing iteration', async () => {
    await setupPrerequisites();
    command = new InitIterCommand(testContextDir);
    
    // Create iter1 first time
    await command.execute('iter1');
    
    // Try to create again
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already exists/i);
  });

  test('should validate created files against schemas', async () => {
    await setupPrerequisites();
    command = new InitIterCommand(testContextDir);
    
    const result = await command.execute('iter1');
    
    expect(result.success).toBe(true);
    expect(result.knowledgeSchemaValid).toBe(true);
    expect(result.answersSchemaValid).toBe(true);
  });

  // Helper functions
  async function setupPrerequisites() {
    await createValidExam();
    await createValidKnowledgeBaseline();
  }

  async function createValidExam() {
    const examDir = path.join(testContextDir, 'exam');
    await fs.ensureDir(examDir);
    
    const examData = {
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
    
    const yaml = require('js-yaml');
    const yamlContent = yaml.dump(examData);
    await fs.writeFile(path.join(examDir, 'exam.yaml'), yamlContent);
  }

  async function createValidKnowledgeBaseline() {
    const knowledgeData = {
      metadata: {
        iteration: 0,
        created: '2025-09-25T10:00:00Z',
        source_documents: ['doc1.md', 'doc2.md']
      },
      knowledge_domains: [
        {
          domain: 'basics',
          facts: [
            {
              fact: 'TypeScript is a superset of JavaScript',
              confidence: 0.9,
              source: 'doc1.md'
            }
          ],
          concepts: []
        }
      ]
    };
    
    await fs.writeJson(path.join(testContextDir, 'knowledge_iter0.json'), knowledgeData);
  }
});
