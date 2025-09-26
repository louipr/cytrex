const fs = require('fs-extra');

/**
 * Simple schema comment generator
 * Reads schema and generates YAML comments - that's it!
 */
class SchemaCommentGenerator {
  
  async generateComments(schemaFile) {
    const schema = await fs.readJson(schemaFile);
    const descriptions = schema['x-descriptions'] || {};
    
    let comments = '';
    for (const [type, description] of Object.entries(descriptions)) {
      comments += `# ${type}: ${description}\n`;
    }
    
    return comments.trimEnd();
  }
}

module.exports = { SchemaCommentGenerator };
