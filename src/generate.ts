import * as fs from 'fs';
import * as path from 'path';
import { VercelConfig, DetectResult } from './types';
import { PHP_VERSION_MAP } from './detect';

const SENSITIVE_KEYS = [
  'APP_KEY',
  'DB_PASSWORD',
  'DB_USERNAME',
  'DB_HOST',
  'DB_DATABASE',
  'REDIS_PASSWORD',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_DEFAULT_REGION',
  'S3_BUCKET',
  'MAIL_MAILER',
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_USERNAME',
  'MAIL_PASSWORD',
  'MAIL_FROM_ADDRESS',
  'STRIPE_KEY',
  'STRIPE_SECRET',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
];

export function parseEnvFile(cwd: string): Record<string, string> {
  const envPath = path.join(cwd, '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const idx = line.indexOf('=');
    if (idx === -1) return;
    
    const key = line.substring(0, idx).trim();
    let value = line.substring(idx + 1).trim();
    
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    envVars[key] = value;
  });

  return envVars;
}

export function getSensitiveVars(envVars: Record<string, string>): string[] {
  return SENSITIVE_KEYS.filter(key => envVars[key]);
}

export function getNonSensitiveEnvVars(envVars: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const excludedKeys = ['APP_ENV', 'APP_DEBUG', 'APP_KEY', 'DB_HOST', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'];
  
  for (const [key, value] of Object.entries(envVars)) {
    if (!SENSITIVE_KEYS.includes(key) && !excludedKeys.includes(key) && value) {
      result[key] = value;
    }
  }
  
  return result;
}

export function getRuntime(phpVersion: string): string {
  return PHP_VERSION_MAP[phpVersion] || 'vercel-php@0.7.4';
}

export function generateVercelConfig(detect: DetectResult, cwd: string): VercelConfig {
  const runtime = getRuntime(detect.phpVersion);
  
  const routes: VercelConfig['routes'] = [];
  
  if (detect.hasVite) {
    routes.push(
      { src: '/build/(.*)', dest: '/public/build/' },
      { src: '/storage/build/(.*)', dest: '/public/storage/build/' }
    );
  }
  
  if (detect.hasMix) {
    routes.push(
      { src: '/css/(.*)', dest: '/public/css/' },
      { src: '/js/(.*)', dest: '/public/js/' },
      { src: '/fonts/(.*)', dest: '/public/fonts/' }
    );
  }
  
  if (detect.hasInertia || detect.hasLivewire) {
    routes.push(
      { src: '/(.*\\.js$)', dest: '/public/$1' },
      { src: '/(.*\\.css$)', dest: '/public/$1' }
    );
  }
  
  routes.push({ src: '/(.*)', dest: '/api/index.php' });
  
  const env: Record<string, string> = {
    'APP_ENV': 'production',
    'APP_DEBUG': 'false',
    'APP_CONFIG_CACHE': '/tmp/config.php',
    'APP_EVENTS_CACHE': '/tmp/events.php',
    'APP_PACKAGES_CACHE': '/tmp/packages.php',
    'APP_ROUTES_CACHE': '/tmp/routes.php',
    'APP_SERVICES_CACHE': '/tmp/services.php',
    'VIEW_COMPILED_PATH': '/tmp',
    'CACHE_DRIVER': 'array',
    'LOG_CHANNEL': 'stderr',
    'SESSION_DRIVER': 'cookie',
  };
  
  const envVars = parseEnvFile(cwd);
  const nonSensitiveEnvVars = getNonSensitiveEnvVars(envVars);
  const sensitiveVars = getSensitiveVars(envVars);
  
  if (envVars['APP_URL']) {
    env['APP_URL'] = envVars['APP_URL'];
  }
  
  Object.assign(env, nonSensitiveEnvVars);
  
  if (detect.hasLivewire) {
    env['LIVEWIRE_ASSET_PATH'] = '/';
  }
  
  return {
    version: 2,
    framework: null,
    functions: {
      'api/index.php': {
        runtime,
        memory: 1024,
        maxDuration: 30,
      },
    },
    routes,
    env,
    buildCommand: detect.hasVite ? 'npm run build' : (detect.hasMix ? 'npm run prod' : undefined),
    outputDirectory: detect.hasVite || detect.hasMix ? 'public' : undefined,
  };
}

export function generateVercelIgnore(cwd: string): string[] {
  const ignore = [
    'node_modules/**',
    '.git',
    '.env',
    '.env.*',
    '.idea',
    '.vscode',
    'vendor/**',
    'storage/framework/cache/**',
    'storage/framework/sessions/**',
    'storage/framework/views/**',
    'storage/logs/**',
    'tests/**',
    'phpunit.xml',
    'phpunit.xml.dist',
    'composer.lock',
    'package-lock.json',
    'yarn.lock',
    'npm-debug.log',
    '.DS_Store',
    'Thumbs.db',
    'vercel.json',
    '.vercelignore',
  ];
  
  const viteConfig = path.join(cwd, 'vite.config.js');
  const viteConfigTs = path.join(cwd, 'vite.config.ts');
  
  if (!fs.existsSync(viteConfig) && !fs.existsSync(viteConfigTs)) {
    ignore.push('resources/js/**');
    ignore.push('resources/css/**');
  }
  
  return ignore;
}

export function writeVercelJson(config: VercelConfig, cwd: string): void {
  const envVars = parseEnvFile(cwd);
  const sensitiveVars = getSensitiveVars(envVars);
  
  let content = JSON.stringify(config, null, 2);
  
  if (sensitiveVars.length > 0) {
    content += '\n\n/* ⚠️  Set these in Vercel Dashboard > Settings > Environment Variables:\n';
    content += ' * ' + sensitiveVars.join('\n * ') + '\n';
    content += ' */\n';
  }
  
  const filePath = path.join(cwd, 'vercel.json');
  fs.writeFileSync(filePath, content + '\n');
  console.log('✅ Generated vercel.json');
  
  if (sensitiveVars.length > 0) {
    console.log('⚠️  Sensitive vars detected: ' + sensitiveVars.join(', '));
    console.log('   Set these manually in Vercel Dashboard > Settings > Environment Variables');
  }
}

export function writeVercelIgnore(ignore: string[], cwd: string): void {
  const filePath = path.join(cwd, '.vercelignore');
  fs.writeFileSync(filePath, ignore.join('\n') + '\n');
  console.log('✅ Generated .vercelignore');
}
