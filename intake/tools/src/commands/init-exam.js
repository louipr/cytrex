const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');
const { SchemaValidator } = require('../validators/schema-validator.js');
const { SchemaCommentGenerator } = require('../generators/comment-generator');

class InitExamCommand {
  constructor(contextDir = process.cwd()) {
    this.contextDir = contextDir;
    this.validator = new SchemaValidator();
  }

  async execute() {
    try {
      const examDir = path.join(this.contextDir, 'exam');
      const examFile = path.join(examDir, 'exam.yaml');
      
      // Check if exam already exists
      if (await fs.pathExists(examFile)) {
        return {
          success: false,
          message: 'Exam already exists. Use validate-exam to check existing exam.'
        };
      }
      
      // Ensure exam directory exists
      await fs.ensureDir(examDir);
      
      // Create exam skeleton with template structure
      const examSkeleton = {
        metadata: {
          created: new Date().toISOString(),
          version: '1.0.0',
          total_questions: 0
        },
        questions: [
          {
            id: "",
            type: "",
            question: "",
            category: ""
          }
        ],
        solutions: [
          {
            id: "",
            answer: "",
            evidence_sources: [""]
          }
        ]
      };
      
      // Generate schema-driven comments
      const commentGenerator = new SchemaCommentGenerator();
      const questionTypesSchemaFile = path.join(__dirname, '../../schemas/question-types.schema.json');
      
      const schemaComments = await commentGenerator.generateComments(questionTypesSchemaFile);
      
      // Write exam skeleton as YAML with factory-generated header
      const yamlContent = `# Exam File - Agent Guidance
# 
${schemaComments}

${yaml.dump(examSkeleton, { indent: 2, lineWidth: 120 })}`;
      
      await fs.writeFile(examFile, yamlContent);
      
      // Validate against schema
      const validation = await this.validator.validateExam(examSkeleton);
      
      return {
        success: true,
        message: 'Exam skeleton created successfully',
        schemaValid: validation.valid,
        examPath: examFile
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create exam skeleton',
        error: error.message
      };
    }  
  }
}

module.exports = { InitExamCommand };
