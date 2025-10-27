const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');

const execAsync = promisify(exec);

class FileService {
  constructor() {
    this.basePath = process.env.FILE_BASE_PATH || '/workspace/files';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
  }

  async createFile(filePath, content, options = {}) {
    try {
      const fullPath = this.resolvePath(filePath);
      const directory = path.dirname(fullPath);
      
      // Create directory if it doesn't exist
      await fs.mkdir(directory, { recursive: true });
      
      // Check file size
      if (content.length > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
      }
      
      // Write file
      await fs.writeFile(fullPath, content, options.encoding || 'utf8');
      
      // Get file stats
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        path: filePath,
        fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        hash: this.calculateHash(content)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  }

  async readFile(filePath, options = {}) {
    try {
      const fullPath = this.resolvePath(filePath);
      
      // Check if file exists
      await fs.access(fullPath);
      
      const content = await fs.readFile(fullPath, options.encoding || 'utf8');
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        path: filePath,
        fullPath,
        content,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        hash: this.calculateHash(content)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
        content: null
      };
    }
  }

  async updateFile(filePath, content, options = {}) {
    try {
      const fullPath = this.resolvePath(filePath);
      
      // Check if file exists
      await fs.access(fullPath);
      
      // Check file size
      if (content.length > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
      }
      
      // Get original stats
      const originalStats = await fs.stat(fullPath);
      
      // Write updated content
      await fs.writeFile(fullPath, content, options.encoding || 'utf8');
      
      // Get updated stats
      const updatedStats = await fs.stat(fullPath);
      
      return {
        success: true,
        path: filePath,
        fullPath,
        size: updatedStats.size,
        originalSize: originalStats.size,
        created: originalStats.birthtime,
        modified: updatedStats.mtime,
        hash: this.calculateHash(content)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  }

  async deleteFile(filePath, options = {}) {
    try {
      const fullPath = this.resolvePath(filePath);
      
      // Check if file exists
      await fs.access(fullPath);
      
      // Get file stats before deletion
      const stats = await fs.stat(fullPath);
      
      // Delete file
      await fs.unlink(fullPath);
      
      return {
        success: true,
        path: filePath,
        fullPath,
        size: stats.size,
        deleted: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  }

  async listFiles(directoryPath, options = {}) {
    try {
      const fullPath = this.resolvePath(directoryPath);
      
      // Check if directory exists
      await fs.access(fullPath);
      
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      
      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(fullPath, file.name);
          const stats = await fs.stat(filePath);
          
          return {
            name: file.name,
            path: path.join(directoryPath, file.name),
            fullPath: filePath,
            isDirectory: file.isDirectory(),
            isFile: file.isFile(),
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
      );
      
      // Sort files
      if (options.sortBy) {
        fileList.sort((a, b) => {
          switch (options.sortBy) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'size':
              return b.size - a.size;
            case 'modified':
              return b.modified - a.modified;
            case 'created':
              return b.created - a.created;
            default:
              return 0;
          }
        });
      }
      
      return {
        success: true,
        path: directoryPath,
        fullPath,
        files: fileList,
        count: fileList.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: directoryPath,
        files: []
      };
    }
  }

  async createDirectory(directoryPath, options = {}) {
    try {
      const fullPath = this.resolvePath(directoryPath);
      
      await fs.mkdir(fullPath, { recursive: true });
      
      const stats = await fs.stat(fullPath);
      
      return {
        success: true,
        path: directoryPath,
        fullPath,
        created: stats.birthtime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: directoryPath
      };
    }
  }

  async deleteDirectory(directoryPath, options = {}) {
    try {
      const fullPath = this.resolvePath(directoryPath);
      
      // Check if directory exists
      await fs.access(fullPath);
      
      if (options.recursive) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.rmdir(fullPath);
      }
      
      return {
        success: true,
        path: directoryPath,
        fullPath,
        deleted: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: directoryPath
      };
    }
  }

  async copyFile(sourcePath, destinationPath, options = {}) {
    try {
      const sourceFullPath = this.resolvePath(sourcePath);
      const destinationFullPath = this.resolvePath(destinationPath);
      const destinationDir = path.dirname(destinationFullPath);
      
      // Create destination directory if it doesn't exist
      await fs.mkdir(destinationDir, { recursive: true });
      
      // Copy file
      await fs.copyFile(sourceFullPath, destinationFullPath);
      
      const stats = await fs.stat(destinationFullPath);
      
      return {
        success: true,
        sourcePath,
        destinationPath,
        sourceFullPath,
        destinationFullPath,
        size: stats.size,
        copied: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sourcePath,
        destinationPath
      };
    }
  }

  async moveFile(sourcePath, destinationPath, options = {}) {
    try {
      const sourceFullPath = this.resolvePath(sourcePath);
      const destinationFullPath = this.resolvePath(destinationPath);
      const destinationDir = path.dirname(destinationFullPath);
      
      // Create destination directory if it doesn't exist
      await fs.mkdir(destinationDir, { recursive: true });
      
      // Move file
      await fs.rename(sourceFullPath, destinationFullPath);
      
      const stats = await fs.stat(destinationFullPath);
      
      return {
        success: true,
        sourcePath,
        destinationPath,
        sourceFullPath,
        destinationFullPath,
        size: stats.size,
        moved: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        sourcePath,
        destinationPath
      };
    }
  }

  async searchFiles(directoryPath, searchTerm, options = {}) {
    try {
      const fullPath = this.resolvePath(directoryPath);
      
      // Use grep for text search
      const command = options.caseSensitive 
        ? `grep -r "${searchTerm}" "${fullPath}"`
        : `grep -ri "${searchTerm}" "${fullPath}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      const results = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [filePath, ...contentParts] = line.split(':');
          return {
            file: filePath.replace(fullPath, '').substring(1),
            fullPath: filePath,
            content: contentParts.join(':').trim(),
            lineNumber: this.extractLineNumber(line)
          };
        });
      
      return {
        success: true,
        searchTerm,
        directory: directoryPath,
        results,
        count: results.length
      };
    } catch (error) {
      // grep returns exit code 1 when no matches found
      if (error.code === 1) {
        return {
          success: true,
          searchTerm,
          directory: directoryPath,
          results: [],
          count: 0
        };
      }
      
      return {
        success: false,
        error: error.message,
        searchTerm,
        directory: directoryPath,
        results: []
      };
    }
  }

  async getFileInfo(filePath) {
    try {
      const fullPath = this.resolvePath(filePath);
      
      const stats = await fs.stat(fullPath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      return {
        success: true,
        path: filePath,
        fullPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions: stats.mode.toString(8),
        hash: this.calculateHash(content),
        lines: content.split('\n').length,
        encoding: 'utf8'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath
      };
    }
  }

  async watchFile(filePath, callback, options = {}) {
    try {
      const fullPath = this.resolvePath(filePath);
      
      // Use fs.watch for file watching
      const watcher = fs.watch(fullPath, options, (eventType, filename) => {
        callback({
          eventType,
          filename,
          path: filePath,
          fullPath,
          timestamp: new Date()
        });
      });
      
      return {
        success: true,
        path: filePath,
        fullPath,
        watcher
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
        watcher: null
      };
    }
  }

  async compressFiles(filePaths, outputPath, options = {}) {
    try {
      const fullOutputPath = this.resolvePath(outputPath);
      const outputDir = path.dirname(fullOutputPath);
      
      // Create output directory if it doesn't exist
      await fs.mkdir(outputDir, { recursive: true });
      
      // Create tar archive
      const filesToCompress = filePaths.map(p => this.resolvePath(p)).join(' ');
      const command = `tar -czf "${fullOutputPath}" ${filesToCompress}`;
      
      const { stdout, stderr } = await execAsync(command);
      
      const stats = await fs.stat(fullOutputPath);
      
      return {
        success: true,
        outputPath,
        fullOutputPath,
        files: filePaths,
        size: stats.size,
        created: stats.birthtime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        outputPath,
        files: filePaths
      };
    }
  }

  async extractArchive(archivePath, outputDirectory, options = {}) {
    try {
      const fullArchivePath = this.resolvePath(archivePath);
      const fullOutputDir = this.resolvePath(outputDirectory);
      
      // Create output directory if it doesn't exist
      await fs.mkdir(fullOutputDir, { recursive: true });
      
      // Extract archive
      const command = `tar -xzf "${fullArchivePath}" -C "${fullOutputDir}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        archivePath,
        outputDirectory,
        fullArchivePath,
        fullOutputDir,
        extracted: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        archivePath,
        outputDirectory
      };
    }
  }

  async calculateFileHash(filePath, algorithm = 'sha256') {
    try {
      const fullPath = this.resolvePath(filePath);
      const content = await fs.readFile(fullPath);
      
      const hash = crypto.createHash(algorithm).update(content).digest('hex');
      
      return {
        success: true,
        path: filePath,
        algorithm,
        hash
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: filePath,
        algorithm,
        hash: null
      };
    }
  }

  async compareFiles(filePath1, filePath2) {
    try {
      const fullPath1 = this.resolvePath(filePath1);
      const fullPath2 = this.resolvePath(filePath2);
      
      const content1 = await fs.readFile(fullPath1, 'utf8');
      const content2 = await fs.readFile(fullPath2, 'utf8');
      
      const hash1 = this.calculateHash(content1);
      const hash2 = this.calculateHash(content2);
      
      const lines1 = content1.split('\n');
      const lines2 = content2.split('\n');
      
      const differences = [];
      const maxLines = Math.max(lines1.length, lines2.length);
      
      for (let i = 0; i < maxLines; i++) {
        if (lines1[i] !== lines2[i]) {
          differences.push({
            line: i + 1,
            file1: lines1[i] || '',
            file2: lines2[i] || ''
          });
        }
      }
      
      return {
        success: true,
        file1: filePath1,
        file2: filePath2,
        identical: hash1 === hash2,
        differences,
        totalDifferences: differences.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        file1: filePath1,
        file2: filePath2
      };
    }
  }

  resolvePath(filePath) {
    // Ensure path is within base directory for security
    const resolved = path.resolve(this.basePath, filePath);
    
    if (!resolved.startsWith(this.basePath)) {
      throw new Error('Path traversal not allowed');
    }
    
    return resolved;
  }

  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  extractLineNumber(line) {
    const match = line.match(/:(\d+):/);
    return match ? parseInt(match[1]) : null;
  }

  async getDirectorySize(directoryPath) {
    try {
      const fullPath = this.resolvePath(directoryPath);
      
      const { stdout } = await execAsync(`du -sb "${fullPath}"`);
      const size = parseInt(stdout.split('\t')[0]);
      
      return {
        success: true,
        path: directoryPath,
        fullPath,
        size
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: directoryPath,
        size: 0
      };
    }
  }

  async cleanupOldFiles(directoryPath, maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    try {
      const fullPath = this.resolvePath(directoryPath);
      const files = await fs.readdir(fullPath, { withFileTypes: true });
      
      const now = Date.now();
      const deletedFiles = [];
      
      for (const file of files) {
        const filePath = path.join(fullPath, file.name);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          deletedFiles.push({
            name: file.name,
            path: path.join(directoryPath, file.name),
            size: stats.size,
            deleted: new Date()
          });
        }
      }
      
      return {
        success: true,
        directory: directoryPath,
        deletedFiles,
        count: deletedFiles.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        directory: directoryPath,
        deletedFiles: []
      };
    }
  }
}

module.exports = new FileService();