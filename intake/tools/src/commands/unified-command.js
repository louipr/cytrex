const path = require('path');
const { SchemaValidator } = require('../validators/schema-validator');
const { FileService, Skeletons, Paths } = require('../services/simple.service');

/**
 * Single unified command handler - eliminates all the class boilerplate
 */
class CommandHandler {
  constructor(contextDir = process.cwd()) {
    this.files = new FileService();
    this.validator = new SchemaValidator();
    this.paths = new Paths(contextDir);
  }

  /**
   * Universal execution method - handles all operations
   */
  async execute(operation, params = {}) {
    try {
      const result = await this.operations[operation].call(this, params);
      return this.success(result.message, result.data || {});
    } catch (error) {
      return this.failure(error.message, error);
    }
  }

  /**
   * All operations in one place - no more scattered command files
   */
  operations = {
    'init-exam': async () => {
      const examDraftPath = this.paths.examDraftSkeleton();
      
      await this.ensureNotExists(examDraftPath, 'Exam draft skeleton already exists. Delete it first if you want to recreate it.');
      
      const skeleton = Skeletons.examDraftSkeleton();
      const comments = this.getExamDraftComments();
      await this.files.writeYaml(examDraftPath, skeleton, comments);
      
      return {
        message: 'Exam draft skeleton created successfully',
        data: { examDraftPath }
      };
    },

    'init-knowledge-baseline': async () => {
      const knowledgePath = this.paths.knowledgeBaseline();
      
      await this.ensureNotExists(knowledgePath, 'Knowledge baseline already exists. Delete it first if you want to recreate it.');
      
      const skeleton = Skeletons.knowledgeBaseline();
      await this.files.writeJson(knowledgePath, skeleton);
      
      const validation = await this.validate(skeleton, 'knowledge');
      
      return {
        message: 'Knowledge baseline skeleton created successfully',
        data: { schemaValid: validation.valid, knowledgePath }
      };
    },

    'init-iter': async ({ iterationName }) => {
      if (!this.paths.isValidIterName(iterationName)) {
        throw new Error('Invalid iteration name. Use format: iter1, iter2, etc.');
      }

      const iterDir = this.paths.iterationDir(iterationName);
      const examPath = this.paths.examFile();
      const sourceKnowledgePath = this.paths.previousKnowledge(iterationName);
      
      await this.ensureNotExists(iterDir, `Iteration ${iterationName} already exists. Delete it first if you want to recreate it.`);
      await this.ensureExists(examPath, 'Exam not found. Use init-exam to create one first.');
      await this.ensureExists(sourceKnowledgePath, this.getMissingKnowledgeMessage(iterationName));

      // Create iteration
      await this.files.ensureDir(iterDir);
      await this.files.copy(sourceKnowledgePath, this.paths.iterationKnowledge(iterationName));
      
      const examData = await this.files.readYaml(examPath);
      const answersData = Skeletons.answersFromExam(examData, iterationName);
      await this.files.writeJson(this.paths.iterationAnswers(iterationName), answersData);

      // Validate
      const knowledgeData = await this.files.readJson(this.paths.iterationKnowledge(iterationName));
      const knowledgeValidation = await this.validate(knowledgeData, 'knowledge');
      const answersValidation = await this.validate(answersData, 'answers');

      return {
        message: `Iteration ${iterationName} setup complete`,
        data: {
          iterationPath: iterDir,
          knowledgeSchemaValid: knowledgeValidation.valid,
          answersSchemaValid: answersValidation.valid
        }
      };
    },

    'generate-learning-template': async () => {
      const templatePath = this.paths.learningTemplate();
      const docsPattern = '../docs/*.md';
      
      await this.ensureNotExists(templatePath, 'Learning template already exists. Delete it first if you want to recreate it.');
      
      // Find all documentation files
      const glob = require('glob');
      const docFiles = glob.sync(docsPattern, { cwd: this.paths.contextDir });
      
      if (docFiles.length === 0) {
        throw new Error(`No documentation files found matching pattern: ${docsPattern}`);
      }
      
      const template = Skeletons.learningTemplate(docFiles);
      await this.files.writeYaml(templatePath, template);
      
      return {
        message: 'Learning template created successfully',
        data: { 
          templatePath, 
          documentsFound: docFiles.length,
          documentFiles: docFiles 
        }
      };
    },

    'validate-evidence': async () => {
      const evidencePath = this.paths.learningEvidence();
      
      await this.ensureExists(evidencePath, 'Learning evidence file not found. Complete Step B (Document Evidence Collection) first.');
      
      const evidenceData = await this.files.readYaml(evidencePath);
      const validation = this.validateLearningEvidence(evidenceData);
      
      return {
        message: validation.valid ? 'Learning evidence is complete and valid' : 'Learning evidence validation failed',
        data: { 
          valid: validation.valid, 
          errors: validation.errors,
          documentsProcessed: validation.documentsProcessed,
          totalDomains: validation.totalDomains
        }
      };
    },

    'assemble-exam': async () => {
      const evidencePath = this.paths.learningEvidence();
      const draftPath = this.paths.examDraft();
      const examPath = this.paths.examFile();
      
      await this.ensureExists(evidencePath, 'Learning evidence not found. Complete evidence collection first.');
      await this.ensureExists(draftPath, 'Exam draft not found. Complete question generation first.');
      
      const evidenceData = await this.files.readYaml(evidencePath);
      const draftData = await this.files.readYaml(draftPath);
      
      const finalExam = this.assembleExamFromEvidence(evidenceData, draftData);
      await this.files.writeYaml(examPath, finalExam);
      
      const validation = await this.validate(finalExam, 'exam');
      
      return {
        message: 'Final exam assembled successfully with audit trail',
        data: {
          examPath,
          schemaValid: validation.valid,
          questionsCount: finalExam.questions.length,
          auditTrail: finalExam.audit_trail
        }
      };
    },

    'validate-exam': async () => {
      const examPath = this.paths.examFile();
      
      await this.ensureExists(examPath, 'Exam file not found. Use init-exam to create one first.');
      
      const examData = await this.files.readYaml(examPath);
      const validation = await this.validate(examData, 'exam');
      const businessErrors = this.validateExamBusinessRules(examData);
      
      const allErrors = [...validation.errors, ...businessErrors];
      const isValid = allErrors.length === 0;
      
      return {
        message: isValid ? 'Exam is valid and ready for use' : 'Exam validation failed',
        data: { valid: isValid, errors: allErrors, examPath }
      };
    },

    'validate-answers': async ({ iterationName }) => {
      if (!this.paths.isValidIterName(iterationName)) {
        throw new Error('Invalid iteration name. Use format: iter1, iter2, etc.');
      }

      const answersPath = this.paths.iterationAnswers(iterationName);
      const examPath = this.paths.examFile();
      
      await this.ensureExists(answersPath, `Answers file not found for ${iterationName}. Complete blind exam first.`);
      await this.ensureExists(examPath, 'Exam file not found. Cannot validate answers without exam reference.');
      
      const answersData = await this.files.readJson(answersPath);
      const examData = await this.files.readYaml(examPath);
      
      // Schema validation
      const schemaValidation = await this.validate(answersData, 'answers');
      
      // Answer completion validation
      const completionValidation = this.validateAnswerCompletion(answersData, examData);
      
      const allErrors = [...schemaValidation.errors, ...completionValidation.errors];
      const isValid = allErrors.length === 0;
      
      return {
        message: isValid ? 
          `All answers validated successfully for ${iterationName}` : 
          `Answer validation failed for ${iterationName}`,
        data: { 
          valid: isValid, 
          errors: allErrors,
          answersPath,
          totalQuestions: completionValidation.totalQuestions,
          answeredQuestions: completionValidation.answeredQuestions,
          blankAnswers: completionValidation.blankAnswers,
          averageConfidence: completionValidation.averageConfidence
        }
      };
    }
  };

  // Utility methods - eliminate all the repetitive patterns
  async ensureExists(path, errorMessage) {
    if (!(await this.files.exists(path))) {
      throw new Error(errorMessage);
    }
  }

  async ensureNotExists(path, errorMessage) {
    if (await this.files.exists(path)) {
      throw new Error(errorMessage);
    }
  }

  async validate(data, type) {
    try {
      switch (type) {
        case 'exam': return await this.validator.validateExam(data);
        case 'knowledge': return await this.validator.validateKnowledge(data);
        case 'answers': return await this.validator.validateAnswers(data);
        default: return { valid: true, errors: [] };
      }
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  success(message, data = {}) {
    return { success: true, message, ...data };
  }

  failure(message, error = null) {
    return { 
      success: false, 
      message, 
      ...(error && { error: error.message || error })
    };
  }

  getMissingKnowledgeMessage(iterationName) {
    const iterNum = parseInt(iterationName.replace('iter', ''));
    const expectedFile = iterNum === 1 ? 'knowledge_iter0.json' : `knowledge_iter${iterNum - 1}.json`;
    return `Source knowledge file ${expectedFile} not found. Create previous iteration first.`;
  }

  getExamComments() {
    return [
      '# Exam Schema',
      '# Schema for learning methodology exams with questions and solutions',
      '# ',
      '# TYPE:',
      '#   factual: Questions that require recall of specific facts or information.',
      '#   conceptual: Questions that test understanding of concepts and ideas.',
      '#   analytical: Questions that involve analysis and interpretation of information.',
      '#   synthesis: Questions that require combining information to form new ideas or solutions.',
      '#',
      '# DIFFICULTY:',
      '#   basic: Questions that test fundamental knowledge and understanding.',
      '#   intermediate: Questions that require application and analysis of concepts.',
      '#   advanced: Questions that involve synthesis, evaluation, and complex problem-solving.',
      '#',
      ''
    ].join('\n');
  }

  getExamDraftComments() {
    return [
      '# Exam Draft Skeleton',
      '# Fill this skeleton with questions and solutions based on learning_evidence.yaml',
      '# ',
      '# INSTRUCTIONS FOR STEP D:',
      '#   1. Read learning_evidence.yaml for all technical domains',
      '#   2. Create questions covering ALL domains identified',
      '#   3. Trace each question to specific evidence line references',  
      '#   4. Provide complete solutions with evidence sources',
      '#   5. Update metadata with actual counts',
      '#',
      '# This skeleton will be assembled into final exam.yaml in Step E',
      '#',
      ''
    ].join('\n');
  }

  validateExamBusinessRules(examData) {
    const errors = [];
    
    if (examData.questions && examData.questions.length === 0) {
      errors.push('Empty exam not ready for use - no questions found');
    }
    
    if (examData.metadata && examData.questions) {
      const declaredCount = examData.metadata.total_questions;
      const actualCount = examData.questions.length;
      
      if (declaredCount !== actualCount) {
        errors.push(`total_questions mismatch: declared ${declaredCount} but found ${actualCount} questions`);
      }
    }
    
    if (examData.questions && examData.solutions) {
      const questionCount = examData.questions.length;
      const solutionCount = examData.solutions.length;
      
      if (questionCount !== solutionCount) {
        errors.push(`Question/solution count mismatch: ${questionCount} questions but ${solutionCount} solutions`);
      }
    }
    
    return errors;
  }

  validateLearningEvidence(evidenceData) {
    const errors = [];
    let documentsProcessed = 0;
    let totalDomains = 0;

    if (!evidenceData.phase_1_2_evidence) {
      errors.push('Missing phase_1_2_evidence section');
      return { valid: false, errors, documentsProcessed, totalDomains };
    }

    const evidence = evidenceData.phase_1_2_evidence;

    // Check document summaries exist
    if (!evidence.document_summaries || !Array.isArray(evidence.document_summaries)) {
      errors.push('Missing or invalid document_summaries array');
      return { valid: false, errors, documentsProcessed, totalDomains };
    }

    // Validate each document summary
    for (const docSummary of evidence.document_summaries) {
      if (!docSummary.document) {
        errors.push('Document summary missing document field');
        continue;
      }

      if (!docSummary.lines_read || docSummary.lines_read <= 0) {
        errors.push(`Document ${docSummary.document} missing valid lines_read`);
      }

      if (!docSummary.technical_domains || !Array.isArray(docSummary.technical_domains)) {
        errors.push(`Document ${docSummary.document} missing technical_domains array`);
        continue;
      }

      documentsProcessed++;
      totalDomains += docSummary.technical_domains.length;

      // Validate technical domains
      for (const domain of docSummary.technical_domains) {
        if (!domain.domain) {
          errors.push(`Document ${docSummary.document} has domain missing name`);
        }
        if (!domain.key_concepts || !Array.isArray(domain.key_concepts)) {
          errors.push(`Document ${docSummary.document} domain ${domain.domain} missing key_concepts`);
        }
        if (!domain.evidence_line_refs || !Array.isArray(domain.evidence_line_refs)) {
          errors.push(`Document ${docSummary.document} domain ${domain.domain} missing evidence_line_refs`);
        }
      }
    }

    // Check minimum requirements
    if (documentsProcessed < 5) {
      errors.push(`Insufficient documents processed: ${documentsProcessed}. Minimum 5 required.`);
    }

    if (totalDomains < 15) {
      errors.push(`Insufficient technical domains identified: ${totalDomains}. Minimum 15 required.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      documentsProcessed,
      totalDomains
    };
  }

  validateAnswerCompletion(answersData, examData) {
    const errors = [];
    const totalQuestions = examData.questions ? examData.questions.length : 0;
    let answeredQuestions = 0;
    let blankAnswers = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;

    if (!answersData.answers || !Array.isArray(answersData.answers)) {
      errors.push('Missing or invalid answers array');
      return { 
        errors, 
        totalQuestions, 
        answeredQuestions: 0, 
        blankAnswers: totalQuestions,
        averageConfidence: 0 
      };
    }

    // Check answer count matches exam
    if (answersData.answers.length !== totalQuestions) {
      errors.push(`Answer count mismatch: expected ${totalQuestions} answers, found ${answersData.answers.length}`);
    }

    // Validate each answer
    for (let i = 0; i < answersData.answers.length; i++) {
      const answer = answersData.answers[i];
      const questionId = i + 1;

      // Check for required fields
      if (!answer.answer || answer.answer.trim() === '') {
        errors.push(`Question ${questionId}: Answer is blank or missing`);
        blankAnswers++;
      } else {
        answeredQuestions++;
      }

      if (!answer.reasoning || answer.reasoning.trim() === '') {
        errors.push(`Question ${questionId}: Reasoning is blank or missing`);
      }

      if (typeof answer.confidence !== 'number' || answer.confidence <= 0) {
        errors.push(`Question ${questionId}: Invalid confidence score (must be > 0)`);
      } else {
        confidenceSum += answer.confidence;
        confidenceCount++;
      }
    }

    const averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

    // Critical validation: No blank answers allowed
    if (blankAnswers > 0) {
      errors.push(`CRITICAL: ${blankAnswers} questions left blank. All questions must be answered before proceeding.`);
    }

    return {
      errors,
      totalQuestions,
      answeredQuestions,
      blankAnswers,
      averageConfidence: Math.round(averageConfidence * 100) / 100
    };
  }

  assembleExamFromEvidence(evidenceData, questionsData) {
    const timestamp = new Date().toISOString();
    
    return {
      metadata: {
        title: "Code Analysis Tool Learning Examination",
        description: "Comprehensive examination covering all technical domains from systematic document analysis",
        version: "1.0.0",
        created: timestamp,
        total_questions: questionsData.questions.length,
        source_documents: evidenceData.phase_1_2_evidence.document_summaries.length,
        methodology: "hybrid_evidence_based"
      },
      questions: questionsData.questions,
      solutions: questionsData.solutions,
      audit_trail: {
        evidence_source: evidenceData.phase_1_2_evidence,
        documents_processed: evidenceData.phase_1_2_evidence.document_summaries.map(d => d.document),
        total_domains_covered: evidenceData.phase_1_2_evidence.document_summaries.reduce((sum, doc) => 
          sum + doc.technical_domains.length, 0),
        assembly_timestamp: timestamp,
        traceability: "All questions traced to specific document evidence"
      }
    };
  }
}

module.exports = { CommandHandler };
