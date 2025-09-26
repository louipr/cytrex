# AI Learning Methodology Guide

## Overview
Systematic learning workflow for AI agents with behavioral controls to ensure valid document comprehension testing.

---

## PHASE 1: EXAM CREATION

### 1.1 Create Exam Skeleton
**TYPE:** PROGRAMMATIC  
**COMMAND:** `node learn-tool.js init-exam`
- Creates `context/exam/exam.yaml` skeleton
- Includes schema-compliant structure with guidance comments

### 1.2 Populate Exam Content  
**TYPE:** MANUAL AGENT (SUPERVISED)

**🛑 MANDATORY CHECKPOINT - Complete ALL steps with evidence:**

**STEP A:** Document Discovery
```bash
# Agent MUST show this output:
file_search "intake/docs/*.md"
# Expected: List of all .md files found
```

**STEP B:** Systematic Reading  
```bash
# Agent MUST read EVERY file found in Step A:
read_file "/path/to/doc1.md" 1 50
read_file "/path/to/doc2.md" 1 100
# Agent MUST summarize key points from each document
```

**STEP C:** Question Creation
- Create questions covering ALL technical domains identified
- Use ONLY evidence from documents read in Step B
- Follow exam.yaml structure exactly

**⚠️ CLAUDE CONTROLS:**
- WILL skip reading - REQUIRE tool output evidence  
- WILL assume content - DEMAND document quotes
- WILL create generic questions - REQUIRE domain-specific evidence

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
- Creates empty `answers.json` with exam questions

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

**⚠️ CLAUDE CONTROLS:**
- WILL try to access exam solutions - BLOCK exam.yaml access
- WILL use training knowledge - REQUIRE knowledge.json citations
- WILL give confident unsupported answers - DEMAND evidence quotes

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
├── exam/exam.yaml               # Questions + Solutions
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
node learn-tool.js validate-exam

# Phase 2: Knowledge Baseline  
node learn-tool.js init-knowledge-baseline

# Phase 3: Testing Iterations
node learn-tool.js init-iter iter1
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

This methodology is specifically designed around Claude Sonnet's behavioral patterns to ensure valid learning assessment.
