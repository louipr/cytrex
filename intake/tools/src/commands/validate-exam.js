const fs = require('fs-extra');
const path = require('path');
const { SchemaValidator } = require('../validators/schema-validator.js');

class ValidateExamCommand {
  constructor(contextDir = process.cwd()) {
    this.contextDir = contextDir;
    this.validator = new SchemaValidator();
  }

  async execute() {
    try {
      const examFile = path.join(this.contextDir, 'exam', 'exam.yaml');
      
      // Check if exam file exists
      if (!(await fs.pathExists(examFile))) {
        return {
          success: false,
          message: 'Exam file not found. Use init-exam to create one first.'
        };
      }
      
      // Read and parse exam file
      let examData;
      try {
        examData = await this.validator.readYamlFile(examFile);
      } catch (parseError) {
        return {
          success: false,
          message: 'Failed to parse exam file: Invalid YAML format',
          error: parseError.message
        };
      }
      
      // Validate against schema and business rules
      const validation = await this.validator.validateExam(examData);
      
      // Additional business validations
      const businessErrors = this.validateBusinessRules(examData);
      const allErrors = [...validation.errors, ...businessErrors];
      
      const isValid = allErrors.length === 0;
      
      return {
        success: true,
        valid: isValid,
        message: isValid ? 'Exam is valid and ready for use' : 'Exam validation failed',
        errors: allErrors,
        examPath: examFile
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate exam',
        error: error.message
      };
    }
  }
  
  validateBusinessRules(examData) {
    const errors = [];
    
    // Check for empty exam (not ready for use)
    if (examData.questions && examData.questions.length === 0) {
      errors.push('Empty exam not ready for use - no questions found');
    }
    
    // Check if total_questions matches actual question count
    if (examData.metadata && examData.questions) {
      const declaredCount = examData.metadata.total_questions;
      const actualCount = examData.questions.length;
      
      if (declaredCount !== actualCount) {
        errors.push(`total_questions mismatch: declared ${declaredCount} but found ${actualCount} questions`);
      }
    }
    
    // Check if solutions match questions count
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

module.exports = { ValidateExamCommand };
