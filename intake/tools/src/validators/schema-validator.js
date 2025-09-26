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
    
    // Load referenced schemas first
    const questionTypesSchema = fs.readJsonSync(path.join(schemasDir, 'question-types.schema.json'));
    this.ajv.addSchema(questionTypesSchema, 'question-types.schema.json');
    
    const difficultyLevelsSchema = fs.readJsonSync(path.join(schemasDir, 'difficulty-levels.schema.json'));
    this.ajv.addSchema(difficultyLevelsSchema, 'difficulty-levels.schema.json');
    
    // Load exam schema (now references can be resolved)
    const examSchema = fs.readJsonSync(path.join(schemasDir, 'exam.schema.json'));
    this.schemas.exam = this.ajv.compile(examSchema);
    
    // Load knowledge schema  
    const knowledgeSchema = fs.readJsonSync(path.join(schemasDir, 'knowledge.schema.json'));
    this.schemas.knowledge = this.ajv.compile(knowledgeSchema);
    
    // Load answers schema
    const answersSchema = fs.readJsonSync(path.join(schemasDir, 'answers.schema.json'));
    this.schemas.answers = this.ajv.compile(answersSchema);
    
    // Load score schema
    const scoreSchema = fs.readJsonSync(path.join(schemasDir, 'score.schema.json'));
    this.schemas.score = this.ajv.compile(scoreSchema);
  }

  async readYamlFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      throw new Error(`Failed to read/parse YAML file: ${error.message}`);
    }
  }

  async validateExam(examData) {
    const valid = this.schemas.exam(examData);
    const errors = [];
    
    if (!valid) {
      errors.push(...this.schemas.exam.errors.map(err => 
        `${err.instancePath} ${err.message}`
      ));
    }
    
    // Additional business logic validation
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
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validateKnowledge(knowledgeData) {
    const valid = this.schemas.knowledge(knowledgeData);
    const errors = [];
    
    if (!valid) {
      errors.push(...this.schemas.knowledge.errors.map(err => 
        `${err.instancePath} ${err.message}`
      ));
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validateAnswers(answersData) {
    const valid = this.schemas.answers(answersData);
    const errors = [];
    
    if (!valid) {
      errors.push(...this.schemas.answers.errors.map(err => 
        `${err.instancePath} ${err.message}`
      ));
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validateScore(scoreData) {
    const valid = this.schemas.score(scoreData);
    const errors = [];
    
    if (!valid) {
      errors.push(...this.schemas.score.errors.map(err => 
        `${err.instancePath} ${err.message}`
      ));
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = { SchemaValidator };
