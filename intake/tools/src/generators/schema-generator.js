const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

class SchemaGenerator {
  constructor() {
    this.metaFile = path.join(__dirname, '../meta/exam.types.yaml');
    this.schemasDir = path.join(__dirname, '../schemas');
  }

  async generateSchemas() {
    try {
      // Read the meta types file
      const metaContent = await fs.readFile(this.metaFile, 'utf8');
      const metaTypes = yaml.load(metaContent);
      
      const results = [];
      
      // Generate question-types.schema.json
      if (metaTypes.question_types) {
        const questionTypesSchema = this.generateEnumSchema(metaTypes.question_types);
        const filename = metaTypes.question_types.schema_config.filename;
        const filePath = path.join(this.schemasDir, filename);
        
        await fs.writeJson(filePath, questionTypesSchema, { spaces: 2 });
        results.push(`✅ Generated ${filename}`);
      }
      
      // Generate difficulty-levels.schema.json
      if (metaTypes.difficulty_levels) {
        const difficultySchema = this.generateEnumSchema(metaTypes.difficulty_levels);
        const filename = metaTypes.difficulty_levels.schema_config.filename;
        const filePath = path.join(this.schemasDir, filename);
        
        await fs.writeJson(filePath, difficultySchema, { spaces: 2 });
        results.push(`✅ Generated ${filename}`);
      }
      
      return {
        success: true,
        message: 'Schemas generated successfully',
        results: results
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate schemas',
        error: error.message
      };
    }
  }
  
  generateEnumSchema(typeDefinition) {
    const config = typeDefinition.schema_config;
    const enumValues = Object.keys(typeDefinition.values);
    
    return {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "title": config.title,
      "description": config.description,
      "type": config.type,
      "enum": enumValues
    };
  }
}

module.exports = { SchemaGenerator };
