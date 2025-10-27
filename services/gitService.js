const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const execAsync = promisify(exec);

class GitService {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN;
    this.githubApiUrl = 'https://api.github.com';
  }

  async clone(repository, options = {}) {
    try {
      const { url, branch = 'main', directory } = options;
      const targetDir = directory || `/tmp/repos/${Date.now()}`;
      
      await execAsync(`mkdir -p ${targetDir}`);
      
      const cloneCommand = branch !== 'main' 
        ? `git clone -b ${branch} ${url} ${targetDir}`
        : `git clone ${url} ${targetDir}`;
      
      const { stdout, stderr } = await execAsync(cloneCommand);
      
      return {
        success: true,
        directory: targetDir,
        branch,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        directory: null
      };
    }
  }

  async commit(repository, options = {}) {
    try {
      const { message, files = [], author } = options;
      const repoPath = repository.path || repository;
      
      // Add files to staging
      if (files.length > 0) {
        await execAsync(`cd ${repoPath} && git add ${files.join(' ')}`);
      } else {
        await execAsync(`cd ${repoPath} && git add .`);
      }
      
      // Configure git user if provided
      if (author) {
        await execAsync(`cd ${repoPath} && git config user.name "${author.name}"`);
        await execAsync(`cd ${repoPath} && git config user.email "${author.email}"`);
      }
      
      // Commit changes
      const { stdout, stderr } = await execAsync(
        `cd ${repoPath} && git commit -m "${message}"`
      );
      
      return {
        success: true,
        message,
        files,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        message: options.message
      };
    }
  }

  async push(repository, options = {}) {
    try {
      const { branch = 'main', remote = 'origin' } = options;
      const repoPath = repository.path || repository;
      
      const { stdout, stderr } = await execAsync(
        `cd ${repoPath} && git push ${remote} ${branch}`
      );
      
      return {
        success: true,
        branch,
        remote,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        branch: options.branch || 'main'
      };
    }
  }

  async pull(repository, options = {}) {
    try {
      const { branch = 'main', remote = 'origin' } = options;
      const repoPath = repository.path || repository;
      
      const { stdout, stderr } = await execAsync(
        `cd ${repoPath} && git pull ${remote} ${branch}`
      );
      
      return {
        success: true,
        branch,
        remote,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        branch: options.branch || 'main'
      };
    }
  }

  async createBranch(repository, options = {}) {
    try {
      const { branchName, fromBranch = 'main' } = options;
      const repoPath = repository.path || repository;
      
      // Create and checkout new branch
      const { stdout, stderr } = await execAsync(
        `cd ${repoPath} && git checkout -b ${branchName} ${fromBranch}`
      );
      
      return {
        success: true,
        branchName,
        fromBranch,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        branchName: options.branchName
      };
    }
  }

  async merge(repository, options = {}) {
    try {
      const { sourceBranch, targetBranch = 'main' } = options;
      const repoPath = repository.path || repository;
      
      // Switch to target branch
      await execAsync(`cd ${repoPath} && git checkout ${targetBranch}`);
      
      // Merge source branch
      const { stdout, stderr } = await execAsync(
        `cd ${repoPath} && git merge ${sourceBranch}`
      );
      
      return {
        success: true,
        sourceBranch,
        targetBranch,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        sourceBranch: options.sourceBranch,
        targetBranch: options.targetBranch || 'main'
      };
    }
  }

  async getStatus(repository) {
    try {
      const repoPath = repository.path || repository;
      
      const { stdout } = await execAsync(`cd ${repoPath} && git status --porcelain`);
      const { stdout: branch } = await execAsync(`cd ${repoPath} && git branch --show-current`);
      const { stdout: lastCommit } = await execAsync(`cd ${repoPath} && git log -1 --oneline`);
      
      return {
        success: true,
        status: stdout.trim(),
        currentBranch: branch.trim(),
        lastCommit: lastCommit.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLog(repository, options = {}) {
    try {
      const { limit = 10, branch } = options;
      const repoPath = repository.path || repository;
      
      const command = branch 
        ? `cd ${repoPath} && git log --oneline -n ${limit} ${branch}`
        : `cd ${repoPath} && git log --oneline -n ${limit}`;
      
      const { stdout } = await execAsync(command);
      
      const commits = stdout.trim().split('\n').map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' ')
        };
      });
      
      return {
        success: true,
        commits,
        limit
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        commits: []
      };
    }
  }

  async createPullRequest(repository, options = {}) {
    try {
      const { title, body, head, base = 'main' } = options;
      
      if (!this.githubToken) {
        throw new Error('GitHub token not configured');
      }
      
      const [owner, repo] = this.parseRepositoryUrl(repository);
      
      const response = await axios.post(
        `${this.githubApiUrl}/repos/${owner}/${repo}/pulls`,
        {
          title,
          body,
          head,
          base
        },
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      return {
        success: true,
        pullRequest: response.data,
        number: response.data.number,
        url: response.data.html_url
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async createIssue(repository, options = {}) {
    try {
      const { title, body, labels = [], assignees = [] } = options;
      
      if (!this.githubToken) {
        throw new Error('GitHub token not configured');
      }
      
      const [owner, repo] = this.parseRepositoryUrl(repository);
      
      const response = await axios.post(
        `${this.githubApiUrl}/repos/${owner}/${repo}/issues`,
        {
          title,
          body,
          labels,
          assignees
        },
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      return {
        success: true,
        issue: response.data,
        number: response.data.number,
        url: response.data.html_url
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getBranches(repository) {
    try {
      const repoPath = repository.path || repository;
      
      const { stdout } = await execAsync(`cd ${repoPath} && git branch -a`);
      
      const branches = stdout.trim().split('\n').map(line => {
        const cleaned = line.replace(/^\*\s*/, '').replace(/^remotes\/origin\//, '');
        return {
          name: cleaned,
          isCurrent: line.startsWith('*'),
          isRemote: line.includes('remotes/')
        };
      });
      
      return {
        success: true,
        branches
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        branches: []
      };
    }
  }

  async getDiff(repository, options = {}) {
    try {
      const { branch, file } = options;
      const repoPath = repository.path || repository;
      
      let command = `cd ${repoPath} && git diff`;
      
      if (branch) {
        command += ` ${branch}`;
      }
      
      if (file) {
        command += ` -- ${file}`;
      }
      
      const { stdout } = await execAsync(command);
      
      return {
        success: true,
        diff: stdout,
        branch: branch || 'working directory',
        file: file || 'all files'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        diff: ''
      };
    }
  }

  async stash(repository, options = {}) {
    try {
      const { message = 'Stash', includeUntracked = false } = options;
      const repoPath = repository.path || repository;
      
      const command = includeUntracked 
        ? `cd ${repoPath} && git stash push -u -m "${message}"`
        : `cd ${repoPath} && git stash push -m "${message}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        message,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: ''
      };
    }
  }

  async stashPop(repository) {
    try {
      const repoPath = repository.path || repository;
      
      const { stdout, stderr } = await execAsync(`cd ${repoPath} && git stash pop`);
      
      return {
        success: true,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: ''
      };
    }
  }

  async reset(repository, options = {}) {
    try {
      const { mode = 'soft', commit = 'HEAD' } = options;
      const repoPath = repository.path || repository;
      
      const { stdout, stderr } = await execAsync(
        `cd ${repoPath} && git reset --${mode} ${commit}`
      );
      
      return {
        success: true,
        mode,
        commit,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: ''
      };
    }
  }

  async tag(repository, options = {}) {
    try {
      const { tagName, message, commit = 'HEAD' } = options;
      const repoPath = repository.path || repository;
      
      const command = message 
        ? `cd ${repoPath} && git tag -a ${tagName} -m "${message}" ${commit}`
        : `cd ${repoPath} && git tag ${tagName} ${commit}`;
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        tagName,
        message,
        commit,
        output: stdout,
        error: stderr
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: ''
      };
    }
  }

  async getTags(repository) {
    try {
      const repoPath = repository.path || repository;
      
      const { stdout } = await execAsync(`cd ${repoPath} && git tag -l`);
      
      const tags = stdout.trim().split('\n').filter(tag => tag.length > 0);
      
      return {
        success: true,
        tags
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tags: []
      };
    }
  }

  parseRepositoryUrl(repository) {
    if (typeof repository === 'string') {
      // Handle different URL formats
      const match = repository.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (match) {
        return [match[1], match[2]];
      }
      throw new Error('Invalid repository URL format');
    }
    
    // Handle repository object with owner and name
    if (repository.owner && repository.name) {
      return [repository.owner, repository.name];
    }
    
    throw new Error('Invalid repository format');
  }

  async getRepositoryInfo(repository) {
    try {
      const [owner, repo] = this.parseRepositoryUrl(repository);
      
      if (!this.githubToken) {
        throw new Error('GitHub token not configured');
      }
      
      const response = await axios.get(
        `${this.githubApiUrl}/repos/${owner}/${repo}`,
        {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      return {
        success: true,
        repository: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

module.exports = new GitService();