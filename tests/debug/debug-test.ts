import { TypeScriptCompilerService } from '../../src/core/compiler/TypeScriptCompilerService';
import { DependencyGraph } from '../../src/core/graph/DependencyGraph';
import { PatternDetector } from '../../src/core/patterns/PatternDetector';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Debug test to isolate the issue step by step
 */
async function debugTest() {
  console.log('🔍 Debug Test - Step by Step Analysis...\n');

  try {
    // Create a simple test file
    const testDir = path.join(__dirname, 'debug-test');
    await fs.promises.mkdir(testDir, { recursive: true });
    
    const testFile = path.join(testDir, 'test.ts');
    await fs.promises.writeFile(testFile, `
import { UserService } from './UserService';
export const app = new UserService();
`);
    
    const userServiceFile = path.join(testDir, 'UserService.ts');
    await fs.promises.writeFile(userServiceFile, `
export class UserService {
  getName() { return 'test'; }
}
`);

    console.log('✅ Step 1: Created test files');

    // Test TypeScriptCompilerService
    console.log('🔍 Step 2: Testing TypeScriptCompilerService...');
    const compiler = new TypeScriptCompilerService();
    const program = await compiler.createProgram(testDir);
    
    console.log(`✅ Step 2: Created TypeScript program with ${program.getSourceFiles().length} files`);

    // Test source files
    console.log('🔍 Step 3: Examining source files...');
    const sourceFiles = program.getSourceFiles().filter(sf => !sf.isDeclarationFile && !sf.fileName.includes('node_modules'));
    
    for (const sf of sourceFiles) {
      console.log(`   - ${sf.fileName} (${sf.getEnd()} chars)`);
    }

    // Test dependency extraction on first file
    if (sourceFiles.length > 0) {
      console.log('🔍 Step 4: Testing dependency extraction...');
      const firstFile = sourceFiles.find(sf => sf.fileName.includes('test.ts'));
      
      if (firstFile) {
        console.log(`   - Analyzing: ${firstFile.fileName}`);
        
        // Manually walk through the AST
        let importCount = 0;
        let exportCount = 0;
        let allNodes = 0;
        
        firstFile.forEachChild(node => {
          allNodes++;
          console.log(`     Node ${allNodes}: kind=${node.kind} (${ts.SyntaxKind[node.kind]})`);
          
          if (ts.isImportDeclaration(node)) {
            importCount++;
            console.log(`     Found import declaration`);
            
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
              console.log(`       Module specifier text: "${node.moduleSpecifier.text}"`);
            }
          }
          if (ts.isExportDeclaration(node)) {
            exportCount++;
            console.log(`     Found export declaration`);
          }
        });
        
        console.log(`   - Found ${importCount} imports, ${exportCount} exports`);
      }
    }

    console.log('✅ Debug test completed successfully');
    
    // Cleanup
    await fs.promises.rm(testDir, { recursive: true, force: true });

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    throw error;
  }
}

// Run the debug test
if (require.main === module) {
  debugTest().catch(console.error);
}
