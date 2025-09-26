# Learning Workflow Guide for AI Agents

## Overview
This guide documents the systematic learning methodology designed to validate and improve AI document comprehension through iterative testing and knowledge refinement.

## Workflow Algorithm

### Phase 1: Exam Skeleton Creation
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js init-exam`
- **Actions**:
  1. Creates exam directory (context/exam/)
  2. Generates empty exam.json skeleton with proper structure
  3. Validates against exam.schema.json

### Phase 1b: Exam Population
**Type: MANUAL AGENT**
- **Input**: Source documentation (intake/docs/*.md) + empty exam.json
- **Output**: Populated exam.json with questions and solutions
- **Agent Task**: 
  1. Read all source documents systematically
  2. Create comprehensive questions covering all technical domains
  3. Provide detailed solutions with evidence sources
  4. Ensure questions and solutions are properly separated but in same file
  5. **Follow the guidance provided in the exam.json skeleton comments**

### Phase 1c: Exam Validation
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js validate-exam`
- **Actions**:
  1. Validates completed exam.json against exam.schema.json
  2. Ensures questions and solutions are properly structured
  3. Verifies all required fields are populated
  4. Confirms schema compliance before proceeding

### Phase 1d: Baseline Knowledge Skeleton Creation
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js init-knowledge-baseline`
- **Actions**:
  1. Creates knowledge_iter0.json skeleton with proper structure
  2. Validates against knowledge.schema.json
  3. Sets up baseline knowledge template for agent to populate

### Phase 1e: Baseline Knowledge Extraction
**Type: MANUAL AGENT**
- **Input**: Source documentation (intake/docs/*.md) ONLY + empty knowledge_iter0.json
- **Output**: Populated knowledge_iter0.json with extracted knowledge
- **Agent Task**: 
  1. Read all source documents systematically
  2. Extract facts, concepts, and technical details
  3. Structure knowledge with confidence scores and evidence sources
  4. **CRITICAL**: Do NOT look at exam.json - maintain blind learning integrity
  5. Create comprehensive knowledge base independent of exam questions

### Phase 2: Iteration Setup  
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js init-iter <iteration_name>`
- **Actions**:
  1. Creates iteration directory (e.g., iter1/)
  2. Creates knowledge_iter{N}.json by copying from previous iteration:
     - For iter1: copies knowledge_iter0.json → knowledge_iter1.json
     - For iter2: copies knowledge_iter1.json → knowledge_iter2.json
     - For iterN: copies knowledge_iter{N-1}.json → knowledge_iter{N}.json
  3. Creates answers.json with questions copied from exam but empty answers
  4. Sets up directory structure for scoring

### Phase 3: Pre-Test Validation
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js validate-pretest <iteration_name>`
- **Assertions**:
  1. Questions in answers.json match exam.json questions
  2. All answer fields in answers.json are empty
  3. Knowledge_iter{N}.json exists and has proper structure
  4. Score.json does NOT exist yet
  5. Schema validation passes for all files

### Phase 4: Blind Exam Taking
**Type: MANUAL AGENT**
- **Input**: answers.json (with questions) + knowledge_iter{N}.json ONLY
- **Output**: Populated answers.json with agent responses
- **Agent Task**:
  1. Answer questions using ONLY knowledge_iter{N}.json content
  2. Do NOT peek at exam.json solutions
  3. Provide confidence scores for each answer
  4. Include reasoning based on knowledge

### Phase 5: Scoring Setup
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js init-scoring <iteration_name>`
- **Actions**:
  1. Creates score.json skeleton
  2. Copies questions from exam.json
  3. Copies agent answers from answers.json
  4. Copies solutions from exam.json
  5. Sets up scoring structure for comparison

### Phase 6: Pre-Score Validation
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js validate-prescore <iteration_name>`
- **Assertions**:
  1. Score.json exists with proper structure
  2. Questions match exam questions
  3. Agent answers are populated
  4. Solutions are populated
  5. Scoring fields are empty (ready for grading)

### Phase 7: Grading
**Type: MANUAL AGENT**
- **Input**: score.json with answers and solutions
- **Output**: Completed score.json with grades and analysis
- **Agent Task**:
  1. Compare agent answers to solutions
  2. Apply grading rubric based on question types
  3. Calculate accuracy scores by category
  4. Identify knowledge gaps and weaknesses
  5. Generate improvement recommendations

### Phase 8: Knowledge Improvement
**Type: PROGRAMMATIC**
- **Command**: `node learn-tool.js improve-knowledge <iteration_name>`
- **Actions**:
  1. Analyzes score.json to identify knowledge gaps by category and severity
  2. Maps incorrect/partial answers to specific knowledge domains
  3. Applies algorithmic improvements based on gap analysis:
     - Reduces confidence scores for incorrect high-confidence answers
     - Flags knowledge domains requiring additional evidence
     - Marks synthesis areas needing enhancement
     - Updates knowledge structure based on scoring patterns
  4. Prepares knowledge_iter{N+1}.json for next iteration automatically
  5. Creates improvement_log.json documenting all changes made

## Key Principles

### Separation of Concerns
- **Programmatic**: Data integrity, structure validation, workflow orchestration
- **Agent**: Content creation, analysis, learning, improvement

### Blind Testing Integrity
- Agent must NOT see solutions when taking exam
- Knowledge extraction must be independent of exam questions
- This prevents cheating and ensures genuine comprehension testing

### Iterative Improvement
- Each iteration builds on previous knowledge
- Scoring identifies specific gaps for targeted improvement
- Quantified metrics track learning progress

### Evidence-Based Learning
- All knowledge must have source citations
- Confidence scores enable self-awareness
- Objective grading prevents overconfidence

## File Structure
```
intake/context/
├── exam/
│   └── exam.json                 # Questions + Solutions (agent creates)
├── knowledge_iter0.json          # Baseline knowledge from docs only
├── iter1/
│   ├── knowledge_iter1.json      # Copied from iter0, then improved by agent
│   ├── answers.json              # Agent's exam responses
│   └── score.json                # Grading results and analysis
├── iter2/
│   ├── knowledge_iter2.json      # Copied from iter1, then improved by agent
│   ├── answers.json              # New exam attempt
│   └── score.json                # Updated scoring
└── ...
```

## Tool Commands

### Setup Commands
```bash
# Create empty exam skeleton
node learn-tool.js init-exam

# Validate completed exam against schema
node learn-tool.js validate-exam

# Create baseline knowledge skeleton
node learn-tool.js init-knowledge-baseline

# Setup iteration directory
node learn-tool.js init-iter iter1
```

### Validation Commands
```bash
# Validate before agent takes exam
node learn-tool.js validate-pretest iter1

# Setup scoring structure
node learn-tool.js init-scoring iter1

# Validate before agent grades
node learn-tool.js validate-prescore iter1

# Programmatically improve knowledge based on scoring
node learn-tool.js improve-knowledge iter1
```

## Schema Evolution Path

The learning methodology is designed for continuous improvement through two key principles:

### Knowledge-Scoring Schema Relationship
- We assume a relationship exists between knowledge and scoring schemas that enables programmatic transferable learning
- This relationship allows us to define a **knowledge delta schema** that captures learning improvements systematically

### Iterative Schema Refinement  
- The learning/knowledge delta schema will evolve through rigorous testing across multiple iterations
- Each iteration provides data to refine how knowledge improvements are captured and applied

## Success Metrics
- **Accuracy Improvement**: Score increases across iterations
- **Confidence Calibration**: High confidence correlates with correctness
- **Gap Reduction**: Fewer knowledge gaps in subsequent iterations
- **Synthesis Enhancement**: Better comprehensive answers over time
- **Schema Effectiveness**: Improved learning rates with schema evolution

## Agent Instructions Summary

1. **NEVER** look at solutions when taking exam
2. **ALWAYS** use only knowledge_iter{N}.json for answering questions
3. **VALIDATE** using programmatic tools before each phase
4. **DOCUMENT** confidence and reasoning for all responses
5. **IMPROVE** systematically based on scoring analysis

This methodology ensures objective, measurable AI learning with continuous improvement cycles.
