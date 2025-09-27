const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');

/**
 * Simple, unified service for all file operations
 * No over-engineering, no multiple patterns - just works
 */
class FileService {
  async exists(filePath) {
    return await fs.pathExists(filePath);
  }

  async writeJson(filePath, data) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeJson(filePath, data, { spaces: 2 });
  }

  async writeYaml(filePath, data, comments = '') {
    await fs.ensureDir(path.dirname(filePath));
    const yamlContent = comments + yaml.dump(data);
    await fs.writeFile(filePath, yamlContent);
  }

  async readJson(filePath) {
    return await fs.readJson(filePath);
  }

  async readYaml(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return yaml.load(content);
  }

  async copy(source, target) {
    await fs.ensureDir(path.dirname(target));
    await fs.copy(source, target);
  }

  async ensureDir(dirPath) {
    await fs.ensureDir(dirPath);
  }
}

/**
 * Simple skeleton creation - no factory pattern nonsense
 */
class Skeletons {
  static knowledgeBaseline() {
    return {
      metadata: {
        iteration: 0,
        created: new Date().toISOString(),
        source_documents: []
      },
      knowledge_domains: []
    };
  }

  static examSkeleton() {
    return {
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        total_questions: 0
      },
      questions: [
        {
          id: '',
          type: '',
          question: '',
          category: '',
          difficulty: ''
        }
      ],
      solutions: [
        {
          id: '',
          answer: '',
          evidence_sources: ['']
        }
      ]
    };
  }

  static examDraftSkeleton() {
    return {
      metadata: {
        created_from_evidence: 'learning_evidence.yaml',
        generation_timestamp: new Date().toISOString(),
        total_questions: 0,
        domains_covered: 0
      },
      questions: [
        {
          id: 'Q001',
          type: 'factual|conceptual|analytical|synthesis',
          question: 'Your question here',
          category: 'TECHNICAL_DOMAIN_NAME',
          difficulty: 'basic|intermediate|advanced',
          source_domain: 'TECHNICAL_DOMAIN_NAME',
          source_document: 'document_name.md',
          evidence_line_refs: [0, 0, 0]
        }
      ],
      solutions: [
        {
          id: 'Q001',
          answer: 'Your answer here',
          evidence_sources: ['document_name.md:line_number']
        }
      ]
    };
  }

  static answersFromExam(examData, iterationName) {
    return {
      metadata: {
        iteration: iterationName,
        created: new Date().toISOString()
      },
      answers: examData.questions.map(question => ({
        id: question.id,
        question: question.question,
        answer: '',
        confidence: 0,
        reasoning: ''
      }))
    };
  }

  static learningTemplate(documentFiles) {
    return {
      phase_1_2_evidence: {
        documents_processed: documentFiles.length,
        total_lines_read: 0,
        processing_timestamp: "",
        document_summaries: documentFiles.map(docPath => ({
          document: path.basename(docPath),
          full_path: docPath,
          lines_read: 0,
          technical_domains: [
            {
              domain: "DOMAIN_NAME_HERE",
              key_concepts: ["concept1", "concept2", "concept3"],
              evidence_line_refs: [0, 0, 0]
            }
          ],
          verification_hash: ""
        }))
      }
    };
  }
}

/**
 * Simple path helper - no service class needed
 */
class Paths {
  constructor(contextDir) {
    this.contextDir = contextDir;
  }

  examFile() {
    return path.join(this.contextDir, 'context', 'exam.yaml');
  }

  examDraftSkeleton() {
    return path.join(this.contextDir, 'context', 'exam_draft.yaml');
  }

  knowledgeBaseline() {
    return path.join(this.contextDir, 'context', 'knowledge_iter0.json');
  }

  iterationDir(iterName) {
    return path.join(this.contextDir, 'context', iterName);
  }

  iterationKnowledge(iterName) {
    return path.join(this.iterationDir(iterName), `knowledge_${iterName}.json`);
  }

  iterationAnswers(iterName) {
    return path.join(this.iterationDir(iterName), 'answers.json');
  }

  previousKnowledge(iterName) {
    const iterNum = parseInt(iterName.replace('iter', ''));
    if (iterNum === 1) {
      return this.knowledgeBaseline();
    } else {
      const prevIter = `iter${iterNum - 1}`;
      return path.join(this.contextDir, 'context', prevIter, `knowledge_iter${iterNum - 1}.json`);
    }
  }

  isValidIterName(iterName) {
    return iterName && iterName.startsWith('iter') && !isNaN(parseInt(iterName.replace('iter', '')));
  }

  // New hybrid approach paths
  learningTemplate() {
    return path.join(this.contextDir, 'context', 'learning_template.yaml');
  }

  learningEvidence() {
    return path.join(this.contextDir, 'context', 'learning_evidence.yaml');
  }

  examDraft() {
    return path.join(this.contextDir, 'context', 'exam_draft.yaml');
  }
}

module.exports = { FileService, Skeletons, Paths };
