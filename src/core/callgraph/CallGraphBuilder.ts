// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/complete_implementation.md
// Generated on: 2025-09-27T09:28:40.523Z
// ============================================================================

// Call graph construction with dynamic method handling

export class CallGraph {
  private nodes = new Map<string, CallNode>();
  private edges = new Map<string, Set<string>>();
  private reverseEdges = new Map<string, Set<string>>();
  public entryPoints: Set<string>;

  constructor(entryPoints: string[]) {
    this.entryPoints = new Set(entryPoints);
  }

  addNode(node: CallNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, new Set());
    }
    if (!this.reverseEdges.has(node.id)) {
      this.reverseEdges.set(node.id, new Set());
    }
  }

  addEdge(fromId: string, toId: string): void {
    if (!this.edges.has(fromId)) {
      this.edges.set(fromId, new Set());
    }
    this.edges.get(fromId)!.add(toId);

    if (!this.reverseEdges.has(toId)) {
      this.reverseEdges.set(toId, new Set());
    }
    this.reverseEdges.get(toId)!.add(fromId);
  }

  findReachableNodes(): Set<string> {
    const visited = new Set<string>();
    const queue = [...this.entryPoints];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const edges = this.edges.get(nodeId);
      if (edges) {
        for (const targetId of edges) {
          if (!visited.has(targetId)) {
            queue.push(targetId);
          }
        }
      }
    }

    return visited;
  }

  findUnreachableNodes(): Set<string> {
    const reachable = this.findReachableNodes();
    const unreachable = new Set<string>();

    for (const nodeId of this.nodes.keys()) {
      if (!reachable.has(nodeId)) {
        unreachable.add(nodeId);
      }
    }

    return unreachable;
  }

  isReachable(nodeId: string): boolean {
    const reachable = this.findReachableNodes();
    return reachable.has(nodeId);
  }

  getNode(id: string): CallNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): CallNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): Edge[] {
    const edges: Edge[] = [];
    for (const [from, targets] of this.edges.entries()) {
      for (const to of targets) {
        edges.push({ from, to });
      }
    }
    return edges;
  }

  getCallersOf(nodeId: string): Set<string> {
    return this.reverseEdges.get(nodeId) || new Set();
  }

  getCalleesOf(nodeId: string): Set<string> {
    return this.edges.get(nodeId) || new Set();
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    let count = 0;
    for (const targets of this.edges.values()) {
      count += targets.size;
    }
    return count;
  }

  toJSON(): CallGraphData {
    return {
      nodes: this.getAllNodes(),
      edges: this.getAllEdges(),
      entryPoints: Array.from(this.entryPoints),
      unreachable: Array.from(this.findUnreachableNodes())
    };
  }
}

export class CallGraphBuilder {
  private logger = Logger.getInstance();
  private callGraph: CallGraph;
  private functionMap = new Map<ts.Node, string>();
  private idCounter = 0;
  private processedFiles = new Set<string>();

  constructor(
    private program: ts.Program,
    private typeChecker: ts.TypeChecker,
    private entryPoints: string[],
    private dynamicConfig: DynamicMethodConfig
  ) {
    this.callGraph = new CallGraph(this.resolveEntryPoints());
  }

  build(): CallGraph {
    this.logger.info('Building call graph...');
    const startTime = Date.now();

    try {
      // Phase 1: Identify all functions/methods
      for (const sourceFile of this.program.getSourceFiles()) {
        if (this.shouldProcessFile(sourceFile)) {
          this.identifyFunctions(sourceFile);
        }
      }

      // Phase 2: Build call relationships
      for (const sourceFile of this.program.getSourceFiles()) {
        if (this.shouldProcessFile(sourceFile)) {
          this.buildCallRelationships(sourceFile);
        }
      }

      // Phase 3: Mark dynamic keep-alive methods
      this.markDynamicMethods();

      const duration = Date.now() - startTime;
      this.logger.info(
        `Call graph built: ${this.callGraph.nodeCount()} nodes, ` +
        `${this.callGraph.edgeCount()} edges, ${duration}ms`
      );

      return this.callGraph;

    } catch (error) {
      this.logger.error('Failed to build call graph', error as Error);
      throw error;
    }
  }

  private identifyFunctions(sourceFile: ts.SourceFile): void {
    const fileName = sourceFile.fileName;
    
    if (this.processedFiles.has(fileName)) return;
    this.processedFiles.add(fileName);

    const visit = (node: ts.Node): void => {
      if (this.isFunctionNode(node)) {
        const callNode = this.createCallNode(node);
        this.callGraph.addNode(callNode);
        this.functionMap.set(node, callNode.id);

        // Check if this is an entry point
        if (this.isEntryPoint(node, callNode)) {
          this.callGraph.entryPoints.add(callNode.id);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private buildCallRelationships(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        this.processCallExpression(node);
      } else if (ts.isNewExpression(node)) {
        this.processNewExpression(node);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private processCallExpression(node: ts.CallExpression): void {
    const caller = this.findContainingFunction(node);
    if (!caller) return;

    const symbol = this.typeChecker.getSymbolAtLocation(node.expression);
    
    if (symbol) {
      const declaration = this.findDeclaration(symbol);
      if (declaration && this.functionMap.has(declaration)) {
        const targetId = this.functionMap.get(declaration)!;
        this.callGraph.addEdge(caller, targetId);
      }
    } else {
      // Handle dynamic calls
      this.processDynamicCall(node, caller);
    }

    // Handle method calls
    if (ts.isPropertyAccessExpression(node.expression)) {
      this.processMethodCall(node, caller);
    }
  }

  private processNewExpression(node: ts.NewExpression): void {
    const caller = this.findContainingFunction(node);
    if (!caller) return;

    const symbol = this.typeChecker.getSymbolAtLocation(node.expression);
    
    if (symbol) {
      // Find constructor
      const constructorSymbol = this.typeChecker.getTypeOfSymbolAtLocation(
        symbol,
        node
      ).getConstructSignatures()[0]?.getDeclaration();

      if (constructorSymbol && this.functionMap.has(constructorSymbol)) {
        const targetId = this.functionMap.get(constructorSymbol)!;
        this.callGraph.addEdge(caller, targetId);
      }
    }
  }

  private processMethodCall(node: ts.CallExpression, caller: string): void {
    const propertyAccess = node.expression as ts.PropertyAccessExpression;
    const methodName = propertyAccess.name.getText();

    // Check if matches dynamic patterns
    for (const pattern of this.dynamicConfig.patterns) {
      if (this.matchesPattern(methodName, pattern)) {
        const dynamicNode: CallNode = {
          id: `dynamic:${methodName}:${this.idCounter++}`,
          name: methodName,
          file: 'dynamic',
          line: 0,
          type: 'dynamic',
          isDynamic: true
        };
        
        this.callGraph.addNode(dynamicNode);
        this.callGraph.addEdge(caller, dynamicNode.id);
        return;
      }
    }
  }

  private processDynamicCall(node: ts.CallExpression, callerId: string): void {
    const text = node.expression.getText();
    
    // Create virtual node for unresolved calls
    const dynamicNode: CallNode = {
      id: `dynamic:${text}:${this.idCounter++}`,
      name: text,
      file: node.getSourceFile().fileName,
      line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1,
      type: 'dynamic',
      isDynamic: true
    };
    
    this.callGraph.addNode(dynamicNode);
    this.callGraph.addEdge(callerId, dynamicNode.id);
  }

  private markDynamicMethods(): void {
    // Mark keep-alive methods as entry points
    if (this.dynamicConfig.keepAlive) {
      for (const pattern of this.dynamicConfig.keepAlive) {
        for (const [, nodeId] of this.functionMap) {
          const node = this.callGraph.getNode(nodeId);
          if (node && this.matchesPattern(node.name, pattern)) {
            this.callGraph.entryPoints.add(nodeId);
          }
        }
      }
    }

    // Mark decorator-based methods as entry points
    for (const [tsNode, nodeId] of this.functionMap) {
      if (this.hasDecoratorMatch(tsNode)) {
        this.callGraph.entryPoints.add(nodeId);
      }
    }
  }

  private hasDecoratorMatch(node: ts.Node): boolean {
    if (!ts.canHaveDecorators(node)) return false;

    const decorators = ts.getDecorators(node);
    if (!decorators) return false;

    for (const decorator of decorators) {
      const expression = decorator.expression;
      const decoratorName = ts.isCallExpression(expression)
        ? expression.expression.getText()
        : expression.getText();

      for (const pattern of this.dynamicConfig.decorators) {
        if (decoratorName.includes(pattern.replace('@', ''))) {
          return true;
        }
      }
    }

    return false;
  }

  private createCallNode(node: ts.Node): CallNode {
    const sourceFile = node.getSourceFile();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    
    let name = 'anonymous';
    let type: CallNode['type'] = 'function';
    let isAsync = false;
    let isExported = false;

    if (ts.isFunctionDeclaration(node)) {
      name = node.name?.getText() || 'anonymous';
      type = 'function';
      isAsync = !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
      isExported = !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    } else if (ts.isMethodDeclaration(node)) {
      name = node.name?.getText() || 'anonymous';
      type = 'method';
      isAsync = !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
    } else if (ts.isConstructorDeclaration(node)) {
      name = 'constructor';
      type = 'constructor';
    } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      type = 'arrow';
      isAsync = !!node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
      
      // Try to get name from parent
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent)) {
        name = parent.name.getText();
        
        // Check if exported
        const varStatement = parent.parent.parent;
        if (ts.isVariableStatement(varStatement)) {
          isExported = !!varStatement.modifiers?.some(
            m => m.kind === ts.SyntaxKind.ExportKeyword
          );
        }
      } else if (ts.isPropertyAssignment(parent)) {
        name = parent.name.getText();
      }
    }

    const id = `${sourceFile.fileName}:${name}:${line}:${character}`;

    return {
      id,
      name,
      file: sourceFile.fileName,
      line: line + 1,
      type,
      isAsync,
      isExported,
      isDynamic: false,
      complexity: this.calculateComplexity(node)
    };
  }

  private calculateComplexity(node: ts.Node): number {
    let complexity = 1;

    const visit = (n: ts.Node): void => {
      if (ts.isIfStatement(n) ||
          ts.isConditionalExpression(n) ||
          ts.isCaseClause(n) ||
          ts.isWhileStatement(n) ||
          ts.isForStatement(n) ||
          ts.isForInStatement(n) ||
          ts.isForOfStatement(n) ||
          ts.isDoStatement(n) ||
          ts.isCatchClause(n)) {
        complexity++;
      }

      if (ts.isBinaryExpression(n)) {
        const operator = n.operatorToken.kind;
        if (operator === ts.SyntaxKind.AmpersandAmpersandToken ||
            operator === ts.SyntaxKind.BarBarToken ||
            operator === ts.SyntaxKind.QuestionQuestionToken) {
          complexity++;
        }
      }

      ts.forEachChild(n, visit);
    };

    ts.forEachChild(node, visit);
    return complexity;
  }

  private findContainingFunction(node: ts.Node): string | null {
    let current: ts.Node | undefined = node.parent;

    while (current) {
      if (this.functionMap.has(current)) {
        return this.functionMap.get(current)!;
      }
      current = current.parent;
    }

    // If no containing function, might be top-level code
    const sourceFile = node.getSourceFile();
    const topLevelId = `${sourceFile.fileName}:<top-level>:0:0`;
    
    if (!this.callGraph.getNode(topLevelId)) {
      this.callGraph.addNode({
        id: topLevelId,
        name: '<top-level>',
        file: sourceFile.fileName,
        line: 0,
        type: 'function',
        isExported: true
      });
      this.callGraph.entryPoints.add(topLevelId);
    }

    return topLevelId;
  }

  private isFunctionNode(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) ||
           ts.isMethodDeclaration(node) ||
           ts.isConstructorDeclaration(node) ||
           ts.isArrowFunction(node) ||
           ts.isFunctionExpression(node) ||
           ts.isGetAccessorDeclaration(node) ||
           ts.isSetAccessorDeclaration(node);
  }

  private findDeclaration(symbol: ts.Symbol): ts.Node | undefined {
    if (symbol.valueDeclaration) {
      return symbol.valueDeclaration;
    }

    const declarations = symbol.getDeclarations();
    if (declarations && declarations.length > 0) {
      return declarations[0];
    }

    return undefined;
  }

  private shouldProcessFile(sourceFile: ts.SourceFile): boolean {
    if (sourceFile.isDeclarationFile) return false;
    if (sourceFile.fileName.includes('node_modules')) return false;
    return true;
  }

  private isEntryPoint(node: ts.Node, callNode: CallNode): boolean {
    // Check if matches any entry point pattern
    for (const pattern of this.entryPoints) {
      if (callNode.file.includes(pattern)) {
        // Check if it's exported or at top level
        if (callNode.isExported) {
          return true;
        }
        
        // Check if it's the default export
        if (this.isDefaultExport(node)) {
          return true;
        }
      }
    }

    return false;
  }

  private isDefaultExport(node: ts.Node): boolean {
    let current: ts.Node | undefined = node.parent;
    
    while (current) {
      if (ts.isExportAssignment(current)) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  private resolveEntryPoints(): string[] {
    const resolved: string[] = [];

    for (const pattern of this.entryPoints) {
      // Convert glob patterns to actual file paths
      const fullPath = path.resolve(pattern);
      resolved.push(fullPath);

      // Also try common variations
      if (!path.extname(fullPath)) {
        resolved.push(fullPath + '.ts');
        resolved.push(fullPath + '.tsx');
        resolved.push(fullPath + '.js');
        resolved.push(fullPath + '.jsx');
      }
    }

    return resolved;
  }

  private matchesPattern(text: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(text);
  }
}

