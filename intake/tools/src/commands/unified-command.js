const { SchemaValidator } = require('../validators/schema-validator');
const { FileService, Skeletons, Paths } = require('../services/simple.service');

/**
 * Single unified command handler - eliminates all the class boilerplate
 */
class CommandHandler {
  constructor(contextDir = process.cwd()) {
    this.files = new FileService();
    this.validator = new SchemaValidator();
    this.paths = new Paths(contextDir);
  }

  /**
   * Universal execution method - handles all operations
   */
  async execute(operation, params = {}) {
    try {
      const result = await this.operations[operation].call(this, params);
      return this.success(result.message, result.data || {});
    } catch (error) {
      return this.failure(error.message, error);
    }
  }

  /**
   * All operations in one place - no more scattered command files
   */
  operations = {
    'init-exam': async () => {
      const examPath = this.paths.examFile();
      
      await this.ensureNotExists(examPath, 'Exam already exists. Use validate-exam to check existing exam.');
      
      const skeleton = Skeletons.examSkeleton();
      const comments = this.getExamComments();
      await this.files.writeYaml(examPath, skeleton, comments);
      
      const validation = await this.validate(skeleton, 'exam');
      
      return {
        message: 'Exam skeleton created successfully',
        data: { schemaValid: validation.valid, examPath }
      };
    },

    'init-knowledge-baseline': async () => {
      const knowledgePath = this.paths.knowledgeBaseline();
      
      await this.ensureNotExists(knowledgePath, 'Knowledge baseline already exists. Delete it first if you want to recreate it.');
      
      const skeleton = Skeletons.knowledgeBaseline();
      await this.files.writeJson(knowledgePath, skeleton);
      
      const validation = await this.validate(skeleton, 'knowledge');
      
      return {
        message: 'Knowledge baseline skeleton created successfully',
        data: { schemaValid: validation.valid, knowledgePath }
      };
    },

    'init-iter': async ({ iterationName }) => {
      if (!this.paths.isValidIterName(iterationName)) {
        throw new Error('Invalid iteration name. Use format: iter1, iter2, etc.');
      }

      const iterDir = this.paths.iterationDir(iterationName);
      const examPath = this.paths.examFile();
      const sourceKnowledgePath = this.paths.previousKnowledge(iterationName);
      
      await this.ensureNotExists(iterDir, `Iteration ${iterationName} already exists. Delete it first if you want to recreate it.`);
      await this.ensureExists(examPath, 'Exam not found. Use init-exam to create one first.');
      await this.ensureExists(sourceKnowledgePath, this.getMissingKnowledgeMessage(iterationName));

      // Create iteration
      await this.files.ensureDir(iterDir);
      await this.files.copy(sourceKnowledgePath, this.paths.iterationKnowledge(iterationName));
      
      const examData = await this.files.readYaml(examPath);
      const answersData = Skeletons.answersFromExam(examData, iterationName);
      await this.files.writeJson(this.paths.iterationAnswers(iterationName), answersData);

      // Validate
      const knowledgeData = await this.files.readJson(this.paths.iterationKnowledge(iterationName));
      const knowledgeValidation = await this.validate(knowledgeData, 'knowledge');
      const answersValidation = await this.validate(answersData, 'answers');

      return {
        message: `Iteration ${iterationName} setup complete`,
        data: {
          iterationPath: iterDir,
          knowledgeSchemaValid: knowledgeValidation.valid,
          answersSchemaValid: answersValidation.valid
        }
      };
    },

    'validate-exam': async () => {
      const examPath = this.paths.examFile();
      
      await this.ensureExists(examPath, 'Exam file not found. Use init-exam to create one first.');
      
      const examData = await this.files.readYaml(examPath);
      const validation = await this.validate(examData, 'exam');
      const businessErrors = this.validateExamBusinessRules(examData);
      
      const allErrors = [...validation.errors, ...businessErrors];
      const isValid = allErrors.length === 0;
      
      return {
        message: isValid ? 'Exam is valid and ready for use' : 'Exam validation failed',
        data: { valid: isValid, errors: allErrors, examPath }
      };
    }
  };

  // Utility methods - eliminate all the repetitive patterns
  async ensureExists(path, errorMessage) {
    if (!(await this.files.exists(path))) {
      throw new Error(errorMessage);
    }
  }

  async ensureNotExists(path, errorMessage) {
    if (await this.files.exists(path)) {
      throw new Error(errorMessage);
    }
  }

  async validate(data, type) {
    try {
      switch (type) {
        case 'exam': return await this.validator.validateExam(data);
        case 'knowledge': return await this.validator.validateKnowledge(data);
        case 'answers': return await this.validator.validateAnswers(data);
        default: return { valid: true, errors: [] };
      }
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  success(message, data = {}) {
    return { success: true, message, ...data };
  }

  failure(message, error = null) {
    return { 
      success: false, 
      message, 
      ...(error && { error: error.message || error })
    };
  }

  getMissingKnowledgeMessage(iterationName) {
    const iterNum = parseInt(iterationName.replace('iter', ''));
    const expectedFile = iterNum === 1 ? 'knowledge_iter0.json' : `knowledge_iter${iterNum - 1}.json`;
    return `Source knowledge file ${expectedFile} not found. Create previous iteration first.`;
  }

  getExamComments() {
    return [
      '# Exam Schema',
      '# Schema for learning methodology exams with questions and solutions',
      '# ',
      '# TYPE:',
      '#   factual: Questions that require recall of specific facts or information.',
      '#   conceptual: Questions that test understanding of concepts and ideas.',
      '#   analytical: Questions that involve analysis and interpretation of information.',
      '#   synthesis: Questions that require combining information to form new ideas or solutions.',
      '#',
      '# DIFFICULTY:',
      '#   basic: Questions that test fundamental knowledge and understanding.',
      '#   intermediate: Questions that require application and analysis of concepts.',
      '#   advanced: Questions that involve synthesis, evaluation, and complex problem-solving.',
      '#',
      ''
    ].join('\n');
  }

  validateExamBusinessRules(examData) {
    const errors = [];
    
    if (examData.questions && examData.questions.length === 0) {
      errors.push('Empty exam not ready for use - no questions found');
    }
    
    if (examData.metadata && examData.questions) {
      const declaredCount = examData.metadata.total_questions;
      const actualCount = examData.questions.length;
      
      if (declaredCount !== actualCount) {
        errors.push(`total_questions mismatch: declared ${declaredCount} but found ${actualCount} questions`);
      }
    }
    
    if (examData.questions && examData.solutions) {
      const questionCount = examData.questions.length;
      const solutionCount = examData.solutions.length;
      
      if (questionCount !== solutionCount) {
        errors.push(`Question/solution count mismatch: ${questionCount} questions but ${solutionCount} solutions`);
      }
    }
    
    return errors;
  }
}

module.exports = { CommandHandler };
