const fs = require('fs-extra');
const path = require('path');
const { SchemaValidator } = require('../validators/schema-validator.js');

class InitIterCommand {
  constructor(contextDir = process.cwd()) {
    this.contextDir = contextDir;
    this.validator = new SchemaValidator();
  }

  async execute(iterationName) {
    try {
      if (!iterationName || !iterationName.startsWith('iter')) {
        return {
          success: false,
          message: 'Invalid iteration name. Use format: iter1, iter2, etc.'
        };
      }

      const iterDir = path.join(this.contextDir, iterationName);
      const examFile = path.join(this.contextDir, 'exam', 'exam.json');
      
      // Check if iteration already exists
      if (await fs.pathExists(iterDir)) {
        return {
          success: false,
          message: `Iteration ${iterationName} already exists. Delete it first if you want to recreate it.`
        };
      }

      // Check if exam exists
      if (!(await fs.pathExists(examFile))) {
        return {
          success: false,
          message: 'Exam not found. Use init-exam to create one first.'
        };
      }

      // Determine source knowledge file
      const iterNumber = parseInt(iterationName.replace('iter', ''));
      let sourceKnowledgeFile;
      
      if (iterNumber === 1) {
        sourceKnowledgeFile = path.join(this.contextDir, 'knowledge_iter0.json');
      } else {
        const previousIter = `iter${iterNumber - 1}`;
        sourceKnowledgeFile = path.join(this.contextDir, previousIter, `knowledge_iter${iterNumber - 1}.json`);
      }

      // Check if source knowledge file exists
      if (!(await fs.pathExists(sourceKnowledgeFile))) {
        const expectedFile = iterNumber === 1 ? 'knowledge_iter0.json' : `knowledge_iter${iterNumber - 1}.json`;
        return {
          success: false,
          message: `Source knowledge file ${expectedFile} not found. Create previous iteration first.`
        };
      }

      // Create iteration directory
      await fs.ensureDir(iterDir);

      // Copy knowledge file
      const targetKnowledgeFile = path.join(iterDir, `knowledge_${iterationName}.json`);
      await fs.copy(sourceKnowledgeFile, targetKnowledgeFile);

      // Create answers.json from exam questions
      const examData = await fs.readJson(examFile);
      const answersData = {
        metadata: {
          iteration: iterationName,
          created: new Date().toISOString()
        },
        answers: examData.questions.map(question => ({
          id: question.id,
          question: question.question,
          answer: '',
          confidence: 0,
          reasoning: ''
        }))
      };

      const answersFile = path.join(iterDir, 'answers.json');
      await fs.writeJson(answersFile, answersData, { spaces: 2 });

      // Validate created files against schemas
      const knowledgeData = await fs.readJson(targetKnowledgeFile);
      const knowledgeValidation = await this.validator.validateKnowledge(knowledgeData);
      const answersValidation = await this.validator.validateAnswers(answersData);

      return {
        success: true,
        message: `Iteration ${iterationName} setup complete`,
        iterationPath: iterDir,
        knowledgeSchemaValid: knowledgeValidation.valid,
        answersSchemaValid: answersValidation.valid
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to setup iteration ${iterationName}`,
        error: error.message
      };
    }
  }
}

module.exports = { InitIterCommand };
