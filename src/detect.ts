import * as fs from 'fs';
import * as path from 'path';
import { ComposerJson, PackageJson, DetectResult } from './types';

export const PHP_VERSION_MAP: Record<string, string> = {
  '8.5': 'vercel-php@0.9.0',
  '8.4': 'vercel-php@0.8.0',
  '8.3': 'vercel-php@0.7.4',
  '8.2': 'vercel-php@0.6.2',
  '8.1': 'vercel-php@0.5.5',
  '8.0': 'vercel-php@0.4.5',
  '7.4': 'vercel-php@0.3.8',
};

export function getComposerJson(cwd: string): ComposerJson | null {
  const composerPath = path.join(cwd, 'composer.json');
  if (!fs.existsSync(composerPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(composerPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function getPackageJson(cwd: string): PackageJson | null {
  const packagePath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export function detectPhpVersion(composer: ComposerJson | null): string {
  if (!composer?.require?.php) {
    return '8.3';
  }
  
  const phpConstraint = composer.require.php;
  const match = phpConstraint.match(/[\d]+\.[\d]+/);
  
  if (!match) {
    return '8.3';
  }
  
  const version = match[0];
  const majorMinor = version.split('.')[0] + '.' + version.split('.')[1];
  
  if (PHP_VERSION_MAP[majorMinor]) {
    return majorMinor;
  }
  
  return '8.3';
}

export function detectInertia(pkg: PackageJson | null): { hasInertia: boolean; driver: 'react' | 'vue' | 'svelte' | null } {
  if (!pkg) {
    return { hasInertia: false, driver: null };
  }
  
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
  
  if (allDeps['@inertiajs/react']) {
    return { hasInertia: true, driver: 'react' };
  }
  if (allDeps['@inertiajs/vue3']) {
    return { hasInertia: true, driver: 'vue' };
  }
  if (allDeps['@inertiajs/svelte']) {
    return { hasInertia: true, driver: 'svelte' };
  }
  
  return { hasInertia: false, driver: null };
}

export function detectLivewire(composer: ComposerJson | null): boolean {
  if (!composer) {
    return false;
  }
  
  const allDeps = {
    ...composer.require,
    ...composer.requireDev,
  };
  
  return !!allDeps['livewire/livewire'];
}

export function detectBuildTool(cwd: string): { hasVite: boolean; hasMix: boolean } {
  const viteConfig = path.join(cwd, 'vite.config.js');
  const viteConfigTs = path.join(cwd, 'vite.config.ts');
  const mixConfig = path.join(cwd, 'webpack.mix.js');
  
  return {
    hasVite: fs.existsSync(viteConfig) || fs.existsSync(viteConfigTs),
    hasMix: fs.existsSync(mixConfig),
  };
}

export function detect(cwd: string): DetectResult {
  const composer = getComposerJson(cwd);
  const pkg = getPackageJson(cwd);
  
  const phpVersion = detectPhpVersion(composer);
  const inertia = detectInertia(pkg);
  const hasLivewire = detectLivewire(composer);
  const { hasVite, hasMix } = detectBuildTool(cwd);
  
  return {
    phpVersion,
    hasInertia: inertia.hasInertia,
    inertiaDriver: inertia.driver,
    hasLivewire,
    hasVite,
    hasMix,
  };
}
