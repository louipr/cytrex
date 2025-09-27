// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/cli_and_tests.md
// Generated on: 2025-09-27T09:28:40.521Z
// ============================================================================

// Comprehensive Parser Tests

import { TypeScriptParser } from '../../src/core/parser/TypeScriptParser';
import * as path from 'path';
import * as fs from 'fs';

describe('TypeScriptParser', () => {
  let parser: TypeScriptParser;
  const fixturesPath = path.join(__dirname, '../fixtures');

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  describe('parseProject', () => {
    it('should parse a TypeScript project successfully', async () => {
      const projectPath = path.join(fixturesPath, 'sample-project');
      const ast = await parser.parseProject(projectPath);

      expect(ast).toBeDefined();
      expect(ast.files.size).toBeGreaterThan(0);
      expect(ast.program).toBeDefined();
      expect(ast.typeChecker).toBeDefined();
    });

    it('should handle projects without tsconfig', async () => {
      const projectPath = path.join(fixturesPath, 'no-tsconfig');
      const ast = await parser.parseProject(projectPath);

      expect(ast).toBeDefined();
      expect(ast.files.size).toBeGreaterThan(0);
    });

    it('should skip declaration files', async () => {
      const projectPath = path.join(fixturesPath, 'with-declarations');
      const ast = await parser.parseProject(projectPath);

      const declarationFiles = Array.from(ast.files.keys()).filter(
        file => file.endsWith('.d.ts')
      );
      
      expect(declarationFiles.length).toBe(0);
    });

    it('should extract imports correctly', async () => {
      const projectPath = path.join(fixturesPath, 'imports-test');
      const ast = await parser.parseProject(projectPath);

      const mainFile = Array.from(ast.files.values()).find(
        file => file.path.includes('index.ts')
      );

      expect(mainFile).toBeDefined();
      expect(mainFile!.imports.length).toBeGreaterThan(0);

      const defaultImport = mainFile!.imports.find(
        imp => imp.specifiers.length === 1 && !imp.specifiers[0].includes('*')
      );
      expect(defaultImport).toBeDefined();

      const namedImport = mainFile!.imports.find(
        imp => imp.specifiers.length > 1
      );
      expect(namedImport).toBeDefined();
    });

    it('should extract exports correctly', async () => {
      const projectPath = path.join(fixturesPath, 'exports-test');
      const ast = await parser.parseProject(projectPath);

      const moduleFile = Array.from(ast.files.values()).find(
        file => file.path.includes('module.ts')
      );

      expect(moduleFile).toBeDefined();
      expect(moduleFile!.exports.length).toBeGreaterThan(0);

      const namedExport = moduleFile!.exports.find(exp => exp.type === 'named');
      expect(namedExport).toBeDefined();

      const defaultExport = moduleFile!.exports.find(exp => exp.type === 'default');
      expect(defaultExport).toBeDefined();
    });

    it('should handle syntax errors gracefully', async () => {
      const projectPath = path.join(fixturesPath, 'syntax-errors');
      const ast = await parser.parseProject(projectPath);

      expect(ast).toBeDefined();
      expect(ast.diagnostics.length).toBeGreaterThan(0);
    });

    it('should generate consistent file hashes', async () => {
      const projectPath = path.join(fixturesPath, 'sample-project');
      
      const ast1 = await parser.parseProject(projectPath);
      const parser2 = new TypeScriptParser();
      const ast2 = await parser2.parseProject(projectPath);

      const file1 = Array.from(ast1.files.values())[0];
      const file2 = Array.from(ast2.files.values())[0];

      expect(file1.hash).toBe(file2.hash);
    });

    it('should parse JSX files', async () => {
      const projectPath = path.join(fixturesPath, 'jsx-project');
      const ast = await parser.parseProject(projectPath);

      const jsxFile = Array.from(ast.files.values()).find(
        file => file.path.endsWith('.tsx') || file.path.endsWith('.jsx')
      );

      expect(jsxFile).toBeDefined();
    });
  });

  describe('parseFile', () => {
    it('should parse individual file', async () => {
      const projectPath = path.join(fixturesPath, 'sample-project');
      await parser.parseProject(projectPath);

      const filePath = path.join(projectPath, 'src/index.ts');
      const fileAST = await parser.parseFile(filePath);

      expect(fileAST).toBeDefined();
      expect(fileAST.path).toBe(filePath);
      expect(fileAST.sourceFile).toBeDefined();
    });

    it('should throw error for non-existent file', async () => {
      const projectPath = path.join(fixturesPath, 'sample-project');
      await parser.parseProject(projectPath);

      await expect(
        parser.parseFile('/non/existent/file.ts')
      ).rejects.toThrow();
    });
  });

  describe('getProgram', () => {
    it('should return null before parsing', () => {
      expect(parser.getProgram()).toBeNull();
    });

    it('should return program after parsing', async () => {
      const projectPath = path.join(fixturesPath, 'sample-project');
      await parser.parseProject(projectPath);

      const program = parser.getProgram();
      expect(program).toBeDefined();
      expect(program!.getSourceFiles().length).toBeGreaterThan(0);
    });
  });

  describe('getTypeChecker', () => {
    it('should return type checker after parsing', async () => {
      const projectPath = path.join(fixturesPath, 'sample-project');
      await parser.parseProject(projectPath);

      const typeChecker = parser.getTypeChecker();
      expect(typeChecker).toBeDefined();
    });
  });
});

