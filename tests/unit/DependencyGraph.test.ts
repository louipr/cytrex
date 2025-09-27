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

      // Assert
      expect(graph.getAllFiles()).toHaveLength(2);
      expect(graph.getAllFiles()).toContain('/project/main.ts');
      expect(graph.getAllFiles()).toContain('/project/used.ts');
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
      // Arrange - Create files through dependencies
      graph.addDependency('/project/main.ts', '/project/used.ts', DependencyType.IMPORT);
      graph.addDependency('/project/orphan.ts', '/project/dead.ts', DependencyType.IMPORT); // Creates dead file but not reachable from main
      
      // Set main as entry point (THIS IS THE KEY!)
      graph.addEntryPoint('/project/main.ts');

      // Act
      const reachable = graph.findReachable();

      // Assert - This is where the bug likely is
      console.log('Entry points internal:', Array.from((graph as any).entryPoints));
      console.log('All files:', graph.getAllFiles());
      console.log('Dependencies from main:', graph.getDependencies('/project/main.ts'));
      console.log('Reachable files:', Array.from(reachable));
      
      expect(reachable.has('/project/main.ts')).toBe(true);
      expect(reachable.has('/project/used.ts')).toBe(true);
      expect(reachable.has('/project/orphan.ts')).toBe(false); // Should not be reachable
      expect(reachable.has('/project/dead.ts')).toBe(false); // Should not be reachable
    });

    test('should handle multiple entry points', () => {
      // Arrange
      graph.addDependency('/project/main.ts', '/project/shared.ts', DependencyType.IMPORT);
      graph.addDependency('/project/cli.ts', '/project/shared.ts', DependencyType.IMPORT);
      graph.addDependency('/project/orphan.ts', '/project/dead.ts', DependencyType.IMPORT); // Not reachable
      
      graph.addEntryPoint('/project/main.ts');
      graph.addEntryPoint('/project/cli.ts');

      // Act
      const reachable = graph.findReachable();

      // Assert
      expect(reachable.has('/project/main.ts')).toBe(true);
      expect(reachable.has('/project/cli.ts')).toBe(true);
      expect(reachable.has('/project/shared.ts')).toBe(true);
      expect(reachable.has('/project/orphan.ts')).toBe(false);
      expect(reachable.has('/project/dead.ts')).toBe(false);
    });

    test('should handle no entry points', () => {
      // Arrange
      graph.addDependency('/project/orphan.ts', '/project/other.ts', DependencyType.IMPORT);

      // Act - No entry points set
      const reachable = graph.findReachable();

      // Assert
      expect(reachable.size).toBe(0);
    });

    test('should handle circular dependencies', () => {
      // Arrange
      graph.addDependency('/project/main.ts', '/project/a.ts', DependencyType.IMPORT);
      graph.addDependency('/project/a.ts', '/project/b.ts', DependencyType.IMPORT);
      graph.addDependency('/project/b.ts', '/project/a.ts', DependencyType.IMPORT); // circular
      graph.addDependency('/project/orphan.ts', '/project/dead.ts', DependencyType.IMPORT); // separate
      
      graph.addEntryPoint('/project/main.ts');

      // Act
      const reachable = graph.findReachable();

      // Assert
      expect(reachable.has('/project/main.ts')).toBe(true);
      expect(reachable.has('/project/a.ts')).toBe(true);
      expect(reachable.has('/project/b.ts')).toBe(true);
      expect(reachable.has('/project/orphan.ts')).toBe(false);
      expect(reachable.has('/project/dead.ts')).toBe(false);
    });
  });

  describe('Debug Specific Scenario', () => {
    test('should reproduce exact issue from failing integration tests', () => {
      // Recreate the scenario from our failing tests
      // Only create main.ts as entry point, DeadService.ts should be unreachable
      graph.addDependency('/test/main.ts', '/test/UsedService.ts', DependencyType.IMPORT);
      graph.addDependency('/test/unused.ts', '/test/DeadService.ts', DependencyType.IMPORT); // Dead branch
      
      graph.addEntryPoint('/test/main.ts');
      
      // Act
      const reachable = graph.findReachable();
      
      // Debug output
      console.log('\n=== DEBUG SCENARIO ===');
      console.log('Files:', graph.getAllFiles());
      console.log('Entry points set:', Array.from((graph as any).entryPoints));
      console.log('Dependencies from main:', graph.getDependencies('/test/main.ts'));
      console.log('Reachable:', Array.from(reachable));
      console.log('Should DeadService be reachable?', reachable.has('/test/DeadService.ts'));
      
      // Assert
      expect(reachable.has('/test/main.ts')).toBe(true);
      expect(reachable.has('/test/UsedService.ts')).toBe(true);
      expect(reachable.has('/test/unused.ts')).toBe(false);
      expect(reachable.has('/test/DeadService.ts')).toBe(false);
    });
  });
});
