const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const execAsync = promisify(exec);

class TestingService {
  constructor() {
    this.testRuns = new Map();
    this.testFrameworks = {
      jest: {
        name: 'Jest',
        command: 'npm test',
        configFile: 'jest.config.js',
        setup: this.setupJest.bind(this)
      },
      mocha: {
        name: 'Mocha',
        command: 'npx mocha',
        configFile: '.mocharc.js',
        setup: this.setupMocha.bind(this)
      },
      cypress: {
        name: 'Cypress',
        command: 'npx cypress run',
        configFile: 'cypress.config.js',
        setup: this.setupCypress.bind(this)
      },
      playwright: {
        name: 'Playwright',
        command: 'npx playwright test',
        configFile: 'playwright.config.js',
        setup: this.setupPlaywright.bind(this)
      },
      vitest: {
        name: 'Vitest',
        command: 'npx vitest run',
        configFile: 'vitest.config.js',
        setup: this.setupVitest.bind(this)
      },
      pytest: {
        name: 'pytest',
        command: 'python -m pytest',
        configFile: 'pytest.ini',
        setup: this.setupPytest.bind(this)
      },
      unittest: {
        name: 'unittest',
        command: 'python -m unittest',
        configFile: null,
        setup: this.setupUnittest.bind(this)
      },
      rspec: {
        name: 'RSpec',
        command: 'bundle exec rspec',
        configFile: 'spec/spec_helper.rb',
        setup: this.setupRspec.bind(this)
      },
      minitest: {
        name: 'Minitest',
        command: 'bundle exec rake test',
        configFile: 'test/test_helper.rb',
        setup: this.setupMinitest.bind(this)
      }
    };
  }

  async runTests(testType, testFiles, configuration, context = {}) {
    try {
      const testRunId = this.generateTestRunId();
      const startTime = Date.now();
      
      // Initialize test run record
      this.testRuns.set(testRunId, {
        id: testRunId,
        testType,
        testFiles,
        configuration,
        status: 'running',
        startTime,
        logs: [],
        results: null
      });

      // Get test framework
      const framework = this.testFrameworks[testType];
      if (!framework) {
        throw new Error(`Unsupported test framework: ${testType}`);
      }

      // Setup test environment
      await this.setupTestEnvironment(testType, configuration, context);

      // Run tests
      const result = await this.executeTests(framework, testFiles, configuration, context);
      
      // Update test run status
      const testRun = this.testRuns.get(testRunId);
      testRun.status = result.success ? 'passed' : 'failed';
      testRun.endTime = Date.now();
      testRun.duration = testRun.endTime - testRun.startTime;
      testRun.results = result;

      this.addLog(testRunId, `Test run ${result.success ? 'completed successfully' : 'failed'}`);

      return {
        success: result.success,
        testRunId,
        framework: framework.name,
        results: result,
        logs: testRun.logs,
        duration: testRun.duration,
        error: result.error
      };

    } catch (error) {
      const testRun = this.testRuns.get(testRunId);
      if (testRun) {
        testRun.status = 'failed';
        testRun.endTime = Date.now();
        testRun.duration = testRun.endTime - testRun.startTime;
        this.addLog(testRunId, `Test run failed: ${error.message}`);
      }

      return {
        success: false,
        error: error.message,
        testRunId,
        framework: testType
      };
    }
  }

  async executeTests(framework, testFiles, configuration, context) {
    try {
      const { projectPath } = context;
      const command = this.buildTestCommand(framework, testFiles, configuration);
      
      this.addLog(context.testRunId, `Running command: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout: configuration.timeout || 300000 // 5 minutes default
      });

      // Parse test results
      const results = this.parseTestResults(framework.name, stdout, stderr);

      return {
        success: results.passed > 0 && results.failed === 0,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped,
        total: results.total,
        coverage: results.coverage,
        output: stdout,
        error: stderr,
        details: results.details
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        passed: 0,
        failed: 1,
        skipped: 0,
        total: 1,
        output: '',
        details: []
      };
    }
  }

  async setupTestEnvironment(testType, configuration, context) {
    const framework = this.testFrameworks[testType];
    
    if (framework.setup) {
      await framework.setup(configuration, context);
    }
  }

  // Jest setup
  async setupJest(configuration, context) {
    const { projectPath } = context;
    const configPath = path.join(projectPath, 'jest.config.js');
    
    // Check if Jest config exists
    try {
      await fs.access(configPath);
    } catch (error) {
      // Create default Jest config
      const defaultConfig = {
        testEnvironment: 'node',
        testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
        collectCoverage: true,
        coverageDirectory: 'coverage',
        coverageReporters: ['text', 'lcov', 'html']
      };
      
      await fs.writeFile(configPath, `module.exports = ${JSON.stringify(defaultConfig, null, 2)};`);
    }

    // Install Jest if not present
    try {
      await execAsync('npm list jest', { cwd: projectPath });
    } catch (error) {
      await execAsync('npm install --save-dev jest', { cwd: projectPath });
    }
  }

  // Mocha setup
  async setupMocha(configuration, context) {
    const { projectPath } = context;
    const configPath = path.join(projectPath, '.mocharc.js');
    
    // Check if Mocha config exists
    try {
      await fs.access(configPath);
    } catch (error) {
      // Create default Mocha config
      const defaultConfig = {
        spec: 'test/**/*.js',
        reporter: 'spec',
        timeout: 5000
      };
      
      await fs.writeFile(configPath, `module.exports = ${JSON.stringify(defaultConfig, null, 2)};`);
    }

    // Install Mocha if not present
    try {
      await execAsync('npm list mocha', { cwd: projectPath });
    } catch (error) {
      await execAsync('npm install --save-dev mocha', { cwd: projectPath });
    }
  }

  // Cypress setup
  async setupCypress(configuration, context) {
    const { projectPath } = context;
    
    // Install Cypress if not present
    try {
      await execAsync('npm list cypress', { cwd: projectPath });
    } catch (error) {
      await execAsync('npm install --save-dev cypress', { cwd: projectPath });
    }

    // Initialize Cypress if not already done
    const cypressConfigPath = path.join(projectPath, 'cypress.config.js');
    try {
      await fs.access(cypressConfigPath);
    } catch (error) {
      await execAsync('npx cypress open --e2e --browser chrome', { cwd: projectPath });
    }
  }

  // Playwright setup
  async setupPlaywright(configuration, context) {
    const { projectPath } = context;
    
    // Install Playwright if not present
    try {
      await execAsync('npm list @playwright/test', { cwd: projectPath });
    } catch (error) {
      await execAsync('npm install --save-dev @playwright/test', { cwd: projectPath });
      await execAsync('npx playwright install', { cwd: projectPath });
    }
  }

  // Vitest setup
  async setupVitest(configuration, context) {
    const { projectPath } = context;
    
    // Install Vitest if not present
    try {
      await execAsync('npm list vitest', { cwd: projectPath });
    } catch (error) {
      await execAsync('npm install --save-dev vitest', { cwd: projectPath });
    }
  }

  // pytest setup
  async setupPytest(configuration, context) {
    const { projectPath } = context;
    
    // Install pytest if not present
    try {
      await execAsync('python -m pytest --version', { cwd: projectPath });
    } catch (error) {
      await execAsync('pip install pytest', { cwd: projectPath });
    }
  }

  // unittest setup
  async setupUnittest(configuration, context) {
    // unittest is part of Python standard library
    // No additional setup needed
  }

  // RSpec setup
  async setupRspec(configuration, context) {
    const { projectPath } = context;
    
    // Install RSpec if not present
    try {
      await execAsync('bundle exec rspec --version', { cwd: projectPath });
    } catch (error) {
      await execAsync('bundle add --group development,test rspec', { cwd: projectPath });
    }
  }

  // Minitest setup
  async setupMinitest(configuration, context) {
    // Minitest is part of Ruby standard library
    // No additional setup needed
  }

  buildTestCommand(framework, testFiles, configuration) {
    let command = framework.command;
    
    // Add test files if specified
    if (testFiles && testFiles.length > 0) {
      command += ` ${testFiles.join(' ')}`;
    }
    
    // Add configuration options
    if (configuration.options) {
      command += ` ${configuration.options}`;
    }
    
    // Add coverage if requested
    if (configuration.coverage) {
      if (framework.name === 'Jest') {
        command += ' --coverage';
      } else if (framework.name === 'Mocha') {
        command += ' --reporter json-cov';
      }
    }
    
    // Add verbose output
    if (configuration.verbose) {
      command += ' --verbose';
    }
    
    return command;
  }

  parseTestResults(frameworkName, stdout, stderr) {
    switch (frameworkName) {
      case 'Jest':
        return this.parseJestResults(stdout, stderr);
      case 'Mocha':
        return this.parseMochaResults(stdout, stderr);
      case 'Cypress':
        return this.parseCypressResults(stdout, stderr);
      case 'Playwright':
        return this.parsePlaywrightResults(stdout, stderr);
      case 'Vitest':
        return this.parseVitestResults(stdout, stderr);
      case 'pytest':
        return this.parsePytestResults(stdout, stderr);
      case 'unittest':
        return this.parseUnittestResults(stdout, stderr);
      case 'RSpec':
        return this.parseRspecResults(stdout, stderr);
      case 'Minitest':
        return this.parseMinitestResults(stdout, stderr);
      default:
        return this.parseGenericResults(stdout, stderr);
    }
  }

  parseJestResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse test summary
    const summaryMatch = stdout.match(/(\d+) passed|(\d+) failed|(\d+) skipped/g);
    if (summaryMatch) {
      summaryMatch.forEach(match => {
        if (match.includes('passed')) {
          results.passed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('failed')) {
          results.failed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('skipped')) {
          results.skipped = parseInt(match.match(/(\d+)/)[1]);
        }
      });
    }

    results.total = results.passed + results.failed + results.skipped;

    // Parse coverage
    const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      results.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    return results;
  }

  parseMochaResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse test results
    const lines = stdout.split('\n');
    lines.forEach(line => {
      if (line.includes('passing')) {
        results.passed = parseInt(line.match(/(\d+)/)[1]);
      } else if (line.includes('failing')) {
        results.failed = parseInt(line.match(/(\d+)/)[1]);
      }
    });

    results.total = results.passed + results.failed;

    return results;
  }

  parseCypressResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse Cypress results
    const summaryMatch = stdout.match(/(\d+) passing|(\d+) failing/g);
    if (summaryMatch) {
      summaryMatch.forEach(match => {
        if (match.includes('passing')) {
          results.passed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('failing')) {
          results.failed = parseInt(match.match(/(\d+)/)[1]);
        }
      });
    }

    results.total = results.passed + results.failed;

    return results;
  }

  parsePlaywrightResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse Playwright results
    const summaryMatch = stdout.match(/(\d+) passed|(\d+) failed|(\d+) skipped/g);
    if (summaryMatch) {
      summaryMatch.forEach(match => {
        if (match.includes('passed')) {
          results.passed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('failed')) {
          results.failed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('skipped')) {
          results.skipped = parseInt(match.match(/(\d+)/)[1]);
        }
      });
    }

    results.total = results.passed + results.failed + results.skipped;

    return results;
  }

  parseVitestResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse Vitest results
    const summaryMatch = stdout.match(/(\d+) passed|(\d+) failed|(\d+) skipped/g);
    if (summaryMatch) {
      summaryMatch.forEach(match => {
        if (match.includes('passed')) {
          results.passed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('failed')) {
          results.failed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('skipped')) {
          results.skipped = parseInt(match.match(/(\d+)/)[1]);
        }
      });
    }

    results.total = results.passed + results.failed + results.skipped;

    return results;
  }

  parsePytestResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse pytest results
    const summaryMatch = stdout.match(/(\d+) passed|(\d+) failed|(\d+) skipped/g);
    if (summaryMatch) {
      summaryMatch.forEach(match => {
        if (match.includes('passed')) {
          results.passed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('failed')) {
          results.failed = parseInt(match.match(/(\d+)/)[1]);
        } else if (match.includes('skipped')) {
          results.skipped = parseInt(match.match(/(\d+)/)[1]);
        }
      });
    }

    results.total = results.passed + results.failed + results.skipped;

    return results;
  }

  parseUnittestResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse unittest results
    const lines = stdout.split('\n');
    lines.forEach(line => {
      if (line.includes('OK')) {
        results.passed = parseInt(line.match(/(\d+)/)[1]);
        results.total = results.passed;
      } else if (line.includes('FAILED')) {
        results.failed = parseInt(line.match(/(\d+)/)[1]);
        results.total = results.failed;
      }
    });

    return results;
  }

  parseRspecResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse RSpec results
    const summaryMatch = stdout.match(/(\d+) examples?, (\d+) failures?/);
    if (summaryMatch) {
      results.total = parseInt(summaryMatch[1]);
      results.failed = parseInt(summaryMatch[2]);
      results.passed = results.total - results.failed;
    }

    return results;
  }

  parseMinitestResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Parse Minitest results
    const summaryMatch = stdout.match(/(\d+) runs, (\d+) assertions, (\d+) failures, (\d+) errors/);
    if (summaryMatch) {
      results.total = parseInt(summaryMatch[1]);
      results.failed = parseInt(summaryMatch[3]) + parseInt(summaryMatch[4]);
      results.passed = results.total - results.failed;
    }

    return results;
  }

  parseGenericResults(stdout, stderr) {
    const results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      coverage: null,
      details: []
    };

    // Generic parsing - look for common patterns
    const passedMatch = stdout.match(/(\d+)\s+passed|(\d+)\s+passing|(\d+)\s+ok/i);
    const failedMatch = stdout.match(/(\d+)\s+failed|(\d+)\s+failing|(\d+)\s+error/i);

    if (passedMatch) {
      results.passed = parseInt(passedMatch[1] || passedMatch[2] || passedMatch[3]);
    }
    if (failedMatch) {
      results.failed = parseInt(failedMatch[1] || failedMatch[2] || failedMatch[3]);
    }

    results.total = results.passed + results.failed;

    return results;
  }

  async generateTestReport(testRunId, format = 'html') {
    try {
      const testRun = this.testRuns.get(testRunId);
      if (!testRun) {
        throw new Error('Test run not found');
      }

      const report = this.buildTestReport(testRun, format);
      
      return {
        success: true,
        testRunId,
        format,
        report,
        generated: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        testRunId,
        format
      };
    }
  }

  buildTestReport(testRun, format) {
    const { results, duration, startTime, endTime } = testRun;
    
    if (format === 'html') {
      return this.generateHTMLReport(testRun);
    } else if (format === 'json') {
      return this.generateJSONReport(testRun);
    } else if (format === 'xml') {
      return this.generateXMLReport(testRun);
    } else {
      return this.generateTextReport(testRun);
    }
  }

  generateHTMLReport(testRun) {
    const { results, duration, startTime, endTime } = testRun;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${testRun.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .details { margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report</h1>
        <p><strong>Test Run ID:</strong> ${testRun.id}</p>
        <p><strong>Duration:</strong> ${duration}ms</p>
        <p><strong>Started:</strong> ${new Date(startTime).toISOString()}</p>
        <p><strong>Ended:</strong> ${new Date(endTime).toISOString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3 class="passed">${results.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric">
            <h3 class="failed">${results.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3 class="skipped">${results.skipped}</h3>
            <p>Skipped</p>
        </div>
        <div class="metric">
            <h3>${results.total}</h3>
            <p>Total</p>
        </div>
    </div>
    
    ${results.coverage ? `
    <div class="details">
        <h3>Coverage</h3>
        <p>Statements: ${results.coverage.statements}%</p>
        <p>Branches: ${results.coverage.branches}%</p>
        <p>Functions: ${results.coverage.functions}%</p>
        <p>Lines: ${results.coverage.lines}%</p>
    </div>
    ` : ''}
</body>
</html>`;
  }

  generateJSONReport(testRun) {
    return JSON.stringify(testRun, null, 2);
  }

  generateXMLReport(testRun) {
    const { results, duration, startTime, endTime } = testRun;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${testRun.id}" tests="${results.total}" failures="${results.failed}" skipped="${results.skipped}" time="${duration / 1000}">
    <properties>
        <property name="startTime" value="${new Date(startTime).toISOString()}"/>
        <property name="endTime" value="${new Date(endTime).toISOString()}"/>
    </properties>
    ${results.details.map(detail => `
    <testcase name="${detail.name}" classname="${detail.className}" time="${detail.duration / 1000}">
        ${detail.status === 'failed' ? `<failure message="${detail.message}">${detail.stack}</failure>` : ''}
        ${detail.status === 'skipped' ? '<skipped/>' : ''}
    </testcase>
    `).join('')}
</testsuite>`;
  }

  generateTextReport(testRun) {
    const { results, duration, startTime, endTime } = testRun;
    
    return `
Test Report
===========
Test Run ID: ${testRun.id}
Duration: ${duration}ms
Started: ${new Date(startTime).toISOString()}
Ended: ${new Date(endTime).toISOString()}

Summary:
--------
Passed: ${results.passed}
Failed: ${results.failed}
Skipped: ${results.skipped}
Total: ${results.total}

${results.coverage ? `
Coverage:
---------
Statements: ${results.coverage.statements}%
Branches: ${results.coverage.branches}%
Functions: ${results.coverage.functions}%
Lines: ${results.coverage.lines}%
` : ''}
`;
  }

  // Helper methods
  generateTestRunId() {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addLog(testRunId, message) {
    const testRun = this.testRuns.get(testRunId);
    if (testRun) {
      testRun.logs.push({
        timestamp: new Date(),
        message
      });
    }
  }

  async getTestRun(testRunId) {
    const testRun = this.testRuns.get(testRunId);
    if (!testRun) {
      return {
        success: false,
        error: 'Test run not found'
      };
    }

    return {
      success: true,
      testRun
    };
  }

  async getAllTestRuns() {
    return Array.from(this.testRuns.values());
  }

  async getTestRunsByStatus(status) {
    return Array.from(this.testRuns.values()).filter(tr => tr.status === status);
  }

  async getTestRunsByFramework(framework) {
    return Array.from(this.testRuns.values()).filter(tr => tr.testType === framework);
  }
}

module.exports = new TestingService();