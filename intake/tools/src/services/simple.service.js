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
}

/**
 * Simple path helper - no service class needed
 */
class Paths {
  constructor(contextDir) {
    this.contextDir = contextDir;
  }

  examFile() {
    return path.join(this.contextDir, 'exam', 'exam.yaml');
  }

  knowledgeBaseline() {
    return path.join(this.contextDir, 'knowledge_iter0.json');
  }

  iterationDir(iterName) {
    return path.join(this.contextDir, iterName);
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
      return path.join(this.contextDir, prevIter, `knowledge_iter${iterNum - 1}.json`);
    }
  }

  isValidIterName(iterName) {
    return iterName && iterName.startsWith('iter') && !isNaN(parseInt(iterName.replace('iter', '')));
  }
}

module.exports = { FileService, Skeletons, Paths };
