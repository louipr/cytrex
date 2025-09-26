const fs = require('fs-extra');
const path = require('path');
const { SchemaValidator } = require('../validators/schema-validator.js');

class InitKnowledgeBaselineCommand {
  constructor(contextDir = process.cwd()) {
    this.contextDir = contextDir;
    this.validator = new SchemaValidator();
  }

  async execute() {
    try {
      const knowledgeFile = path.join(this.contextDir, 'knowledge_iter0.json');
      
      // Check if knowledge baseline already exists
      if (await fs.pathExists(knowledgeFile)) {
        return {
          success: false,
          message: 'Knowledge baseline already exists. Delete it first if you want to recreate it.'
        };
      }
      
      // Create knowledge baseline skeleton
      const knowledgeSkeleton = {
        metadata: {
          iteration: 0,
          created: new Date().toISOString(),
          source_documents: []
        },
        knowledge_domains: []
      };
      
      // Write knowledge skeleton
      await fs.writeJson(knowledgeFile, knowledgeSkeleton, { spaces: 2 });
      
      // Validate against schema
      const validation = await this.validator.validateKnowledge(knowledgeSkeleton);
      
      return {
        success: true,
        message: 'Knowledge baseline skeleton created successfully',
        schemaValid: validation.valid,
        knowledgePath: knowledgeFile
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create knowledge baseline skeleton',
        error: error.message
      };
    }
  }
}

module.exports = { InitKnowledgeBaselineCommand };
