// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.517Z
// ============================================================================

// Cyclomatic and Cognitive Complexity Detection

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

