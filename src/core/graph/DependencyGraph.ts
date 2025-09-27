import * as path from 'path';
import { IDependencyGraph, DependencyNode, DependencyType } from '../../types';

/**
 * Unified Dependency Graph - Single source of truth for project dependencies
 * 
 * Based on redesign architecture improvements:
 * - Single place for all dependency tracking
 * - BFS reachability analysis from entry points  
 * - Confidence scoring based on import patterns
 * - Circular dependency detection
 * - Entry point management including CLI patterns
 */
export class DependencyGraph implements IDependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  private edges = new Map<string, Set<string>>();
  private reverseEdges = new Map<string, Set<string>>(); // For efficient reverse lookups
  private entryPoints = new Set<string>();

  addDependency(from: string, to: string, type: DependencyType): void {
    // Normalize paths to ensure consistency
    const normalizedFrom = path.resolve(from);
    const normalizedTo = path.resolve(to);

    // Initialize nodes if they don't exist
    if (!this.nodes.has(normalizedFrom)) {
      this.nodes.set(normalizedFrom, this.createNode(normalizedFrom));
    }
    if (!this.nodes.has(normalizedTo)) {
      this.nodes.set(normalizedTo, this.createNode(normalizedTo));
    }

    // Add forward edge
    if (!this.edges.has(normalizedFrom)) {
      this.edges.set(normalizedFrom, new Set());
    }
    this.edges.get(normalizedFrom)!.add(normalizedTo);

    // Add reverse edge for efficient lookups
    if (!this.reverseEdges.has(normalizedTo)) {
      this.reverseEdges.set(normalizedTo, new Set());
    }
    this.reverseEdges.get(normalizedTo)!.add(normalizedFrom);

    // Update metadata for confidence scoring
    const toNode = this.nodes.get(normalizedTo)!;
    toNode.importCount++;
    toNode.lastImportType = type;

    // Boost confidence for type-only imports (less likely to be dead)
    if (type === DependencyType.TYPE_IMPORT) {
      toNode.confidence = Math.min(toNode.confidence + 10, 100);
    }
  }

  addFile(filePath: string): void {
    const normalizedPath = path.resolve(filePath);
    
    // Add file as a node if it doesn't exist
    if (!this.nodes.has(normalizedPath)) {
      this.nodes.set(normalizedPath, this.createNode(normalizedPath));
    }
  }

  addEntryPoint(filePath: string): void {
    const normalizedPath = path.resolve(filePath);
    this.entryPoints.add(normalizedPath);

    // Ensure entry point exists as a node
    if (!this.nodes.has(normalizedPath)) {
      this.nodes.set(normalizedPath, this.createNode(normalizedPath, true));
    }
  }  findReachable(): Set<string> {
    const visited = new Set<string>();
    const queue = Array.from(this.entryPoints);

    // BFS from all entry points - key algorithm from redesign
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // Add all dependencies to queue
      const dependencies = this.edges.get(current);
      if (dependencies) {
        dependencies.forEach(dep => {
          if (!visited.has(dep)) {
            queue.push(dep);
          }
        });
      }
    }

    return visited;
  }

  getAllFiles(): string[] {
    return Array.from(this.nodes.keys());
  }

  getNode(filePath: string): DependencyNode | undefined {
    const normalized = path.resolve(filePath);
    return this.nodes.get(normalized);
  }

  getCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    this.nodes.forEach((_, node) => {
      if (!visited.has(node)) {
        this.detectCyclesFromNode(node, visited, recursionStack, pathStack, cycles);
      }
    });

    return cycles;
  }

  /**
   * Get files that depend on the given file (reverse dependencies)
   */
  getDependents(filePath: string): string[] {
    const normalized = path.resolve(filePath);
    const dependents = this.reverseEdges.get(normalized);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get files that the given file depends on (forward dependencies)
   */
  getDependencies(filePath: string): string[] {
    const normalized = path.resolve(filePath);
    const dependencies = this.edges.get(normalized);
    return dependencies ? Array.from(dependencies) : [];
  }

  /**
   * Calculate confidence score for a file based on its connection patterns
   */
  calculateConfidence(filePath: string): number {
    const node = this.getNode(filePath);
    if (!node) return 0;

    let confidence = node.confidence;

    // Boost confidence based on incoming dependencies
    const dependents = this.getDependents(filePath);
    confidence += Math.min(dependents.length * 5, 30);

    // Boost confidence for entry points
    if (node.isEntryPoint) {
      confidence += 50;
    }

    // Reduce confidence for architectural core files (key insight from redesign)
    if (node.isArchitecturalCore) {
      confidence *= 0.5;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Get statistics about the dependency graph
   */
  getStatistics() {
    const totalNodes = this.nodes.size;
    const totalEdges = Array.from(this.edges.values())
      .reduce((sum, deps) => sum + deps.size, 0);
    
    const reachableFromEntryPoints = this.findReachable().size;
    const unreachableFiles = totalNodes - reachableFromEntryPoints;
    
    const entryPointFiles = Array.from(this.entryPoints);
    const cycles = this.getCycles();

    return {
      totalNodes,
      totalEdges,
      entryPointCount: entryPointFiles.length,
      reachableFiles: reachableFromEntryPoints,
      unreachableFiles,
      circularDependencyCount: cycles.length,
      entryPoints: entryPointFiles,
      cycles
    };
  }

  private createNode(filePath: string, isEntryPoint = false): DependencyNode {
    const basename = path.basename(filePath);
    
    return {
      filePath,
      importCount: 0,
      lastImportType: DependencyType.REFERENCE,
      isEntryPoint,
      isArchitecturalCore: this.isArchitecturalCore(basename),
      confidence: 50 // Base confidence score
    };
  }

  private isArchitecturalCore(filename: string): boolean {
    const corePatterns = [
      'Application',
      'Container', 
      'ServiceContainer',
      'CommandBus',
      'Config',
      'Bootstrap',
      'Kernel',
      'Registry',
      'Factory',
      'Builder'
    ];

    return corePatterns.some(pattern => 
      filename.includes(pattern) || 
      filename.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private detectCyclesFromNode(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    pathStack: string[],
    cycles: string[][]
  ): void {
    visited.add(node);
    recursionStack.add(node);
    pathStack.push(node);

    const dependencies = this.edges.get(node);
    if (dependencies) {
      dependencies.forEach(dep => {
        if (!visited.has(dep)) {
          this.detectCyclesFromNode(dep, visited, recursionStack, pathStack, cycles);
        } else if (recursionStack.has(dep)) {
          // Found a cycle - extract the cycle path
          const cycleStartIndex = pathStack.indexOf(dep);
          const cycle = pathStack.slice(cycleStartIndex).concat([dep]);
          cycles.push(cycle);
        }
      });
    }

    recursionStack.delete(node);
    pathStack.pop();
  }

  /**
   * Remove a node and all its connections (useful for cleanup)
   */
  removeNode(filePath: string): void {
    const normalized = path.resolve(filePath);
    
    // Remove from nodes
    this.nodes.delete(normalized);
    
    // Remove from entry points
    this.entryPoints.delete(normalized);
    
    // Remove outgoing edges
    this.edges.delete(normalized);
    
    // Remove incoming edges
    this.edges.forEach((deps, from) => {
      deps.delete(normalized);
    });
    
    // Remove from reverse edges
    this.reverseEdges.delete(normalized);
    this.reverseEdges.forEach((sources, to) => {
      sources.delete(normalized);
    });
  }

  /**
   * Debug method to export graph in DOT format for visualization
   */
  toDotFormat(): string {
    const lines = ['digraph Dependencies {'];
    
    this.edges.forEach((deps, from) => {
      const shortFrom = path.basename(from);
      deps.forEach(to => {
        const shortTo = path.basename(to);
        lines.push(`  "${shortFrom}" -> "${shortTo}";`);
      });
    });
    
    // Highlight entry points
    this.entryPoints.forEach(entryPoint => {
      const shortName = path.basename(entryPoint);
      lines.push(`  "${shortName}" [color=red, style=bold];`);
    });
    
    lines.push('}');
    return lines.join('\n');
  }
}
