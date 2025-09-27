// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/cli_and_tests.md
// Generated on: 2025-09-27T09:28:40.521Z
// ============================================================================

// Call Graph Builder Tests

import { CallGraphBuilder, CallGraph } from '../../src/core/callgraph/CallGraphBuilder';
import { TypeScriptParser } from '../../src/core/parser/TypeScriptParser';
import * as path from 'path';

describe('CallGraphBuilder', () => {
  let parser: TypeScriptParser;
  const fixturesPath = path.join(__dirname, '../fixtures');

  beforeEach(() => {
    parser = new TypeScriptParser();
  });

  describe('build', () => {
    it('should build call graph from entry points', async () => {
      const projectPath = path.join(fixturesPath, 'call-graph-test');
      const ast = await parser.parseProject(projectPath);

      const builder = new CallGraphBuilder(
        ast.program,
        ast.typeChecker,
        ['src/index.ts'],
        { patterns: [], decorators: [], keepAlive: [] }
      );

      const callGraph = builder.build();

      expect(callGraph).toBeDefined();
      expect(callGraph.nodeCount()).toBeGreaterThan(0);
      expect(callGraph.entryPoints.size).toBeGreaterThan(0);
    });

    it('should identify unreachable functions', async () => {
      const projectPath = path.join(fixturesPath, 'dead-code-test');
      const ast = await parser.parseProject(projectPath);

      const builder = new CallGraphBuilder(
        ast.program,
        ast.typeChecker,
        ['src/main.ts'],
        { patterns: [], decorators: [], keepAlive: [] }
      );

      const callGraph = builder.build();
      const unreachable = callGraph.findUnreachableNodes();

      expect(unreachable.size).toBeGreaterThan(0);
    });

    it('should handle dynamic method patterns', async () => {
      const projectPath = path.join(fixturesPath, 'dynamic-methods-test');
      const ast = await parser.parseProject(projectPath);

      const builder = new CallGraphBuilder(
        ast.program,
        ast.typeChecker,
        ['src/app.ts'],
        {
          patterns: ['*Handler', '*Controller'],
          decorators: ['@Route', '@EventHandler'],
          keepAlive: ['handleRequest']
        }
      );

      const callGraph = builder.build();
      const reachable = callGraph.findReachableNodes();

      // Check that dynamic methods are marked as reachable
      const handlerNodes = Array.from(callGraph.getAllNodes()).filter(
        node => node.name.endsWith('Handler')
      );

      handlerNodes.forEach(node => {
        expect(reachable.has(node.id)).toBe(true);
      });
    });

    it('should track method calls', async () => {
      const projectPath = path.join(fixturesPath, 'methods-test');
      const ast = await parser.parseProject(projectPath);

      const builder = new CallGraphBuilder(
        ast.program,
        ast.typeChecker,
        ['src/class.ts'],
        { patterns: [], decorators: [], keepAlive: [] }
      );

      const callGraph = builder.build();
      
      // Find method nodes
      const methodNodes = callGraph.getAllNodes().filter(
        node => node.type === 'method'
      );

      expect(methodNodes.length).toBeGreaterThan(0);
    });

    it('should handle async functions', async () => {
      const projectPath = path.join(fixturesPath, 'async-test');
      const ast = await parser.parseProject(projectPath);

      const builder = new CallGraphBuilder(
        ast.program,
        ast.typeChecker,
        ['src/async.ts'],
        { patterns: [], decorators: [], keepAlive: [] }
      );

      const callGraph = builder.build();
      const asyncNodes = callGraph.getAllNodes().filter(
        node => node.isAsync === true
      );

      expect(asyncNodes.length).toBeGreaterThan(0);
    });

    it('should calculate complexity', async () => {
      const projectPath = path.join(fixturesPath, 'complexity-test');
      const ast = await parser.parseProject(projectPath);

      const builder = new CallGraphBuilder(
        ast.program,
        ast.typeChecker,
        ['src/complex.ts'],
        { patterns: [], decorators: [], keepAlive: [] }
      );

      const callGraph = builder.build();
      const complexNodes = callGraph.getAllNodes().filter(
        node => node.complexity && node.complexity > 5
      );

      expect(complexNodes.length).toBeGreaterThan(0);
    });
  });

  describe('CallGraph', () => {
    it('should correctly identify reachable nodes', () => {
      const graph = new CallGraph(['entry']);
      
      graph.addNode({ id: 'entry', name: 'main', file: 'main.ts', line: 1, type: 'function' });
      graph.addNode({ id: 'func1', name: 'func1', file: 'main.ts', line: 10, type: 'function' });
      graph.addNode({ id: 'func2', name: 'func2', file: 'main.ts', line: 20, type: 'function' });
      graph.addNode({ id: 'orphan', name: 'orphan', file: 'main.ts', line: 30, type: 'function' });

      graph.addEdge('entry', 'func1');
      graph.addEdge('func1', 'func2');

      const reachable = graph.findReachableNodes();

      expect(reachable.has('entry')).toBe(true);
      expect(reachable.has('func1')).toBe(true);
      expect(reachable.has('func2')).toBe(true);
      expect(reachable.has('orphan')).toBe(false);
    });

    it('should correctly identify unreachable nodes', () => {
      const graph = new CallGraph(['entry']);
      
      graph.addNode({ id: 'entry', name: 'main', file: 'main.ts', line: 1, type: 'function' });
      graph.addNode({ id: 'used', name: 'used', file: 'main.ts', line: 10, type: 'function' });
      graph.addNode({ id: 'unused', name: 'unused', file: 'main.ts', line: 20, type: 'function' });

      graph.addEdge('entry', 'used');

      const unreachable = graph.findUnreachableNodes();

      expect(unreachable.has('unused')).toBe(true);
      expect(unreachable.has('entry')).toBe(false);
      expect(unreachable.has('used')).toBe(false);
    });

    it('should handle circular references', () => {
      const graph = new CallGraph(['entry']);
      
      graph.addNode({ id: 'entry', name: 'main', file: 'main.ts', line: 1, type: 'function' });
      graph.addNode({ id: 'func1', name: 'func1', file: 'main.ts', line: 10, type: 'function' });
      graph.addNode({ id: 'func2', name: 'func2', file: 'main.ts', line: 20, type: 'function' });

      graph.addEdge('entry', 'func1');
      graph.addEdge('func1', 'func2');
      graph.addEdge('func2', 'func1'); // Circular reference

      const reachable = graph.findReachableNodes();

      expect(reachable.has('entry')).toBe(true);
      expect(reachable.has('func1')).toBe(true);
      expect(reachable.has('func2')).toBe(true);
    });

    it('should serialize to JSON correctly', () => {
      const graph = new CallGraph(['entry']);
      
      graph.addNode({ id: 'entry', name: 'main', file: 'main.ts', line: 1, type: 'function' });
      graph.addNode({ id: 'func1', name: 'func1', file: 'main.ts', line: 10, type: 'function' });
      
      graph.addEdge('entry', 'func1');

      const json = graph.toJSON();

      expect(json.nodes.length).toBe(2);
      expect(json.edges.length).toBe(1);
      expect(json.entryPoints).toEqual(['entry']);
      expect(json.unreachable.length).toBe(0);
    });
  });
});

