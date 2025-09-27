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
      if (result.examDraftPath) console.log('📁 Exam draft skeleton created at:', result.examDraftPath);
      if (result.knowledgePath) console.log('📁 Knowledge file created at:', result.knowledgePath);
      if (result.iterationPath) console.log('📁 Iteration directory created at:', result.iterationPath);
      if (result.templatePath) console.log('📁 Learning template created at:', result.templatePath);
      if (result.documentsFound) console.log('📄 Documents found:', result.documentsFound);
      if (result.documentFiles) {
        console.log('📚 Document files:');
        result.documentFiles.forEach(file => console.log(`  - ${file}`));
      }
      if (result.documentsProcessed) console.log('📊 Documents processed:', result.documentsProcessed);
      if (result.totalDomains) console.log('🎯 Technical domains identified:', result.totalDomains);
      if (result.questionsCount) console.log('❓ Questions created:', result.questionsCount);
      if (result.auditTrail) console.log('🔍 Audit trail included:', 'Yes');
      
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
      
      if (operation === 'validate-evidence') {
        if (result.valid) {
          console.log('📊 Evidence validation passed');
        } else {
          console.log('❌', result.message);
          console.log('\n🔍 Evidence validation errors:');
          result.errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ${error}`);
          });
          process.exit(1);
        }
      }
      
      if (operation === 'validate-answers') {
        if (result.valid) {
          console.log('✅ Answer validation passed');
          console.log(`📊 Questions: ${result.answeredQuestions}/${result.totalQuestions} answered`);
          console.log(`📈 Average confidence: ${result.averageConfidence}`);
          console.log('📄 Answers file:', result.answersPath);
        } else {
          console.log('❌', result.message);
          console.log(`📊 Questions: ${result.answeredQuestions}/${result.totalQuestions} answered`);
          console.log(`🔴 Blank answers: ${result.blankAnswers}`);
          console.log(`📈 Average confidence: ${result.averageConfidence}`);
          console.log('📄 Answers file:', result.answersPath);
          console.log('\n🔍 Answer validation errors:');
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

// NEW HYBRID APPROACH COMMANDS

// generate-learning-template command
program
  .command('generate-learning-template')
  .description('Creates structured learning template from documentation files')
  .action(async () => {
    await executeCommand('generate-learning-template');
  });

// validate-evidence command
program
  .command('validate-evidence')
  .description('Validates learning evidence for completeness and quality')
  .action(async () => {
    await executeCommand('validate-evidence');
  });

// assemble-exam command
program
  .command('assemble-exam')
  .description('Assembles final exam from evidence and questions with audit trail')
  .action(async () => {
    await executeCommand('assemble-exam');
  });

// validate-answers command
program
  .command('validate-answers <iteration>')
  .description('Validates answer completion and quality for an iteration')
  .action(async (iteration) => {
    await executeCommand('validate-answers', { iterationName: iteration });
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
