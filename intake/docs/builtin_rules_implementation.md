// ============================================================================
// BUILT-IN RULES IMPLEMENTATION
// Complete set of analysis rules for the Code Analysis Tool
// ============================================================================

import * as ts from 'typescript';
import * as path from 'path';
import { Rule } from '../core/rules/Rule';
import { Issue, RuleContext } from '../types';

// ============================================================================
// File: src/rules/complexity/ComplexityRule.ts
// Cyclomatic and Cognitive Complexity Detection
// ============================================================================

export class ComplexityRule extends Rule {
  readonly id = 'complexity';
  readonly name = 'Cyclomatic Complexity';
  readonly description = 'Detects functions with high cyclomatic complexity';

  private threshold = 10;
  private cognitiveThreshold = 15;

  configure(config: any): void {
    super.configure(config);
    this.threshold = config.threshold || 10;
    this.cognitiveThreshold = config.cognitiveThreshold || 15;
  }

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    if (this.isFunctionNode(node)) {
      const cyclomatic = this.calculateCyclomaticComplexity(node);
      const cognitive = this.calculateCognitiveComplexity(node);
      const functionName = this.getFunctionName(node);
      
      if (cyclomatic > this.threshold) {
        issues.push(
          this.createIssue(
            node,
            `Function '${functionName}' has cyclomatic complexity of ${cyclomatic} (threshold: ${this.threshold})`,
            { 
              type: 'cyclomatic',
              complexity: cyclomatic, 
              threshold: this.threshold,
              functionName 
            }
          )
        );
      }

      if (cognitive > this.cognitiveThreshold) {
        issues.push(
          this.createIssue(
            node,
            `Function '${functionName}' has cognitive complexity of ${cognitive} (threshold: ${this.cognitiveThreshold})`,
            { 
              type: 'cognitive',
              complexity: cognitive, 
              threshold: this.cognitiveThreshold,
              functionName 
            }
          )
        );
      }
    }

    return issues;
  }

  private isFunctionNode(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isArrowFunction(node) ||
           ts.isFunctionExpression(node) ||
           ts.isConstructorDeclaration(node);
  }

  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1; // Base complexity

    const visit = (n: ts.Node): void => {
      // Decision points
      if (ts.isIfStatement(n) ||
          ts.isConditionalExpression(n) ||
          ts.isWhileStatement(n) ||
          ts.isForStatement(n) ||
          ts.isForInStatement(n) ||
          ts.isForOfStatement(n) ||
          ts.isDoStatement(n)) {
        complexity++;
      }

      // Case clauses (except default)
      if (ts.isCaseClause(n)) {
        complexity++;
      }

      // Logical operators
      if (ts.isBinaryExpression(n)) {
        const operator = n.operatorToken.kind;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
            operator === ts.SyntaxKind.BarBarToken ||
            operator === ts.SyntaxKind.QuestionQuestionToken) {
          complexity++;
        }
      }

      // Catch clauses
      if (ts.isCatchClause(n)) {
        complexity++;
      }

      ts.forEachChild(n, visit);
    };

    ts.forEachChild(node, visit);
    return complexity;
  }

  private calculateCognitiveComplexity(node: ts.Node): number {
    let complexity = 0;
    let nestingLevel = 0;

    const visit = (n: ts.Node): void => {
      let incrementNesting = false;
      let increment = 0;

      // Control flow structures
      if (ts.isIfStatement(n)) {
        increment = 1 + nestingLevel;
        incrementNesting = true;
      } else if (ts.isWhileStatement(n) || 
                 ts.isForStatement(n) ||
                 ts.isForInStatement(n) ||
                 ts.isForOfStatement(n) ||
                 ts.isDoStatement(n)) {
        increment = 1 + nestingLevel;
        incrementNesting = true;
      } else if (ts.isSwitchStatement(n)) {
        increment = 1 + nestingLevel;
        incrementNesting = true;
      } else if (ts.isConditionalExpression(n)) {
        increment = 1 + nestingLevel;
      } else if (ts.isCatchClause(n)) {
        increment = 1 + nestingLevel;
        incrementNesting = true;
      }

      // Logical operators (with nesting)
      if (ts.isBinaryExpression(n)) {
        const operator = n.operatorToken.kind;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
            operator === ts.SyntaxKind.BarBarToken) {
          increment = 1;
        }
      }

      complexity += increment;

      if (incrementNesting) {
        nestingLevel++;
      }

      ts.forEachChild(n, visit);

      if (incrementNesting) {
        nestingLevel--;
      }
    };

    ts.forEachChild(node, visit);
    return complexity;
  }

  private getFunctionName(node: ts.Node): string {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      return node.name.getText();
    }
    
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.getText();
      }
      if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.getText();
      }
    }

    if (ts.isConstructorDeclaration(node)) {
      return 'constructor';
    }

    return '<anonymous>';
  }
}

// ============================================================================
// File: src/rules/deadcode/DeadCodeRule.ts
// Comprehensive Dead Code Detection
// ============================================================================

export class DeadCodeRule extends Rule {
  readonly id = 'dead-code';
  readonly name = 'Dead Code Detection';
  readonly description = 'Detects unreachable code and unused functions';

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Check for unreachable code after return/throw
    if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
      issues.push(...this.checkUnreachableCode(node));
    }

    // Check for unused functions using call graph
    if (this.isFunctionNode(node)) {
      issues.push(...this.checkUnusedFunction(node, context));
    }

    // Check for unreachable case clauses
    if (ts.isSwitchStatement(node)) {
      issues.push(...this.checkUnreachableCases(node, context));
    }

    // Check for dead conditionals
    if (ts.isIfStatement(node)) {
      issues.push(...this.checkDeadConditionals(node, context));
    }

    return issues;
  }

  private checkUnreachableCode(node: ts.ReturnStatement | ts.ThrowStatement): Issue[] {
    const issues: Issue[] = [];
    const parent = node.parent;

    if (ts.isBlock(parent)) {
      const statements = parent.statements;
      const nodeIndex = statements.indexOf(node as any);

      for (let i = nodeIndex + 1; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip empty statements and comments
        if (statement.kind === ts.SyntaxKind.EmptyStatement) continue;

        // Check if it's a label or declaration that might be hoisted
        if (ts.isFunctionDeclaration(statement) || 
            ts.isClassDeclaration(statement)) {
          continue; // These are hoisted, not dead
        }

        issues.push(
          this.createIssue(
            statement,
            'Unreachable code detected',
            { 
              type: 'unreachable',
              reason: ts.isReturnStatement(node) ? 'after-return' : 'after-throw'
            }
          )
        );
      }
    }

    return issues;
  }

  private checkUnusedFunction(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const functionId = this.getFunctionId(node, context);
    
    if (!functionId) return issues;

    const callNode = context.callGraph.getNode(functionId);
    if (!callNode) return issues;

    // Check if function is reachable from any entry point
    if (!context.callGraph.isReachable(functionId)) {
      const functionName = this.getFunctionName(node);
      
      // Check if it matches dynamic patterns
      if (!this.isDynamicFunction(functionName, context)) {
        // Check if it's exported
        if (!this.isExported(node)) {
          // Check if it's a test function
          if (!this.isTestFunction(node, functionName)) {
            // Check if it's an event handler
            if (!this.isEventHandler(node, functionName)) {
              issues.push(
                this.createIssue(
                  node,
                  `Function '${functionName}' is never called`,
                  { 
                    type: 'unused-function',
                    functionName,
                    callNode 
                  }
                )
              );
            }
          }
        }
      }
    }

    return issues;
  }

  private checkUnreachableCases(node: ts.SwitchStatement, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    let hasDefault = false;
    const caseValues = new Set<any>();

    for (const clause of node.caseBlock.clauses) {
      if (ts.isDefaultClause(clause)) {
        if (hasDefault) {
          issues.push(
            this.createIssue(
              clause,
              'Duplicate default clause - code after first default is unreachable',
              { type: 'unreachable-case' }
            )
          );
        }
        hasDefault = true;
      } else if (ts.isCaseClause(clause)) {
        // Check for duplicate case values
        const value = this.evaluateExpression(clause.expression, context);
        
        if (value !== undefined && caseValues.has(value)) {
          issues.push(
            this.createIssue(
              clause,
              `Duplicate case value '${value}' - this case is unreachable`,
              { type: 'duplicate-case', value }
            )
          );
        } else if (value !== undefined) {
          caseValues.add(value);
        }
      }
    }

    return issues;
  }

  private checkDeadConditionals(node: ts.IfStatement, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const condition = this.evaluateExpression(node.expression, context);

    if (condition === true) {
      // Else branch is dead
      if (node.elseStatement) {
        issues.push(
          this.createIssue(
            node.elseStatement,
            'Dead code: condition is always true, else branch is never executed',
            { type: 'dead-conditional', branch: 'else' }
          )
        );
      }
    } else if (condition === false) {
      // Then branch is dead
      issues.push(
        this.createIssue(
          node.thenStatement,
          'Dead code: condition is always false, then branch is never executed',
          { type: 'dead-conditional', branch: 'then' }
        )
      );
    }

    return issues;
  }

  private evaluateExpression(expr: ts.Expression, context: RuleContext): any {
    // Simple constant evaluation
    if (ts.isLiteralExpression(expr)) {
      if (ts.isNumericLiteral(expr)) return Number(expr.text);
      if (ts.isStringLiteral(expr)) return expr.text;
      if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (expr.kind === ts.SyntaxKind.NullKeyword) return null;
    }

    // Check for constant variables
    if (ts.isIdentifier(expr)) {
      const symbol = context.typeChecker.getSymbolAtLocation(expr);
      if (symbol && symbol.flags & ts.SymbolFlags.Const) {
        const declaration = symbol.valueDeclaration;
        if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) {
          return this.evaluateExpression(declaration.initializer, context);
        }
      }
    }

    return undefined;
  }

  private isFunctionNode(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isArrowFunction(node) ||
           ts.isFunctionExpression(node);
  }

  private getFunctionId(node: ts.Node, context: RuleContext): string | null {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const name = this.getFunctionName(node);
    
    return `${sourceFile.fileName}:${name}:${line}:${character}`;
  }

  private getFunctionName(node: ts.Node): string {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      return node.name.getText();
    }

    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.getText();
      }
      if (ts.isPropertyAssignment(parent)) {
        return parent.name.getText();
      }
    }

    return '<anonymous>';
  }

  private isDynamicFunction(name: string, context: RuleContext): boolean {
    const patterns = context.config.dynamicMethods?.patterns || [];
    
    for (const pattern of patterns) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(name)) {
        return true;
      }
    }

    return false;
  }

  private isExported(node: ts.Node): boolean {
    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      const modifiers = ts.getModifiers(node);
      return !!modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    }

    // Check if parent is exported
    let parent = node.parent;
    while (parent) {
      if (ts.isSourceFile(parent)) break;
      
      if (ts.isExportAssignment(parent) || ts.isExportDeclaration(parent)) {
        return true;
      }

      const modifiers = ts.canHaveModifiers(parent) ? ts.getModifiers(parent) : undefined;
      if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
        return true;
      }

      parent = parent.parent;
    }

    return false;
  }

  private isTestFunction(node: ts.Node, name: string): boolean {
    // Common test patterns
    const testPatterns = [
      /^test/i,
      /^it$/,
      /^describe$/,
      /^expect/i,
      /^should/i,
      /spec$/i,
      /\.test\./,
      /\.spec\./
    ];

    // Check function name
    if (testPatterns.some(pattern => pattern.test(name))) {
      return true;
    }

    // Check file name
    const fileName = node.getSourceFile().fileName;
    if (fileName.includes('.test.') || fileName.includes('.spec.')) {
      return true;
    }

    return false;
  }

  private isEventHandler(node: ts.Node, name: string): boolean {
    // Common event handler patterns
    const handlerPatterns = [
      /^on[A-Z]/,
      /^handle[A-Z]/,
      /Handler$/,
      /Listener$/,
      /Callback$/
    ];

    return handlerPatterns.some(pattern => pattern.test(name));
  }
}

// ============================================================================
// File: src/rules/imports/UnusedImportsRule.ts
// Unused Imports Detection
// ============================================================================

export class UnusedImportsRule extends Rule {
  readonly id = 'unused-imports';
  readonly name = 'Unused Imports';
  readonly description = 'Detects imports that are never used in the file';

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    if (ts.isImportDeclaration(node)) {
      issues.push(...this.checkImportDeclaration(node, context));
    }

    if (ts.isImportEqualsDeclaration(node)) {
      issues.push(...this.checkImportEquals(node, context));
    }

    return issues;
  }

  private checkImportDeclaration(node: ts.ImportDeclaration, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const importClause = node.importClause;

    if (!importClause) {
      // Side-effect import (import 'module')
      return issues;
    }

    const sourceFile = node.getSourceFile();

    // Check default import
    if (importClause.name) {
      const symbol = context.typeChecker.getSymbolAtLocation(importClause.name);
      if (symbol && !this.isSymbolUsed(symbol, sourceFile, context)) {
        issues.push(
          this.createIssue(
            importClause.name,
            `Unused import '${importClause.name.getText()}'`,
            { 
              type: 'default',
              name: importClause.name.getText(),
              module: (node.moduleSpecifier as ts.StringLiteral).text
            }
          )
        );
      }
    }

    // Check named imports
    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        for (const specifier of importClause.namedBindings.elements) {
          const symbol = context.typeChecker.getSymbolAtLocation(specifier.name);
          if (symbol && !this.isSymbolUsed(symbol, sourceFile, context)) {
            issues.push(
              this.createIssue(
                specifier,
                `Unused import '${specifier.name.getText()}'`,
                { 
                  type: 'named',
                  name: specifier.name.getText(),
                  module: (node.moduleSpecifier as ts.StringLiteral).text,
                  isTypeOnly: importClause.isTypeOnly || specifier.isTypeOnly
                }
              )
            );
          }
        }
      } else if (ts.isNamespaceImport(importClause.namedBindings)) {
        const symbol = context.typeChecker.getSymbolAtLocation(importClause.namedBindings.name);
        if (symbol && !this.isSymbolUsed(symbol, sourceFile, context)) {
          issues.push(
            this.createIssue(
              importClause.namedBindings.name,
              `Unused namespace import '${importClause.namedBindings.name.getText()}'`,
              { 
                type: 'namespace',
                name: importClause.namedBindings.name.getText(),
                module: (node.moduleSpecifier as ts.StringLiteral).text
              }
            )
          );
        }
      }
    }

    return issues;
  }

  private checkImportEquals(node: ts.ImportEqualsDeclaration, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const symbol = context.typeChecker.getSymbolAtLocation(node.name);

    if (symbol && !this.isSymbolUsed(symbol, node.getSourceFile(), context)) {
      issues.push(
        this.createIssue(
          node.name,
          `Unused import '${node.name.getText()}'`,
          { 
            type: 'import-equals',
            name: node.name.getText()
          }
        )
      );
    }

    return issues;
  }

  private isSymbolUsed(symbol: ts.Symbol, sourceFile: ts.SourceFile, context: RuleContext): boolean {
    let usageCount = 0;
    const declaration = symbol.valueDeclaration || symbol.declarations?.[0];

    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node !== declaration) {
        const nodeSymbol = context.typeChecker.getSymbolAtLocation(node);
        if (nodeSymbol === symbol) {
          // Check if this is not part of the import statement itself
          if (!this.isPartOfImport(node)) {
            usageCount++;
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return usageCount > 0;
  }

  private isPartOfImport(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent && !ts.isSourceFile(parent)) {
      if (ts.isImportDeclaration(parent) || 
          ts.isImportEqualsDeclaration(parent) ||
          ts.isImportSpecifier(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }
}

// ============================================================================
// File: src/rules/filesize/FileSizeRule.ts
// Excessive File Size Detection
// ============================================================================

export class FileSizeRule extends Rule {
  readonly id = 'file-size';
  readonly name = 'File Size';
  readonly description = 'Detects files that exceed size thresholds';

  private maxLines = 500;
  private maxCharacters = 20000;

  configure(config: any): void {
    super.configure(config);
    this.maxLines = config.maxLines || 500;
    this.maxCharacters = config.maxCharacters || 20000;
  }

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Only check at the source file level
    if (!ts.isSourceFile(node)) {
      return issues;
    }

    const text = node.getFullText();
    const lines = text.split('\n');
    const lineCount = lines.length;
    const charCount = text.length;

    if (lineCount > this.maxLines) {
      issues.push(
        this.createIssue(
          node,
          `File exceeds maximum line count: ${lineCount} lines (max: ${this.maxLines})`,
          { 
            type: 'lines',
            count: lineCount,
            threshold: this.maxLines,
            fileName: node.fileName
          }
        )
      );
    }

    if (charCount > this.maxCharacters) {
      issues.push(
        this.createIssue(
          node,
          `File exceeds maximum character count: ${charCount} characters (max: ${this.maxCharacters})`,
          { 
            type: 'characters',
            count: charCount,
            threshold: this.maxCharacters,
            fileName: node.fileName
          }
        )
      );
    }

    // Check for specific large constructs
    this.checkLargeClasses(node, issues);
    this.checkLargeFunctions(node, issues);

    return issues;
  }

  private checkLargeClasses(sourceFile: ts.SourceFile, issues: Issue[]): void {
    const maxClassLines = 300;

    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node)) {
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const lines = end.line - start.line + 1;

        if (lines > maxClassLines) {
          const className = node.name?.getText() || '<anonymous>';
          issues.push(
            this.createIssue(
              node,
              `Class '${className}' is too large: ${lines} lines (max: ${maxClassLines})`,
              { 
                type: 'large-class',
                className,
                lines,
                threshold: maxClassLines
              }
            )
          );
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private checkLargeFunctions(sourceFile: ts.SourceFile, issues: Issue[]): void {
    const maxFunctionLines = 50;

    const visit = (node: ts.Node): void => {
      if (ts.isFunctionDeclaration(node) || 
          ts.isMethodDeclaration(node) ||
          ts.isArrowFunction(node) ||
          ts.isFunctionExpression(node)) {
        
        const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const lines = end.line - start.line + 1;

        if (lines > maxFunctionLines) {
          const functionName = this.getFunctionName(node);
          issues.push(
            this.createIssue(
              node,
              `Function '${functionName}' is too large: ${lines} lines (max: ${maxFunctionLines})`,
              { 
                type: 'large-function',
                functionName,
                lines,
                threshold: maxFunctionLines
              }
            )
          );
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private getFunctionName(node: ts.Node): string {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      return node.name.getText();
    }
    
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.getText();
      }
      if (ts.isPropertyAssignment(parent)) {
        return parent.name.getText();
      }
    }

    return '<anonymous>';
  }
}

// ============================================================================
// File: src/rules/typescript/MissingTypesRule.ts
// TypeScript Type Annotation Detection
// ============================================================================

export class MissingTypesRule extends Rule {
  readonly id = 'missing-types';
  readonly name = 'Missing Type Annotations';
  readonly description = 'Detects missing TypeScript type annotations';

  private requireReturnType = true;
  private requireParameterType = true;
  private allowImplicitAny = false;

  configure(config: any): void {
    super.configure(config);
    this.requireReturnType = config.requireReturnType !== false;
    this.requireParameterType = config.requireParameterType !== false;
    this.allowImplicitAny = config.allowImplicitAny || false;
  }

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Skip if not a TypeScript file
    if (!node.getSourceFile().fileName.endsWith('.ts') && 
        !node.getSourceFile().fileName.endsWith('.tsx')) {
      return issues;
    }

    // Check function declarations
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      issues.push(...this.checkFunction(node, context));
    }

    // Check arrow functions and function expressions
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      issues.push(...this.checkFunction(node, context));
    }

    // Check variable declarations
    if (ts.isVariableDeclaration(node)) {
      issues.push(...this.checkVariableDeclaration(node, context));
    }

    // Check for explicit any usage
    if (!this.allowImplicitAny && ts.isTypeReferenceNode(node)) {
      issues.push(...this.checkExplicitAny(node));
    }

    return issues;
  }

  private checkFunction(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression,
    context: RuleContext
  ): Issue[] {
    const issues: Issue[] = [];
    const functionName = this.getFunctionName(node);

    // Check return type
    if (this.requireReturnType && !node.type) {
      // Check if it's a constructor or void function
      if (!ts.isConstructorDeclaration(node)) {
        const returnType = context.typeChecker.getSignatureFromDeclaration(node)?.getReturnType();
        const returnTypeString = context.typeChecker.typeToString(returnType!);

        if (returnTypeString === 'any') {
          issues.push(
            this.createIssue(
              node,
              `Function '${functionName}' is missing return type annotation`,
              { 
                type: 'missing-return-type',
                functionName,
                inferredType: returnTypeString
              }
            )
          );
        }
      }
    }

    // Check parameters
    if (this.requireParameterType) {
      for (const param of node.parameters) {
        if (!param.type && !param.initializer) {
          const paramName = param.name.getText();
          const paramType = context.typeChecker.getTypeAtLocation(param);
          const paramTypeString = context.typeChecker.typeToString(paramType);

          if (paramTypeString === 'any') {
            issues.push(
              this.createIssue(
                param,
                `Parameter '${paramName}' in function '${functionName}' is missing type annotation`,
                { 
                  type: 'missing-parameter-type',
                  functionName,
                  parameterName: paramName,
                  inferredType: paramTypeString
                }
              )
            );
          }
        }
      }
    }

    return issues;
  }

  private checkVariableDeclaration(
    node: ts.VariableDeclaration,
    context: RuleContext
  ): Issue[] {
    const issues: Issue[] = [];

    // Skip if it has a type annotation or initializer
    if (node.type || node.initializer) {
      return issues;
    }

    const variableName = node.name.getText();
    const variableType = context.typeChecker.getTypeAtLocation(node);
    const typeString = context.typeChecker.typeToString(variableType);

    if (typeString === 'any') {
      issues.push(
        this.createIssue(
          node,
          `Variable '${variableName}' is missing type annotation`,
          { 
            type: 'missing-variable-type',
            variableName,
            inferredType: typeString
          }
        )
      );
    }

    return issues;
  }

  private checkExplicitAny(node: ts.TypeReferenceNode): Issue[] {
    const issues: Issue[] = [];

    if (node.typeName.getText() === 'any') {
      issues.push(
        this.createIssue(
          node,
          'Explicit use of "any" type',
          { 
            type: 'explicit-any'
          }
        )
      );
    }

    return issues;
  }

  private getFunctionName(node: ts.Node): string {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      return node.name.getText();
    }
    
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
        return parent.name.getText();
      }
      if (ts.isPropertyAssignment(parent)) {
        return parent.name.getText();
      }
    }

    return '<anonymous>';
  }
}

// ============================================================================
// File: src/rules/dependencies/CircularDependencyRule.ts
// Circular Dependency Detection
// ============================================================================

export class CircularDependencyRule extends Rule {
  readonly id = 'circular-dependency';
  readonly name = 'Circular Dependencies';
  readonly description = 'Detects circular dependencies between modules';

  private fileImports = new Map<string, Set<string>>();
  private visited = new Set<string>();
  private recursionStack = new Set<string>();
  private cycles: string[][] = [];

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Build import graph on source file level
    if (ts.isSourceFile(node)) {
      this.buildImportGraph(node);
      
      // Detect cycles once per project
      if (this.fileImports.size > 0 && this.cycles.length === 0) {
        this.detectCycles();
        
        // Report cycles
        for (const cycle of this.cycles) {
          if (cycle.includes(node.fileName)) {
            issues.push(
              this.createIssue(
                node,
                `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
                { 
                  type: 'circular-dependency',
                  cycle,
                  fileName: node.fileName
                }
              )
            );
          }
        }
      }
    }

    return issues;
  }

  private buildImportGraph(sourceFile: ts.SourceFile): void {
    const imports = new Set<string>();

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const resolvedPath = this.resolveImportPath(sourceFile.fileName, moduleSpecifier.text);
        
        if (resolvedPath && !this.isExternalModule(moduleSpecifier.text)) {
          imports.add(resolvedPath);
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const moduleSpecifier = node.moduleSpecifier as ts.StringLiteral;
        const resolvedPath = this.resolveImportPath(sourceFile.fileName, moduleSpecifier.text);
        
        if (resolvedPath && !this.isExternalModule(moduleSpecifier.text)) {
          imports.add(resolvedPath);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    this.fileImports.set(sourceFile.fileName, imports);
  }

  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      let resolved = path.resolve(dir, importPath);
      
      // Try common extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      
      if (fs.existsSync(resolved)) {
        return resolved;
      }
      
      for (const ext of extensions) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }
    }

    // Could implement more complex module resolution here
    return null;
  }

  private isExternalModule(importPath: string): boolean {
    // External modules don't start with '.' or '/'
    return !importPath.startsWith('.') && !importPath.startsWith('/');
  }

  private detectCycles(): void {
    this.visited.clear();
    this.recursionStack.clear();
    this.cycles = [];

    for (const file of this.fileImports.keys()) {
      if (!this.visited.has(file)) {
        const path: string[] = [];
        this.detectCyclesUtil(file, path);
      }
    }
  }

  private detectCyclesUtil(file: string, path: string[]): void {
    this.visited.add(file);
    this.recursionStack.add(file);
    path.push(file);

    const imports = this.fileImports.get(file) || new Set();
    
    for (const importedFile of imports) {
      if (!this.visited.has(importedFile)) {
        this.detectCyclesUtil(importedFile, [...path]);
      } else if (this.recursionStack.has(importedFile)) {
        // Found a cycle
        const cycleStart = path.indexOf(importedFile);
        const cycle = path.slice(cycleStart);
        
        // Only add unique cycles
        if (!this.isCycleRecorded(cycle)) {
          this.cycles.push(cycle);
        }
      }
    }

    this.recursionStack.delete(file);
  }

  private isCycleRecorded(cycle: string[]): boolean {
    for (const recorded of this.cycles) {
      if (this.areCyclesEqual(cycle, recorded)) {
        return true;
      }
    }
    return false;
  }

  private areCyclesEqual(cycle1: string[], cycle2: string[]): boolean {
    if (cycle1.length !== cycle2.length) return false;
    
    // Cycles are equal if one is a rotation of the other
    const str1 = cycle1.join('|');
    const str2 = cycle2.join('|') + '|' + cycle2.join('|');
    
    return str2.includes(str1);
  }
}

// ============================================================================
// File: src/rules/deprecated/DeprecatedAPIRule.ts
// Deprecated API Usage Detection
// ============================================================================

export class DeprecatedAPIRule extends Rule {
  readonly id = 'deprecated-api';
  readonly name = 'Deprecated API Usage';
  readonly description = 'Detects usage of deprecated APIs';

  private deprecatedAPIs = new Map<string, string>([
    // Node.js deprecated APIs
    ['Buffer', 'Use Buffer.alloc() or Buffer.from() instead'],
    ['require.extensions', 'Deprecated in Node.js'],
    ['process.binding', 'Deprecated internal API'],
    ['crypto.createCredentials', 'Use tls.createSecureContext() instead'],
    ['domain', 'Domain module is deprecated'],
    
    // React deprecated APIs
    ['componentWillMount', 'Use componentDidMount() or constructor instead'],
    ['componentWillReceiveProps', 'Use getDerivedStateFromProps() instead'],
    ['componentWillUpdate', 'Use componentDidUpdate() instead'],
    
    // Common library deprecations
    ['moment', 'Consider using date-fns or Luxon instead'],
    ['findDOMNode', 'Use ref callbacks instead'],
    ['ReactDOM.render', 'Use ReactDOM.createRoot() in React 18+'],
  ]);

  check(node: ts.Node, context: RuleContext): Issue[] {
    const issues: Issue[] = [];

    // Check for deprecated decorators
    if (ts.canHaveDecorators(node)) {
      issues.push(...this.checkDeprecatedDecorators(node));
    }

    // Check for deprecated method calls
    if (ts.isCallExpression(node)) {
      issues.push(...this.checkDeprecatedCalls(node, context));
    }

    // Check for deprecated property access
    if (ts.isPropertyAccessExpression(node)) {
      issues.push(...this.checkDeprecatedProperties(node, context));
    }

    // Check JSDoc for @deprecated usage
    issues.push(...this.checkOwnDeprecated(node));

    return issues;
  }

  private checkDeprecatedDecorators(node: ts.Node): Issue[] {
    const issues: Issue[] = [];
    const decorators = ts.getDecorators(node);

    if (decorators) {
      for (const decorator of decorators) {
        const decoratorName = decorator.expression.getText();
        
        // Check if using deprecated decorators
        if (this.deprecatedAPIs.has(decoratorName)) {
          issues.push(
            this.createIssue(
              decorator,
              `Using deprecated decorator '${decoratorName}': ${this.deprecatedAPIs.get(decoratorName)}`,
              { 
                type: 'deprecated-decorator',
                api: decoratorName,
                suggestion: this.deprecatedAPIs.get(decoratorName)
              }
            )
          );
        }
      }
    }

    return issues;
  }

  private checkDeprecatedCalls(node: ts.CallExpression, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const expression = node.expression;

    if (ts.isPropertyAccessExpression(expression)) {
      const methodName = expression.name.getText();
      const objectName = expression.expression.getText();
      const fullName = `${objectName}.${methodName}`;

      // Check for deprecated method calls
      if (this.deprecatedAPIs.has(methodName)) {
        issues.push(
          this.createIssue(
            node,
            `Using deprecated method '${methodName}': ${this.deprecatedAPIs.get(methodName)}`,
            { 
              type: 'deprecated-method',
              api: methodName,
              suggestion: this.deprecatedAPIs.get(methodName)
            }
          )
        );
      }

      if (this.deprecatedAPIs.has(fullName)) {
        issues.push(
          this.createIssue(
            node,
            `Using deprecated API '${fullName}': ${this.deprecatedAPIs.get(fullName)}`,
            { 
              type: 'deprecated-api',
              api: fullName,
              suggestion: this.deprecatedAPIs.get(fullName)
            }
          )
        );
      }
    }

    // Check for deprecated global functions
    if (ts.isIdentifier(expression)) {
      const functionName = expression.getText();
      
      if (this.deprecatedAPIs.has(functionName)) {
        issues.push(
          this.createIssue(
            node,
            `Using deprecated function '${functionName}': ${this.deprecatedAPIs.get(functionName)}`,
            { 
              type: 'deprecated-function',
              api: functionName,
              suggestion: this.deprecatedAPIs.get(functionName)
            }
          )
        );
      }
    }

    return issues;
  }

  private checkDeprecatedProperties(node: ts.PropertyAccessExpression, context: RuleContext): Issue[] {
    const issues: Issue[] = [];
    const propertyName = node.name.getText();
    const objectName = node.expression.getText();
    const fullName = `${objectName}.${propertyName}`;

    if (this.deprecatedAPIs.has(fullName)) {
      issues.push(
        this.createIssue(
          node,
          `Using deprecated property '${fullName}': ${this.deprecatedAPIs.get(fullName)}`,
          { 
            type: 'deprecated-property',
            api: fullName,
            suggestion: this.deprecatedAPIs.get(fullName)
          }
        )
      );
    }

    return issues;
  }

  private checkOwnDeprecated(node: ts.Node): Issue[] {
    const issues: Issue[] = [];

    // Check if the current node has @deprecated JSDoc
    const jsDocTags = ts.getJSDocTags(node);
    const hasDeprecated = jsDocTags.some(tag => tag.tagName.getText() === 'deprecated');

    if (hasDeprecated && this.isBeingUsed(node)) {
      const name = this.getNodeName(node);
      const deprecatedMessage = this.getDeprecatedMessage(jsDocTags);

      issues.push(
        this.createIssue(
          node,
          `Using deprecated ${this.getNodeType(node)} '${name}'${deprecatedMessage ? ': ' + deprecatedMessage : ''}`,
          { 
            type: 'own-deprecated',
            name,
            message: deprecatedMessage
          }
        )
      );
    }

    return issues;
  }

  private isBeingUsed(node: ts.Node): boolean {
    // This is a simplified check - in reality, you'd use the call graph
    // to determine if a deprecated item is being used elsewhere
    return false; // Placeholder
  }

  private getNodeName(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node) || 
        ts.isMethodDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node)) {
      return node.name?.getText() || '<anonymous>';
    }

    if (ts.isVariableDeclaration(node)) {
      return node.name.getText();
    }

    return '<unknown>';
  }

  private getNodeType(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node)) return 'function';
    if (ts.isMethodDeclaration(node)) return 'method';
    if (ts.isClassDeclaration(node)) return 'class';
    if (ts.isInterfaceDeclaration(node)) return 'interface';
    if (ts.isVariableDeclaration(node)) return 'variable';
    return 'symbol';
  }

  private getDeprecatedMessage(tags: readonly ts.JSDocTag[]): string | null {
    const deprecatedTag = tags.find(tag => tag.tagName.getText() === 'deprecated');
    if (deprecatedTag && deprecatedTag.comment) {
      if (typeof deprecatedTag.comment === 'string') {
        return deprecatedTag.comment;
      }
      return deprecatedTag.comment.map(c => 
        typeof c === 'string' ? c : c.text
      ).join('');
    }
    return null;
  }
}

// ============================================================================
// Exported Rules Collection
// ============================================================================

export const BUILT_IN_RULES = [
  ComplexityRule,
  DeadCodeRule,
  UnusedImportsRule,
  FileSizeRule,
  MissingTypesRule,
  CircularDependencyRule,
  DeprecatedAPIRule
];

export function createRuleInstance(ruleId: string): Rule | null {
  const RuleClass = BUILT_IN_RULES.find(r => new r().id === ruleId);
  return RuleClass ? new RuleClass() : null;
}