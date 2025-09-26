const { describe, test, expect, beforeEach } = require('@jest/globals');
const { SchemaValidator } = require('../src/validators/schema-validator.js');
const fs = require('fs-extra');
const path = require('path');

describe('SchemaValidator', () => {
  let validator;
  
  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe('validateExam', () => {
    test('should validate correct exam structure', async () => {
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
            question: 'What is the main purpose?',
            category: 'basics'
          },
          {
            id: 'q2',
            type: 'conceptual',
            question: 'How does this work?',
            category: 'advanced'
          }
        ],
        solutions: [
          {
            id: 'q1',
            answer: 'The main purpose is...',
            evidence_sources: ['doc1.md']
          },
          {
            id: 'q2',
            answer: 'It works by...',
            evidence_sources: ['doc2.md']
          }
        ]
      };

      const result = await validator.validateExam(validExam);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should reject exam with missing required fields', async () => {
      const invalidExam = {
        metadata: {
          created: '2025-09-25T10:00:00Z',
          version: '1.0.0'
          // missing total_questions
        },
        questions: [],
        solutions: []
      };

      const result = await validator.validateExam(invalidExam);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('total_questions'))).toBe(true);
    });

    test('should reject exam with mismatched question/solution IDs', async () => {
      const examWithMismatchedIds = {
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
            answer: 'This is...',
            evidence_sources: ['doc1.md']
          }
        ]
      };

      const result = await validator.validateExam(examWithMismatchedIds);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.toLowerCase().includes('mismatch'))).toBe(true);
    });
  });

  describe('validateKnowledge', () => {
    test('should validate correct knowledge structure', async () => {
      const validKnowledge = {
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
            concepts: [
              {
                concept: 'Type Safety',
                description: 'Compile-time type checking',
                confidence: 0.8,
                source: 'doc1.md'
              }
            ]
          }
        ]
      };

      const result = await validator.validateKnowledge(validKnowledge);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should reject knowledge with invalid confidence scores', async () => {
      const invalidKnowledge = {
        metadata: {
          iteration: 0,
          created: '2025-09-25T10:00:00Z',
          source_documents: ['doc1.md']
        },
        knowledge_domains: [
          {
            domain: 'basics',
            facts: [
              {
                fact: 'Some fact',
                confidence: 1.5, // Invalid: > 1
                source: 'doc1.md'
              }
            ],
            concepts: []
          }
        ]
      };

      const result = await validator.validateKnowledge(invalidKnowledge);
      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes('confidence'))).toBe(true);
    });
  });
});
