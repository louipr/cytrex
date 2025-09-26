#!/usr/bin/env node

const { program } = require('commander');
const { InitExamCommand } = require('./src/commands/init-exam.js');
const { ValidateExamCommand } = require('./src/commands/validate-exam.js');
const { InitKnowledgeBaselineCommand } = require('./src/commands/init-knowledge-baseline.js');
const { InitIterCommand } = require('./src/commands/init-iter.js');
const path = require('path');

// Set up CLI
program
  .name('learn-tool')
  .description('AI Learning Methodology Tool')
  .version('1.0.0');

// Schema generation command


// Get context directory from environment or default to current working directory
const getContextDir = () => {
  return process.env.LEARN_CONTEXT_DIR || path.join(process.cwd(), 'context');
};

// init-exam command
program
  .command('init-exam')
  .description('Creates exam directory and skeleton exam.json file')
  .action(async () => {
    try {
      const command = new InitExamCommand(getContextDir());
      const result = await command.execute();
      
      if (result.success) {
        console.log('✅', result.message);
        if (result.examPath) {
          console.log('📁 Exam file created at:', result.examPath);
        }
        if (!result.schemaValid) {
          console.warn('⚠️  Warning: Generated exam skeleton failed schema validation');
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
  });

// validate-exam command
program
  .command('validate-exam')
  .description('Validates exam.json against schema and business rules')
  .action(async () => {
    try {
      const command = new ValidateExamCommand(getContextDir());
      const result = await command.execute();
      
      if (result.success) {
        if (result.valid) {
          console.log('✅', result.message);
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
  });

// init-knowledge-baseline command
program
  .command('init-knowledge-baseline')
  .description('Creates knowledge_iter0.json skeleton for baseline knowledge extraction')
  .action(async () => {
    try {
      const command = new InitKnowledgeBaselineCommand(getContextDir());
      const result = await command.execute();
      
      if (result.success) {
        console.log('✅', result.message);
        if (result.knowledgePath) {
          console.log('📁 Knowledge file created at:', result.knowledgePath);
        }
        if (!result.schemaValid) {
          console.warn('⚠️  Warning: Generated knowledge baseline failed schema validation');
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
  });

// init-iter command
program
  .command('init-iter <iteration>')
  .description('Setup iteration directory with knowledge copy and empty answers')
  .action(async (iteration) => {
    try {
      const command = new InitIterCommand(getContextDir());
      const result = await command.execute(iteration);
      
      if (result.success) {
        console.log('✅', result.message);
        if (result.iterationPath) {
          console.log('📁 Iteration directory created at:', result.iterationPath);
        }
        if (!result.knowledgeSchemaValid) {
          console.warn('⚠️  Warning: Knowledge file failed schema validation');
        }
        if (!result.answersSchemaValid) {
          console.warn('⚠️  Warning: Answers file failed schema validation');
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
  });

// TODO: Add other commands as they are implemented
// validate-pretest, init-scoring, validate-prescore, improve-knowledge

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
