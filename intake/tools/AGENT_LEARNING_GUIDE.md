# AI Learning Methodology Guide

## Overview
Systematic learning workflow for AI agents with behavioral controls to ensure valid document c### File Structure
```
context/
├── exam.yaml                    # Questions + Solutions
├── learning_template.yaml      # NEW: Evidence collection template
├── learning_evidence.yaml      # NEW: Completed evidence from agent
├── exam_draft.yaml              # NEW: Generated questions pre-assembly
├── knowledge_iter0.json         # Baseline knowledge 
├── iter1/
│   ├── knowledge_iter1.json     # Improved knowledge
│   ├── answers.json             # Agent responses
│   └── score.json               # Grading results
└── iter2/...                    # Next iteration
```

---

## PHASE 1: EXAM CREATION

### 1.1 Create Exam Draft Skeleton
**TYPE:** PROGRAMMATIC  
**COMMAND:** `node learn-tool.js init-exam`
- Creates `context/exam_draft.yaml` skeleton
- Includes schema-compliant structure for questions and solutions

### 1.2 Populate Exam Content  
**TYPE:** HYBRID (PROGRAMMATIC + MANUAL AGENT)

**🛑 MANDATORY CHECKPOINT - Complete ALL steps with evidence:**

**STEP A:** Generate Learning Template
**COMMAND:** `node learn-tool.js generate-learning-template`
- Creates `learning_template.yaml` with document structure
- Enforces systematic coverage requirements

**STEP B:** Document Evidence Collection  
**TYPE:** MANUAL AGENT (SUPERVISED)
- Agent fills `learning_template.yaml` → `learning_evidence.yaml`
- MUST read ALL documents with evidence quotes
- MUST extract technical domains per document
- MUST show tool output evidence for each document read

**STEP C:** Validate Evidence
**COMMAND:** `node learn-tool.js validate-evidence`
- Verifies all documents processed
- Validates technical domain extraction
- Enforces evidence quality standards

**STEP D:** Populate Exam Draft
**TYPE:** MANUAL AGENT (SUPERVISED)  
- Agent fills `exam_draft.yaml` skeleton with real questions and solutions
- MUST trace each question to source evidence from `learning_evidence.yaml`
- MUST use ONLY evidence from Step B processing
- Updates existing skeleton created in Step 1.1

**STEP E:** Assemble Final Exam
**COMMAND:** `node learn-tool.js assemble-exam`
- Combines evidence + questions → `exam.yaml`
- Validates schema compliance
- Creates audit trail

**⚠️ CLAUDE CONTROLS:**
- WILL skip systematic processing - REQUIRE evidence file completion
- WILL assume content - DEMAND document quotes in evidence file
- WILL create generic questions - REQUIRE traceability to evidence
- WILL bypass validation - ENFORCE programmatic checkpoints

### 1.3 Validate Exam
**TYPE:** PROGRAMMATIC  
**COMMAND:** `node learn-tool.js validate-exam`
- Validates schema compliance
- Verifies all required fields populated

---

## PHASE 2: KNOWLEDGE BASELINE

### 2.1 Create Knowledge Skeleton
**TYPE:** PROGRAMMATIC  
**COMMAND:** `node learn-tool.js init-knowledge-baseline`
- Creates `knowledge_iter0.json` skeleton

### 2.2 Extract Baseline Knowledge
**TYPE:** MANUAL AGENT (BLIND)

**� ANTI-CHEATING CONTROLS:**
- Agent FORBIDDEN from reading `exam.yaml`
- Agent MUST re-read ALL source documents independently
- Agent MUST extract knowledge without exam bias

**Required Process:**
1. Re-read ALL `intake/docs/*.md` files (no shortcuts)
2. Extract facts, concepts, technical details
3. Assign confidence scores with evidence sources
4. Create comprehensive knowledge base

**⚠️ CLAUDE CONTROLS:**
- WILL try to reference exam - BLOCK access to exam.yaml
- WILL reuse previous summaries - REQUIRE fresh reading
- WILL make relevance assumptions - REQUIRE systematic extraction

---

## PHASE 3: ITERATIVE TESTING

### 3.1 Setup Test Iteration
**TYPE:** PROGRAMMATIC  
**COMMAND:** `node learn-tool.js init-iter iter1`
- Creates iteration directory (`iter1/`)
- Copies baseline knowledge → `knowledge_iter1.json`
- Creates empty `answers.json` with exam draft questions

### 3.2 Take Blind Exam
**TYPE:** MANUAL AGENT (MONITORED)

**🚨 BLIND TESTING ENFORCEMENT:**
- Agent FORBIDDEN from reading `exam.yaml` 
- Agent MUST use ONLY `knowledge_iter1.json` content
- Agent MUST quote specific knowledge entries for each answer

**Required Process:**
1. Read questions from `answers.json`
2. Answer using ONLY `knowledge_iter1.json` content
3. Cite specific knowledge entries
4. Provide confidence scores and reasoning
5. **MANDATORY:** Complete ALL questions before proceeding

**✅ PHASE 3.2 COMPLETION VALIDATION:**
- ALL questions answered (0 blank answers)
- ALL confidence scores > 0 
- ALL reasoning fields completed with knowledge citations
- Evidence quotes for each answer from knowledge base
- **COMMAND:** `node learn-tool.js validate-answers iter1` (REQUIRED before Phase 3.3)

**⚠️ CLAUDE CONTROLS:**
- WILL try to access exam solutions - BLOCK exam.yaml access
- WILL use training knowledge - REQUIRE knowledge.json citations
- WILL give confident unsupported answers - DEMAND evidence quotes
- **WILL declare completion prematurely - ENFORCE validation checkpoint**
- **WILL skip systematic processing - REQUIRE ALL questions completed**

### 3.3 Grade Performance  
**TYPE:** MANUAL AGENT (SUPERVISED)
- Compare agent answers to exam solutions
- Apply grading rubric by question type
- Identify specific knowledge gaps
- Generate improvement recommendations

### 3.4 Improve Knowledge
**TYPE:** PROGRAMMATIC  
**COMMAND:** `node learn-tool.js improve-knowledge iter1`
- Analyze gaps from scoring results
- Update knowledge confidence scores
- Prepare `knowledge_iter2.json` for next iteration

---

## REFERENCE INFORMATION

### File Structure
```
context/
├── exam/exam.yaml               # Questions + Solutions (updated in Step D)
├── learning_template.yaml      # NEW: Evidence collection template
├── learning_evidence.yaml      # NEW: Completed evidence from agent
├── knowledge_iter0.json         # Baseline knowledge 
├── iter1/
│   ├── knowledge_iter1.json     # Improved knowledge
│   ├── answers.json             # Agent responses
│   └── score.json               # Grading results
└── iter2/...                    # Next iteration
```

### Available Commands
```bash
# Phase 1: Exam Creation
node learn-tool.js init-exam
node learn-tool.js generate-learning-template    # NEW: Creates evidence template
node learn-tool.js validate-evidence            # NEW: Validates evidence collection
node learn-tool.js assemble-exam                # NEW: Builds final exam with audit trail
node learn-tool.js validate-exam

# Phase 2: Knowledge Baseline  
node learn-tool.js init-knowledge-baseline

# Phase 3: Testing Iterations
node learn-tool.js init-iter iter1
node learn-tool.js validate-answers iter1       # NEW: Validates all answers completed
node learn-tool.js improve-knowledge iter1
```

### Success Metrics 
- **Accuracy:** Scores increase across iterations
- **Evidence:** All answers cite specific knowledge sources
- **Integrity:** No cheating or shortcut-taking detected
- **Learning:** Knowledge gaps identified and systematically addressed

---

## CLAUDE SONNET BEHAVIORAL CONTROLS

### Observed Failure Patterns
- ❌ Skips systematic document reading
- ❌ Creates content from training knowledge vs. documents  
- ❌ Accesses forbidden files during blind testing
- ❌ Provides overconfident answers without evidence
- ❌ Bypasses validation checkpoints
- ❌ **Declares phases complete with incomplete work**
- ❌ **Leaves blank answers while claiming task completion**
- ❌ **Provides performance summaries on partial data**

### Required Evidence Standards
- ✅ Show `file_search`/`read_file` tool outputs
- ✅ Quote specific document sections  
- ✅ Admit knowledge limitations when evidence lacking
- ✅ Follow all checkpoint requirements
- ✅ Maintain strict blind testing protocols

### Enforcement Mechanisms
1. **Tool Output Verification** - Must show search/read results
2. **Document Quotation** - Must cite specific evidence  
3. **File Access Monitoring** - Block unauthorized reads
4. **Step-by-Step Validation** - Complete each phase fully
5. **Evidence-Based Responses** - No unsupported answers
6. **Completion Validation** - Programmatic verification before phase transitions
7. **Systematic Processing** - All questions/tasks must be completed, no shortcuts
8. **Premature Declaration Prevention** - Mandatory validation checkpoints

This methodology is specifically designed around Claude Sonnet's behavioral patterns to ensure valid learning assessment.
