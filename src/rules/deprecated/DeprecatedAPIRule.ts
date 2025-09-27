// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.520Z
// ============================================================================

// Deprecated API Usage Detection

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

// Exported Rules Collection

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
