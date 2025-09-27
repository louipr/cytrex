// ============================================================================
// AUTO-GENERATED FROM OPUS IMPLEMENTATION
// Source files: intake/docs/complete_implementation.md
// Generated on: 2025-09-27T09:28:40.522Z
// ============================================================================

// Custom error classes for better error handling

export class AnalyzerError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AnalyzerError';
  }
}

export class ParseError extends AnalyzerError {
  constructor(message: string, public file: string, details?: any) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

export class ConfigurationError extends AnalyzerError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigurationError';
  }
}

export class RuleError extends AnalyzerError {
  constructor(message: string, public ruleId: string, details?: any) {
    super(message, 'RULE_ERROR', details);
    this.name = 'RuleError';
  }
}

