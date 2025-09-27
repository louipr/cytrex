// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/builtin_rules_implementation.md
// Generated on: 2025-09-27T09:28:40.519Z
// ============================================================================

// Unused Imports Detection

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

