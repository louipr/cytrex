import { DependencyGraph } from '../../src/core/graph/DependencyGraph';
import { DependencyType } from '../../src/types';

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('Basic Functionality', () => {
    test('should track files correctly through dependencies', () => {
      // Arrange & Act - files are created implicitly when adding dependencies
      graph.addDependency('/project/main.ts', '/project/used.ts', DependencyType.IMPORT);
      graph.addDependency('/project/main.ts', '/project/dead.ts', DependencyType.IMPORT); // This makes dead.ts reachable

      // Assert
      expect(graph.getAllFiles()).toHaveLength(3);
      expect(graph.getAllFiles()).toContain('/project/main.ts');
      expect(graph.getAllFiles()).toContain('/project/used.ts');
      expect(graph.getAllFiles()).toContain('/project/dead.ts');
    });

    test('should track dependencies correctly', () => {
      // Arrange & Act
      graph.addDependency('/project/main.ts', '/project/used.ts', DependencyType.IMPORT);

      // Assert
      const deps = graph.getDependencies('/project/main.ts');
      expect(deps).toContain('/project/used.ts');
    });
  });

  describe('Reachability Analysis - The Core Bug', () => {
    test('should mark only reachable files from entry points', () => {
      // Arrange
      graph.addFile('/project/main.ts');     // Entry point
      graph.addFile('/project/used.ts');     // Used by main
      graph.addFile('/project/dead.ts');     // Not used by anyone
      
      graph.addDependency('/project/main.ts', '/project/used.ts');
      // Note: dead.ts has NO dependencies pointing to it

      // Act
      const reachable = graph.findReachable(['/project/main.ts']);

      // Assert - This is where the bug likely is
      console.log('Entry points:', ['/project/main.ts']);
      console.log('All files:', graph.getAllFiles());
      console.log('Dependencies from main:', graph.getDependencies('/project/main.ts'));
      console.log('Reachable files:', Array.from(reachable));
      
      expect(reachable.has('/project/main.ts')).toBe(true);
      expect(reachable.has('/project/used.ts')).toBe(true);
      expect(reachable.has('/project/dead.ts')).toBe(false); // This is probably failing
    });

    test('should handle multiple entry points', () => {
      // Arrange
      graph.addFile('/project/main.ts');     
      graph.addFile('/project/cli.ts');     
      graph.addFile('/project/shared.ts');  // Used by both
      graph.addFile('/project/dead.ts');    // Used by neither
      
      graph.addDependency('/project/main.ts', '/project/shared.ts');
      graph.addDependency('/project/cli.ts', '/project/shared.ts');

      // Act
      const reachable = graph.findReachable(['/project/main.ts', '/project/cli.ts']);

      // Assert
      expect(reachable.has('/project/main.ts')).toBe(true);
      expect(reachable.has('/project/cli.ts')).toBe(true);
      expect(reachable.has('/project/shared.ts')).toBe(true);
      expect(reachable.has('/project/dead.ts')).toBe(false);
    });

    test('should handle empty entry points', () => {
      // Arrange
      graph.addFile('/project/orphan.ts');

      // Act
      const reachable = graph.findReachable([]);

      // Assert
      expect(reachable.size).toBe(0);
    });

    test('should handle circular dependencies', () => {
      // Arrange
      graph.addFile('/project/main.ts');     
      graph.addFile('/project/a.ts');       
      graph.addFile('/project/b.ts');       // a -> b -> a (circular)
      graph.addFile('/project/dead.ts');    
      
      graph.addDependency('/project/main.ts', '/project/a.ts');
      graph.addDependency('/project/a.ts', '/project/b.ts');
      graph.addDependency('/project/b.ts', '/project/a.ts'); // circular

      // Act
      const reachable = graph.findReachable(['/project/main.ts']);

      // Assert
      expect(reachable.has('/project/main.ts')).toBe(true);
      expect(reachable.has('/project/a.ts')).toBe(true);
      expect(reachable.has('/project/b.ts')).toBe(true);
      expect(reachable.has('/project/dead.ts')).toBe(false);
    });
  });

  describe('Debug Specific Scenario', () => {
    test('should reproduce exact issue from failing integration tests', () => {
      // Recreate the scenario from our failing tests
      graph.addFile('/test/main.ts');
      graph.addFile('/test/DeadService.ts');
      
      // main.ts does NOT import DeadService.ts
      // So there should be no dependency
      
      // Act
      const reachable = graph.findReachable(['/test/main.ts']);
      
      // Debug output
      console.log('\n=== DEBUG SCENARIO ===');
      console.log('Files:', graph.getAllFiles());
      console.log('Entry points:', ['/test/main.ts']);
      console.log('Dependencies from main:', graph.getDependencies('/test/main.ts'));
      console.log('Reachable:', Array.from(reachable));
      console.log('Should DeadService be reachable?', reachable.has('/test/DeadService.ts'));
      
      // Assert
      expect(reachable.has('/test/main.ts')).toBe(true);
      expect(reachable.has('/test/DeadService.ts')).toBe(false);
    });
  });
});
