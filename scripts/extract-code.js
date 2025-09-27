#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Extract TypeScript code from Opus implementation markdown files
 * and organize them according to the file path comments
 */
class CodeExtractor {
  constructor() {
    this.sourceFiles = [
      'intake/docs/builtin_rules_implementation.md',
      'intake/docs/cli_and_tests.md', 
      'intake/docs/complete_implementation.md'
    ];
    this.targetDir = 'src';
    this.extractedFiles = new Map();
  }

  async extract() {
    console.log('🔍 Starting code extraction from Opus implementation files...\n');

    // Process each source file
    for (const sourceFile of this.sourceFiles) {
      console.log(`📄 Processing: ${sourceFile}`);
      await this.extractFromFile(sourceFile);
    }

    // Write all extracted files
    console.log('\n📝 Writing extracted files...');
    await this.writeExtractedFiles();

    console.log('\n✅ Code extraction completed!');
    console.log(`📊 Extracted ${this.extractedFiles.size} files total`);
  }

  async extractFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const blocks = this.parseCodeBlocks(content);
    
    for (const block of blocks) {
      if (block.filePath && block.code) {
        console.log(`  → Found: ${block.filePath} (${block.code.split('\n').length} lines)`);
        
        // Combine code if file already exists
        if (this.extractedFiles.has(block.filePath)) {
          const existing = this.extractedFiles.get(block.filePath);
          this.extractedFiles.set(block.filePath, {
            ...existing,
            code: existing.code + '\n\n' + block.code,
            sources: [...existing.sources, filePath]
          });
        } else {
          this.extractedFiles.set(block.filePath, {
            filePath: block.filePath,
            code: block.code,
            sources: [filePath],
            imports: this.extractImports(block.code)
          });
        }
      }
    }
  }

  parseCodeBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for file path comments
      const fileMatch = line.match(/\/\/ File: (.+)/);
      if (fileMatch) {
        // Save previous block if exists
        if (currentBlock && currentBlock.code.trim()) {
          blocks.push(currentBlock);
        }
        
        // Start new block
        currentBlock = {
          filePath: fileMatch[1].trim(),
          code: '',
          lineStart: i
        };
        continue;
      }

      // Stop collecting when we hit another file marker or separator
      if (currentBlock && (
        line.includes('// ============================================================================') ||
        line.includes('// File: ') ||
        line.startsWith('# ') ||
        line.startsWith('## ')
      )) {
        // Don't add separator lines to code
        if (line.includes('// ============================================================================')) {
          continue;
        }
        
        // This might be the start of a new section
        if (currentBlock.code.trim()) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
      }

      // Collect TypeScript code lines (skip markdown headers and empty lines at start)
      if (currentBlock && 
          !line.includes('// ============================================================================') &&
          !line.startsWith('#') && 
          !(currentBlock.code === '' && line.trim() === '')) {
        currentBlock.code += line + '\n';
      }
    }

    // Don't forget the last block
    if (currentBlock && currentBlock.code.trim()) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  extractImports(code) {
    const imports = [];
    const lines = code.split('\n');
    
    for (const line of lines) {
      if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
        imports.push(line.trim());
      }
    }
    
    return imports;
  }

  async writeExtractedFiles() {
    for (const [filePath, fileData] of this.extractedFiles) {
      // Remove 'src/' prefix if it exists since we're already targeting src/
      const cleanPath = filePath.startsWith('src/') ? filePath.substring(4) : filePath;
      const fullPath = path.join(this.targetDir, cleanPath);
      const dir = path.dirname(fullPath);

      // Create directory structure
      fs.mkdirSync(dir, { recursive: true });

      // Add file header with source information
      const header = this.generateFileHeader(fileData);
      const finalCode = header + fileData.code;

      // Write file
      fs.writeFileSync(fullPath, finalCode, 'utf8');
      console.log(`  ✓ Created: ${fullPath}`);
    }
  }

  generateFileHeader(fileData) {
    return `// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: ${fileData.sources.join(', ')}
// Generated on: ${new Date().toISOString()}
// ============================================================================

`;
  }
}

// Run extraction
async function main() {
  try {
    const extractor = new CodeExtractor();
    await extractor.extract();
    
    console.log('\n🎯 Next steps:');
    console.log('1. Review generated files in src/ directory');
    console.log('2. Fix any import path issues');
    console.log('3. Run: npm run build');
    console.log('4. Run: npm test');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CodeExtractor };
