// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.519Z
// ============================================================================

// Comprehensive Dead Code Detection

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

