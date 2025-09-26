const fs = require('fs-extra');

/**
 * Simple schema comment generator
 * Reads schema and generates YAML comments - that's it!
 */
class SchemaCommentGenerator {
  
  async generateComments(schemaFile) {
    const schema = await fs.readJson(schemaFile);
    const descriptions = schema['x-descriptions'] || {};
    
    if (Object.keys(descriptions).length === 0) {
      return '# No descriptions available';
    }
    
    let comments = '# QUESTION TYPES (use ONLY these types from schema):\n';
    
    for (const [type, description] of Object.entries(descriptions)) {
      comments += `#   ${type}: ${description}\n`;
    }
    
    comments += '#\n';
    comments += '# EVIDENCE SOURCES FORMAT: ["filename:line-range"]\n';
    comments += '# VALIDATION COMMAND: node learn-tool.js validate-exam\n';
    comments += '#\n';
    comments += '# STRUCTURE EXAMPLE:\n';
    comments += '# questions:\n';
    comments += '#   - id: "q1"\n';
    comments += '#     type: "factual"  # Must be one of the allowed types above\n';
    comments += '#     question: "Your question text here"\n';
    comments += '#     category: "your_category"\n';
    comments += '# solutions:\n';
    comments += '#   - id: "q1"  # Must match question ID\n';
    comments += '#     answer: "Comprehensive answer here"\n';
    comments += '#     evidence_sources: ["filename:line-range"]';
    
    return comments;
  }
}

module.exports = { SchemaCommentGenerator };
