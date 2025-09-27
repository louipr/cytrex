// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.519Z
// ============================================================================

// Excessive File Size Detection

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

