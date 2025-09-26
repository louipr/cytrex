const fs = require('fs-extra');
const path = require('path');

/**
 * Comment Style Definitions
 * Different styles for different types of guidance
 */
const COMMENT_STYLES = {
  header: {
    prefix: '# ',
    separator: '\n',
    indent: 0
  },
  section: {
    prefix: '# ',
    separator: '\n',
    indent: 0,
    uppercase: true
  },
  enumItem: {
    prefix: '#   ',
    separator: '\n',
    indent: 2
  },
  example: {
    prefix: '# ',
    separator: '\n',
    indent: 0
  },
  inline: {
    prefix: '  # ',
    separator: '',
    indent: 2
  }
};

/**
 * Template Types for different comment sections
 */
const TEMPLATE_TYPES = {
  schemaEnum: {
    style: 'enumItem',
    format: (key, value) => `${key}: ${value}`
  },
  guidance: {
    style: 'header', 
    format: (key, value) => `${key.toUpperCase()}: ${value}`
  },
  structure: {
    style: 'example',
    format: (content) => content
  }
};

/**
 * Schema Comment Generator Factory
 * Converts schema metadata to formatted YAML comments
 */
class SchemaCommentGenerator {
  constructor() {
    this.templates = new Map();
    this.loadTemplates();
  }

  /**
   * Load comment templates from configuration
   */
  loadTemplates() {
    // Basic template for enum descriptions
    this.templates.set('enum_descriptions', {
      section: 'QUESTION TYPES (use ONLY these types from schema)',
      type: 'schemaEnum',
      source: (schema) => schema['x-descriptions'] || {}
    });

    // Template for validation guidance
    this.templates.set('validation_guidance', {
      section: 'VALIDATION',
      type: 'guidance',
      source: () => ({
        'command': 'node learn-tool.js validate-exam',
        'requirements': 'Questions/solutions must have matching IDs, total_questions must match actual count'
      })
    });

    // Template for structure examples - generated from exam schema
    this.templates.set('structure_example', {
      section: 'STRUCTURE EXAMPLE',
      type: 'structure',
      source: async (schema) => {
        // Load the main exam schema to get the actual structure
        const examSchemaPath = path.join(__dirname, '../../schemas/exam.schema.json');
        const examSchema = await fs.readJson(examSchemaPath);
        
        return this.generateSchemaExample(examSchema, schema);
      }
    });
  }

  /**
   * Generate comments from schema metadata
   */
  async generateComments(schemaFile, templateNames = ['enum_descriptions']) {
    const schema = await fs.readJson(schemaFile);
    const commentSections = [];

    for (const templateName of templateNames) {
      const template = this.templates.get(templateName);
      if (!template) continue;

      const section = this.generateSection(template, schema);
      if (section) {
        commentSections.push(section);
      }
    }

    return commentSections.join('\n#\n');
  }

  /**
   * Generate a single comment section
   */
  async generateSection(template, schema) {
    const data = await template.source(schema);
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;

    const style = COMMENT_STYLES[TEMPLATE_TYPES[template.type].style];
    const formatter = TEMPLATE_TYPES[template.type].format;
    
    let section = this.formatSectionHeader(template.section);
    
    if (template.type === 'structure') {
      section += '\n' + this.formatContent(data, style);
    } else {
      const items = Object.entries(data).map(([key, value]) => 
        this.formatContent(formatter(key, value), style)
      );
      section += '\n' + items.join('');
    }

    return section;
  }

  /**
   * Format section header
   */
  formatSectionHeader(title) {
    const style = COMMENT_STYLES.section;
    const content = style.uppercase ? title.toUpperCase() : title;
    return `${style.prefix}${content}:`;
  }

  /**
   * Format content with specified style
   */
  formatContent(content, style) {
    const indent = ' '.repeat(style.indent);
    const lines = content.split('\n');
    return lines.map(line => 
      line.trim() ? `${style.prefix}${line}` : '#'
    ).join('\n') + (style.separator || '');
  }

  /**
   * Generate example structure from exam schema
   */
  generateSchemaExample(examSchema, questionTypesSchema) {
    const questionProps = examSchema.properties.questions.items.properties;
    const solutionProps = examSchema.properties.solutions.items.properties;
    
    // Get first enum value as example
    const exampleType = questionTypesSchema.enum?.[0] || 'factual';
    
    // Generate questions example from schema
    const questionExample = this.generateObjectExample('questions', questionProps, {
      id: '"q1"',
      type: `"${exampleType}"`,
      question: '"Your question text here"',
      category: '"your_category"'
    });
    
    // Generate solutions example from schema  
    const solutionExample = this.generateObjectExample('solutions', solutionProps, {
      id: '"q1"',
      answer: '"Comprehensive answer here"', 
      evidence_sources: '["filename:line-range"]'
    });
    
    return `${questionExample}\n${solutionExample}`;
  }

  /**
   * Generate YAML structure example from schema
   */
  async generateSchemaExample(schemaPath) {
    try {
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      const schema = JSON.parse(schemaContent);
      
      if (schema.properties) {
        // Get the main properties like questions, solutions, etc.
        const mainProps = schema.properties;
        let example = '';
        
        for (const [key, prop] of Object.entries(mainProps)) {
          if (key === 'questions' && prop.items && prop.items.properties) {
            const questionProps = prop.items.properties;
            example += this.generateObjectExample('questions', questionProps, {
              id: '"q1"',
              type: '"conceptual"',
              question: '"Your question here"',
              difficulty: '"beginner"'
            });
          } else if (key === 'solutions' && prop.items && prop.items.properties) {
            const solutionProps = prop.items.properties;
            example += `\n${this.generateObjectExample('solutions', solutionProps, {
              id: '"q1"',
              answer: '"Comprehensive answer here"',
              evidence_sources: '["filename:line-range"]'
            })}`;
          }
        }
        
        return example || 'exam:\n  # Basic structure example';
      }
      
      return 'exam:\n  # Basic structure example';
    } catch (error) {
      console.warn(`Could not generate schema example: ${error.message}`);
      return 'exam:\n  # Basic structure example';
    }
  }

  /**
   * Generate YAML example for object from schema properties
   */
  generateObjectExample(rootKey, schemaProps, exampleValues) {
    const requiredFields = Object.keys(schemaProps).filter(key => 
      schemaProps[key].type || schemaProps[key].$ref
    );
    
    let example = `${rootKey}:\n  - `;
    const fields = requiredFields.map(field => {
      const value = exampleValues[field] || `"example_${field}"`;
      const comment = field === 'type' ? '  # Must be one of the allowed types above' : '';
      return `${field}: ${value}${comment}`;
    });
    
    example += fields.join('\n    ');
    return example;
  }

  /**
   * Register custom template
   */
  registerTemplate(name, template) {
    this.templates.set(name, template);
  }
}

module.exports = { SchemaCommentGenerator, COMMENT_STYLES, TEMPLATE_TYPES };
