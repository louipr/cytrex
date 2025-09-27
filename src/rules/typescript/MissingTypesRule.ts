// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.519Z
// ============================================================================

// TypeScript Type Annotation Detection

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

