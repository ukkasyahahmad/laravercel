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
  
  routes.push(
    { src: '/css/(.*)', dest: '/public/css/' },
    { src: '/images/(.*)', dest: '/public/images/' },
    { src: '/js/(.*)', dest: '/public/js/' },
    { src: '/vendors/(.*)', dest: '/public/vendors/' }
  );
  
  if (detect.hasInertia || detect.hasLivewire) {
    routes.push(
      { src: '/(.*\\.js$)', dest: '/public/$1' },
      { src: '/(.*\\.css$)', dest: '/public/$1' }
    );
  }
  
  routes.push({ src: '/(.*)', dest: '/api/index.php' });
  
  const envDefaults: Record<string, string> = {
    'APP_ENV': 'production',
    'APP_DEBUG': 'true',
    'APP_CONFIG_CACHE': '/tmp/config.php',
    'APP_EVENTS_CACHE': '/tmp/events.php',
    'APP_PACKAGES_CACHE': '/tmp/packages.php',
    'APP_ROUTES_CACHE': '/tmp/routes.php',
    'APP_SERVICES_CACHE': '/tmp/services.php',
    'VIEW_COMPILED_PATH': '/tmp',
    'CACHE_DRIVER': 'array',
    'LOG_CHANNEL': 'stderr',
    'LOG_LEVEL': 'warning',
    'SESSION_DRIVER': 'cookie',
  };
  
  const envVars = parseEnvFile(cwd);
  
  const env: Record<string, string> = { ...envDefaults };
  
  env['APP_URL'] = envVars['APP_URL'] || '';
  
  for (const [key, value] of Object.entries(envVars)) {
    if (value && !SENSITIVE_KEYS.includes(key)) {
      env[key] = value;
    }
  }
  
  if (detect.hasLivewire) {
    env['LIVEWIRE_ASSET_PATH'] = '/';
  }
  
  return {
    version: 2,
    framework: null,
    functions: {
      'api/index.php': {
        runtime,
      },
    },
    routes,
    env,
    buildCommand: detect.hasVite ? 'vite build' : (detect.hasMix ? 'npm run prod' : undefined),
    outputDirectory: detect.hasVite || detect.hasMix ? 'public' : undefined,
    allEnvVars: envVars,
  };
}

export function generateVercelIgnore(cwd: string): string[] {
  let ignore = [
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

  const wayfinderDirs = [
    'resources/js/actions',
    'resources/js/routes',
    'resources/js/wayfinder',
  ];

  for (const dir of wayfinderDirs) {
    const dirPath = path.join(cwd, dir);
    if (fs.existsSync(dirPath)) {
      ignore = ignore.filter(item => !item.includes(dir));
    }
  }

  return ignore;
}

export function writeVercelJson(config: VercelConfig, cwd: string): void {
  const filePath = path.join(cwd, 'vercel.json');
  
  const { allEnvVars, ...vercelConfig } = config as any;
  const content = JSON.stringify(vercelConfig, null, 2) + '\n';
  fs.writeFileSync(filePath, content);
  console.log('✅ Generated vercel.json');
  
  updateAppServiceProvider(cwd);
}

function updateAppServiceProvider(cwd: string): void {
  const appServiceProviderPath = path.join(cwd, 'app/Providers/AppServiceProvider.php');
  
  if (!fs.existsSync(appServiceProviderPath)) {
    console.log('⚠️  AppServiceProvider.php not found, skipping...');
    return;
  }
  
  let content = fs.readFileSync(appServiceProviderPath, 'utf-8');
  
  if (content.includes("URL::forceScheme('https')")) {
    console.log('✅ AppServiceProvider.php already has forceScheme https');
    return;
  }
  
  if (!content.includes('use Illuminate\\Support\\Facades\\URL;')) {
    const insertPos = content.indexOf('class AppServiceProvider');
    if (insertPos > 0) {
      content = content.slice(0, insertPos) + 
                'use Illuminate\\Support\\Facades\\URL;\n' +
                'use Illuminate\\Support\\Facades\\Log;\n\n' +
                content.slice(insertPos);
    }
  }
  
  const productionBlock = `        if ($this->app->environment('production')) {
            URL::forceScheme('https');
            Log::setDefaultDriver('stderr');
        }`;
  
  const bootMethodMatch = content.match(/public function boot\(\): void\s*\n\s*\{/);
  if (bootMethodMatch) {
    const insertIdx = bootMethodMatch.index! + bootMethodMatch[0].length;
    const before = content.slice(0, insertIdx);
    const after = content.slice(insertIdx);
    
    content = before + '\n' + productionBlock + '\n' + after;
  }
  
  fs.writeFileSync(appServiceProviderPath, content);
  console.log('✅ Updated app/Providers/AppServiceProvider.php');
  
  updateViteConfig(cwd);
}

function updateViteConfig(cwd: string): void {
  const viteConfigTs = path.join(cwd, 'vite.config.ts');
  const viteConfigJs = path.join(cwd, 'vite.config.js');
  
  const viteConfigPath = fs.existsSync(viteConfigTs) ? viteConfigTs : 
                         fs.existsSync(viteConfigJs) ? viteConfigJs : null;
  
  if (!viteConfigPath) {
    console.log('⚠️  vite.config not found, skipping...');
    return;
  }
  
  let content = fs.readFileSync(viteConfigPath, 'utf-8');
  
  if (content.includes('...(isVercel')) {
    console.log('✅ vite.config already has wayfinder Vercel skip');
    updateGitignore(cwd);
    return;
  }
  
  if (!content.includes("from '@laravel/vite-plugin-wayfinder'")) {
    console.log('⚠️  wayfinder not found in vite.config, skipping...');
    updateGitignore(cwd);
    return;
  }
  
  const isVercelLine = "const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;";
  
  const wayfinderConditional = `...(isVercel ? [] : [wayfinder({ formVariants: true })]),`;
  
  if (!content.includes('const isVercel')) {
    content = content.replace(
      /export default defineConfig\(\{/,
      `${isVercelLine}

export default defineConfig({`
    );
  }
  
  if (!content.includes('...(isVercel')) {
    const pluginsMatch = content.match(/plugins:\s*\[([\s\S]*?)\n\s*\],/);
    if (pluginsMatch) {
      const pluginsContent = pluginsMatch[1];
      const newPlugins = pluginsContent.replace(
        /wayfinder\(\{[\s\S]*?\}\),?/,
        wayfinderConditional
      );
      content = content.replace(pluginsMatch[0], `plugins: [${newPlugins}\n    ],`);
    }
  }
  
  fs.writeFileSync(viteConfigPath, content);
  console.log(`✅ Updated ${path.basename(viteConfigPath)} - wayfinder will skip on Vercel`);
  
  updateGitignore(cwd);
}

function updateGitignore(cwd: string): void {
  const gitignorePath = path.join(cwd, '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    return;
  }
  
  let content = fs.readFileSync(gitignorePath, 'utf-8');
  
  const wayfinderDirs = [
    '/resources/js/actions',
    '/resources/js/routes',
    '/resources/js/wayfinder',
  ];
  
  let hasChanges = false;
  
  for (const dir of wayfinderDirs) {
    const regex = new RegExp(`^${dir}(\\s|$)`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, '');
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(gitignorePath, content);
    console.log('✅ Updated .gitignore - removed wayfinder directories');
  }
}

export function writeVercelIgnore(ignore: string[], cwd: string): void {
  const filePath = path.join(cwd, '.vercelignore');
  fs.writeFileSync(filePath, ignore.join('\n') + '\n');
  console.log('✅ Generated .vercelignore');
}

export function writeApiIndexPhp(cwd: string): void {
  const apiDir = path.join(cwd, 'api');
  const indexPhpPath = path.join(apiDir, 'index.php');
  
  if (!fs.existsSync(apiDir)) {
    fs.mkdirSync(apiDir, { recursive: true });
  }
  
  const content = `<?php
require __DIR__ . '/../public/index.php';
`;
  
  fs.writeFileSync(indexPhpPath, content);
  console.log('✅ Generated api/index.php');
}
