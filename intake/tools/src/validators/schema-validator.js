const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
    this.schemas = {};
    this.loadSchemas();
  }

  loadSchemas() {
    const schemasDir = path.join(__dirname, '../../schemas');
    
    // Load and compile main schemas (now self-contained)
    const schemaNames = ['exam', 'knowledge', 'answers', 'score'];
    schemaNames.forEach(name => {
      this.loadAndCompileSchema(schemasDir, name);
    });
  }
  
  loadAndCompileSchema(schemasDir, schemaName) {
    const fileName = `${schemaName}.schema.json`;
    const schema = fs.readJsonSync(path.join(schemasDir, fileName));
    this.schemas[schemaName] = this.ajv.compile(schema);
  }

  async readYamlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      throw new Error(`Failed to read/parse YAML file: ${error.message}`);
    }
  }

  async validate(schemaName, data, businessLogicValidator = null) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }
    
    const valid = schema(data);
    const errors = [];
    
    if (!valid) {
      errors.push(...schema.errors.map(err => 
        `${err.instancePath} ${err.message}`
      ));
    }
    
    // Apply business logic validation if provided
    if (businessLogicValidator) {
      const businessErrors = businessLogicValidator(data);
      errors.push(...businessErrors);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  validateExamBusinessLogic(examData) {
    const errors = [];
    
    if (examData.questions && examData.solutions) {
      const questionIds = new Set(examData.questions.map(q => q.id));
      const solutionIds = new Set(examData.solutions.map(s => s.id));
      
      for (const qId of questionIds) {
        if (!solutionIds.has(qId)) {
          errors.push(`Question/solution ID mismatch: question '${qId}' has no corresponding solution`);
        }
      }
      
      for (const sId of solutionIds) {
        if (!questionIds.has(sId)) {
          errors.push(`Question/solution ID mismatch: solution '${sId}' has no corresponding question`);
        }
      }
    }
    
    return errors;
  }

  async validateExam(examData) {
    return this.validate('exam', examData, this.validateExamBusinessLogic.bind(this));
  }

  async validateKnowledge(knowledgeData) {
    return this.validate('knowledge', knowledgeData);
  }

  async validateAnswers(answersData) {
    return this.validate('answers', answersData);
  }

  async validateScore(scoreData) {
    return this.validate('score', scoreData);
  }
}

module.exports = { SchemaValidator };
