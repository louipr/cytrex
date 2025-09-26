const fs = require('fs-extra');
const path = require('path');
const { SchemaValidator } = require('../validators/schema-validator.js');

class ValidatePretestCommand {
  constructor(contextDir = process.cwd()) {
    this.contextDir = contextDir;
    this.validator = new SchemaValidator();
  }

  async execute(iterationName) {
    try {
      const iterDir = path.join(this.contextDir, iterationName);
      
      // Check if iteration directory exists
      if (!(await fs.pathExists(iterDir))) {
        return {
          success: false,
          message: `Iteration ${iterationName} not found. Use init-iter to create it first.`
        };
      }

      const errors = [];
      
      // Check required files exist
      const knowledgeFile = path.join(iterDir, `knowledge_${iterationName}.json`);
      const answersFile = path.join(iterDir, 'answers.json');
      const scoreFile = path.join(iterDir, 'score.json');
      const examFile = path.join(this.contextDir, 'exam', 'exam.json');

      if (!(await fs.pathExists(knowledgeFile))) {
        errors.push(`Knowledge file knowledge_${iterationName}.json not found in iteration directory`);
      }

      if (!(await fs.pathExists(answersFile))) {
        errors.push('Answers file answers.json not found in iteration directory');
      }

      if (await fs.pathExists(scoreFile)) {
        errors.push('Score file score.json already exists - iteration appears to be completed already');
      }

      if (!(await fs.pathExists(examFile))) {
        errors.push('Exam file not found - cannot validate question matching');
      }

      // If critical files are missing, return early
      if (errors.length > 0) {
        return {
          success: true,
          valid: false,
          message: 'Pre-test validation failed',
          errors
        };
      }

      // Validate file schemas
      try {
        const knowledgeData = await fs.readJson(knowledgeFile);
        const knowledgeValidation = await this.validator.validateKnowledge(knowledgeData);
        if (!knowledgeValidation.valid) {
          errors.push(`Knowledge file schema validation failed: ${knowledgeValidation.errors.join(', ')}`);
        }

        const answersData = await fs.readJson(answersFile);
        const answersValidation = await this.validator.validateAnswers(answersData);
        if (!answersValidation.valid) {
          errors.push(`Answers file schema validation failed: ${answersValidation.errors.join(', ')}`);
        }

        const examData = await fs.readJson(examFile);

        // Validate answers are empty (prevent cheating)
        for (const answer of answersData.answers) {
          if (answer.answer && answer.answer.trim() !== '') {
            errors.push(`Answer for question ${answer.id} is pre-filled - answers must be empty before exam`);
          }
        }

        // Validate questions match exam
        const examQuestions = new Map(examData.questions.map(q => [q.id, q.question]));
        const answerQuestions = new Map(answersData.answers.map(a => [a.id, a.question]));

        for (const [examId, examQuestion] of examQuestions) {
          if (!answerQuestions.has(examId)) {
            errors.push(`Question ${examId} from exam is missing in answers file`);
          } else if (answerQuestions.get(examId) !== examQuestion) {
            errors.push(`Question ${examId} text mismatch between exam and answers file`);
          }
        }

        for (const answerId of answerQuestions.keys()) {
          if (!examQuestions.has(answerId)) {
            errors.push(`Answer ${answerId} has no corresponding question in exam`);
          }
        }

      } catch (parseError) {
        errors.push(`Failed to parse files: ${parseError.message}`);
      }

      const isValid = errors.length === 0;

      return {
        success: true,
        valid: isValid,
        message: isValid ? `Iteration ${iterationName} is ready for exam` : 'Pre-test validation failed',
        errors,
        iterationPath: iterDir
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to validate pre-test setup for ${iterationName}`,
        error: error.message
      };
    }
  }
}

module.exports = { ValidatePretestCommand };
