#!/usr/bin/env node

const { program } = require('commander');
const { CommandHandler } = require('./src/commands/unified-command.js');
const path = require('path');

// Set up CLI
program
  .name('learn-tool')
  .description('AI Learning Methodology Tool')
  .version('1.0.0');

// Schema generation command


// Use current working directory as context
const getContextDir = () => {
  return process.cwd();
};

// Unified command execution - eliminates all the repetitive CLI boilerplate
async function executeCommand(operation, params = {}) {
  try {
    const handler = new CommandHandler(getContextDir());
    const result = await handler.execute(operation, params);
    
    if (result.success) {
      console.log('✅', result.message);
      
      // Handle specific output formatting
      if (result.examPath) console.log('📁 Exam file created at:', result.examPath);
      if (result.knowledgePath) console.log('📁 Knowledge file created at:', result.knowledgePath);
      if (result.iterationPath) console.log('📁 Iteration directory created at:', result.iterationPath);
      
      // Handle validation warnings
      if (result.schemaValid === false) {
        console.warn('⚠️  Warning: Generated file failed schema validation');
      }
      if (result.knowledgeSchemaValid === false) {
        console.warn('⚠️  Warning: Knowledge file failed schema validation');
      }
      if (result.answersSchemaValid === false) {
        console.warn('⚠️  Warning: Answers file failed schema validation');
      }
      
      // Handle validation results
      if (operation === 'validate-exam') {
        if (result.valid) {
          console.log('📄 Exam validated at:', result.examPath);
        } else {
          console.log('❌', result.message);
          console.log('📄 Exam file:', result.examPath);
          console.log('\n🔍 Validation errors:');
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
          process.exit(1);
        }
      }
      
    } else {
      console.error('❌', result.message);
      if (result.error) {
        console.error('Error details:', result.error);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// init-exam command
program
  .command('init-exam')
  .description('Creates exam directory and skeleton exam.yaml file')
  .action(async () => {
    await executeCommand('init-exam');
  });

// validate-exam command
program
  .command('validate-exam')
  .description('Validates exam.yaml against schema and business rules')
  .action(async () => {
    await executeCommand('validate-exam');
  });

// init-knowledge-baseline command
program
  .command('init-knowledge-baseline')
  .description('Creates knowledge_iter0.json skeleton for baseline knowledge extraction')
  .action(async () => {
    await executeCommand('init-knowledge-baseline');
  });

// init-iter command
program
  .command('init-iter <iteration>')
  .description('Setup iteration directory with knowledge copy and empty answers')
  .action(async (iteration) => {
    await executeCommand('init-iter', { iterationName: iteration });
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
