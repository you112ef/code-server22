const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const Docker = require('dockerode');

const execAsync = promisify(exec);

class DeploymentService {
  constructor() {
    this.docker = new Docker();
    this.deployments = new Map();
    this.initializeProviders();
  }

  initializeProviders() {
    this.providers = {
      vercel: {
        name: 'Vercel',
        deploy: this.deployToVercel.bind(this),
        status: this.getVercelStatus.bind(this)
      },
      netlify: {
        name: 'Netlify',
        deploy: this.deployToNetlify.bind(this),
        status: this.getNetlifyStatus.bind(this)
      },
      heroku: {
        name: 'Heroku',
        deploy: this.deployToHeroku.bind(this),
        status: this.getHerokuStatus.bind(this)
      },
      aws: {
        name: 'AWS',
        deploy: this.deployToAWS.bind(this),
        status: this.getAWSStatus.bind(this)
      },
      docker: {
        name: 'Docker',
        deploy: this.deployWithDocker.bind(this),
        status: this.getDockerStatus.bind(this)
      },
      kubernetes: {
        name: 'Kubernetes',
        deploy: this.deployToKubernetes.bind(this),
        status: this.getKubernetesStatus.bind(this)
      }
    };
  }

  async deploy(provider, environment, configuration, context = {}) {
    try {
      const deploymentId = this.generateDeploymentId();
      const startTime = Date.now();
      
      // Initialize deployment record
      this.deployments.set(deploymentId, {
        id: deploymentId,
        provider,
        environment,
        configuration,
        status: 'initializing',
        startTime,
        logs: []
      });

      // Get provider
      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        throw new Error(`Unsupported deployment provider: ${provider}`);
      }

      // Add log entry
      this.addLog(deploymentId, `Starting deployment to ${providerConfig.name}...`);

      // Execute deployment
      const result = await providerConfig.deploy(environment, configuration, context);
      
      // Update deployment status
      const deployment = this.deployments.get(deploymentId);
      deployment.status = result.success ? 'success' : 'failed';
      deployment.endTime = Date.now();
      deployment.duration = deployment.endTime - deployment.startTime;
      deployment.result = result;

      this.addLog(deploymentId, `Deployment ${result.success ? 'completed successfully' : 'failed'}`);

      return {
        success: result.success,
        deploymentId,
        provider: providerConfig.name,
        environment,
        url: result.url,
        logs: deployment.logs,
        duration: deployment.duration,
        error: result.error
      };

    } catch (error) {
      const deployment = this.deployments.get(deploymentId);
      if (deployment) {
        deployment.status = 'failed';
        deployment.endTime = Date.now();
        deployment.duration = deployment.endTime - deployment.startTime;
        this.addLog(deploymentId, `Deployment failed: ${error.message}`);
      }

      return {
        success: false,
        error: error.message,
        deploymentId,
        provider
      };
    }
  }

  async deployToVercel(environment, configuration, context) {
    try {
      const { projectPath, vercelToken, projectName } = configuration;
      
      if (!vercelToken) {
        throw new Error('Vercel token is required');
      }

      // Install Vercel CLI if not present
      await this.ensureVercelCLI();

      // Set Vercel token
      await execAsync(`vercel --token ${vercelToken}`);

      // Deploy to Vercel
      const deployCommand = projectName 
        ? `vercel --prod --name ${projectName}`
        : 'vercel --prod';

      const { stdout, stderr } = await execAsync(deployCommand, {
        cwd: projectPath
      });

      // Extract deployment URL from output
      const urlMatch = stdout.match(/https:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : null;

      return {
        success: true,
        url,
        output: stdout,
        error: stderr
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async deployToNetlify(environment, configuration, context) {
    try {
      const { projectPath, netlifyToken, siteId, buildCommand } = configuration;
      
      if (!netlifyToken) {
        throw new Error('Netlify token is required');
      }

      // Install Netlify CLI if not present
      await this.ensureNetlifyCLI();

      // Set Netlify token
      await execAsync(`netlify login --token ${netlifyToken}`);

      // Build project if build command provided
      if (buildCommand) {
        await execAsync(buildCommand, { cwd: projectPath });
      }

      // Deploy to Netlify
      const deployCommand = siteId 
        ? `netlify deploy --prod --site ${siteId}`
        : 'netlify deploy --prod';

      const { stdout, stderr } = await execAsync(deployCommand, {
        cwd: projectPath
      });

      // Extract deployment URL from output
      const urlMatch = stdout.match(/https:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : null;

      return {
        success: true,
        url,
        output: stdout,
        error: stderr
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async deployToHeroku(environment, configuration, context) {
    try {
      const { projectPath, herokuToken, appName, buildpack } = configuration;
      
      if (!herokuToken) {
        throw new Error('Heroku token is required');
      }

      // Install Heroku CLI if not present
      await this.ensureHerokuCLI();

      // Login to Heroku
      await execAsync(`echo "${herokuToken}" | heroku auth:token`);

      // Create Heroku app if not exists
      if (!appName) {
        const { stdout } = await execAsync('heroku create');
        const appMatch = stdout.match(/https:\/\/[^-\s]+/);
        appName = appMatch ? appMatch[0].replace('https://', '').replace('.herokuapp.com', '') : null;
      }

      // Set buildpack if specified
      if (buildpack) {
        await execAsync(`heroku buildpacks:set ${buildpack} --app ${appName}`);
      }

      // Deploy to Heroku
      const { stdout, stderr } = await execAsync(`git push heroku main`, {
        cwd: projectPath
      });

      const url = `https://${appName}.herokuapp.com`;

      return {
        success: true,
        url,
        appName,
        output: stdout,
        error: stderr
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async deployToAWS(environment, configuration, context) {
    try {
      const { projectPath, awsAccessKey, awsSecretKey, region, bucketName, serviceType } = configuration;
      
      if (!awsAccessKey || !awsSecretKey) {
        throw new Error('AWS credentials are required');
      }

      // Set AWS credentials
      process.env.AWS_ACCESS_KEY_ID = awsAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = awsSecretKey;
      process.env.AWS_DEFAULT_REGION = region || 'us-east-1';

      switch (serviceType) {
        case 's3':
          return await this.deployToS3(projectPath, bucketName, region);
        case 'lambda':
          return await this.deployToLambda(projectPath, configuration);
        case 'ec2':
          return await this.deployToEC2(projectPath, configuration);
        case 'elasticbeanstalk':
          return await this.deployToElasticBeanstalk(projectPath, configuration);
        default:
          throw new Error(`Unsupported AWS service type: ${serviceType}`);
      }

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async deployToS3(projectPath, bucketName, region) {
    try {
      // Install AWS CLI if not present
      await this.ensureAWSCLI();

      // Build project
      await execAsync('npm run build', { cwd: projectPath });

      // Sync to S3
      const { stdout, stderr } = await execAsync(
        `aws s3 sync dist/ s3://${bucketName} --region ${region}`
      );

      const url = `https://${bucketName}.s3-website-${region}.amazonaws.com`;

      return {
        success: true,
        url,
        bucketName,
        output: stdout,
        error: stderr
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async deployWithDocker(environment, configuration, context) {
    try {
      const { projectPath, imageName, port, environment: envVars } = configuration;
      
      // Build Docker image
      const { stdout: buildOutput, stderr: buildError } = await execAsync(
        `docker build -t ${imageName} .`,
        { cwd: projectPath }
      );

      if (buildError && !buildError.includes('Successfully built')) {
        throw new Error(`Docker build failed: ${buildError}`);
      }

      // Run Docker container
      const containerName = `${imageName}-${Date.now()}`;
      const envString = envVars ? Object.entries(envVars).map(([key, value]) => `-e ${key}=${value}`).join(' ') : '';
      
      const { stdout: runOutput, stderr: runError } = await execAsync(
        `docker run -d --name ${containerName} -p ${port || 3000}:3000 ${envString} ${imageName}`
      );

      const containerId = runOutput.trim();
      const url = `http://localhost:${port || 3000}`;

      return {
        success: true,
        url,
        containerId,
        containerName,
        imageName,
        output: `${buildOutput}\n${runOutput}`,
        error: `${buildError}\n${runError}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async deployToKubernetes(environment, configuration, context) {
    try {
      const { projectPath, namespace, deploymentName, imageName, replicas = 1 } = configuration;
      
      // Create Kubernetes deployment YAML
      const deploymentYaml = this.generateKubernetesDeployment({
        name: deploymentName,
        image: imageName,
        replicas,
        namespace
      });

      const yamlPath = path.join(projectPath, 'k8s-deployment.yaml');
      await fs.writeFile(yamlPath, deploymentYaml);

      // Apply Kubernetes deployment
      const { stdout, stderr } = await execAsync(
        `kubectl apply -f ${yamlPath}`
      );

      // Get deployment status
      const { stdout: statusOutput } = await execAsync(
        `kubectl get deployment ${deploymentName} -n ${namespace || 'default'}`
      );

      return {
        success: true,
        deploymentName,
        namespace: namespace || 'default',
        output: `${stdout}\n${statusOutput}`,
        error: stderr
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        url: null
      };
    }
  }

  async getDeploymentStatus(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return {
        success: false,
        error: 'Deployment not found'
      };
    }

    return {
      success: true,
      deployment
    };
  }

  async getDeploymentLogs(deploymentId) {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      return {
        success: false,
        error: 'Deployment not found',
        logs: []
      };
    }

    return {
      success: true,
      logs: deployment.logs
    };
  }

  async rollbackDeployment(deploymentId) {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error('Deployment not found');
      }

      const { provider, configuration } = deployment;
      const providerConfig = this.providers[provider];

      if (!providerConfig || !providerConfig.rollback) {
        throw new Error(`Rollback not supported for provider: ${provider}`);
      }

      const result = await providerConfig.rollback(configuration);

      this.addLog(deploymentId, `Rollback ${result.success ? 'completed' : 'failed'}`);

      return {
        success: result.success,
        deploymentId,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        deploymentId
      };
    }
  }

  // Helper methods
  generateDeploymentId() {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addLog(deploymentId, message) {
    const deployment = this.deployments.get(deploymentId);
    if (deployment) {
      deployment.logs.push({
        timestamp: new Date(),
        message
      });
    }
  }

  async ensureVercelCLI() {
    try {
      await execAsync('vercel --version');
    } catch (error) {
      await execAsync('npm install -g vercel');
    }
  }

  async ensureNetlifyCLI() {
    try {
      await execAsync('netlify --version');
    } catch (error) {
      await execAsync('npm install -g netlify-cli');
    }
  }

  async ensureHerokuCLI() {
    try {
      await execAsync('heroku --version');
    } catch (error) {
      // Heroku CLI installation varies by OS
      await execAsync('curl https://cli-assets.heroku.com/install.sh | sh');
    }
  }

  async ensureAWSCLI() {
    try {
      await execAsync('aws --version');
    } catch (error) {
      await execAsync('pip install awscli');
    }
  }

  generateKubernetesDeployment(config) {
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.name}
  namespace: ${config.namespace || 'default'}
spec:
  replicas: ${config.replicas}
  selector:
    matchLabels:
      app: ${config.name}
  template:
    metadata:
      labels:
        app: ${config.name}
    spec:
      containers:
      - name: ${config.name}
        image: ${config.image}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
---
apiVersion: v1
kind: Service
metadata:
  name: ${config.name}-service
  namespace: ${config.namespace || 'default'}
spec:
  selector:
    app: ${config.name}
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer`;
  }

  // Provider status methods
  async getVercelStatus(configuration) {
    try {
      const { vercelToken, projectId } = configuration;
      
      const response = await axios.get(
        `https://api.vercel.com/v1/deployments?projectId=${projectId}`,
        {
          headers: {
            'Authorization': `Bearer ${vercelToken}`
          }
        }
      );

      return {
        success: true,
        deployments: response.data.deployments,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  async getNetlifyStatus(configuration) {
    try {
      const { netlifyToken, siteId } = configuration;
      
      const response = await axios.get(
        `https://api.netlify.com/api/v1/sites/${siteId}`,
        {
          headers: {
            'Authorization': `Bearer ${netlifyToken}`
          }
        }
      );

      return {
        success: true,
        site: response.data,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  async getHerokuStatus(configuration) {
    try {
      const { herokuToken, appName } = configuration;
      
      const response = await axios.get(
        `https://api.heroku.com/apps/${appName}`,
        {
          headers: {
            'Authorization': `Bearer ${herokuToken}`,
            'Accept': 'application/vnd.heroku+json; version=3'
          }
        }
      );

      return {
        success: true,
        app: response.data,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  async getAWSStatus(configuration) {
    try {
      const { awsAccessKey, awsSecretKey, region } = configuration;
      
      // Set AWS credentials
      process.env.AWS_ACCESS_KEY_ID = awsAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = awsSecretKey;
      process.env.AWS_DEFAULT_REGION = region || 'us-east-1';

      // Test AWS connection
      const { stdout } = await execAsync('aws sts get-caller-identity');

      return {
        success: true,
        identity: JSON.parse(stdout),
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  async getDockerStatus(configuration) {
    try {
      const { stdout } = await execAsync('docker version');
      
      return {
        success: true,
        version: stdout,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  async getKubernetesStatus(configuration) {
    try {
      const { stdout } = await execAsync('kubectl cluster-info');
      
      return {
        success: true,
        clusterInfo: stdout,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  async getAllDeployments() {
    return Array.from(this.deployments.values());
  }

  async getDeploymentsByProvider(provider) {
    return Array.from(this.deployments.values()).filter(d => d.provider === provider);
  }

  async getDeploymentsByStatus(status) {
    return Array.from(this.deployments.values()).filter(d => d.status === status);
  }
}

module.exports = new DeploymentService();