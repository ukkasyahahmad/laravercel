#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import { detect } from './detect';
import { generateVercelConfig, generateVercelIgnore, writeVercelJson, writeVercelIgnore } from './generate';

const program = new Command();

program
  .name('laravercel')
  .description('Auto-deploy Laravel to Vercel with Inertia and Livewire support')
  .version('1.0.0')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('--force', 'Overwrite existing vercel.json')
  .option('--skip-vercelignore', 'Skip generating .vercelignore')
  .action(async (options) => {
    const cwd = path.resolve(options.cwd);
    
    if (!fs.existsSync(path.join(cwd, 'composer.json'))) {
      console.error('❌ No composer.json found. Are you in a Laravel project?');
      process.exit(1);
    }
    
    const vercelJsonPath = path.join(cwd, 'vercel.json');
    if (fs.existsSync(vercelJsonPath) && !options.force) {
      console.log('⚠️  vercel.json already exists. Use --force to overwrite.');
      process.exit(1);
    }
    
    console.log('🔍 Detecting project configuration...\n');
    
    const detected = detect(cwd);
    
    console.log(`🐘 PHP Version: ${detected.phpVersion}`);
    console.log(`⚡ Inertia: ${detected.hasInertia ? detected.inertiaDriver : 'No'}`);
    console.log(`⚡ Livewire: ${detected.hasLivewire ? 'Yes' : 'No'}`);
    console.log(`🔧 Build Tool: ${detected.hasVite ? 'Vite' : detected.hasMix ? 'Mix' : 'None'}`);
    console.log('');
    
    const config = generateVercelConfig(detected, cwd);
    writeVercelJson(config, cwd);
    
    if (!options.skipVercelignore) {
      const ignore = generateVercelIgnore(cwd);
      writeVercelIgnore(ignore, cwd);
    }
    
    console.log('\n✨ Done! You can now run:');
    console.log('   npx vercel');
    console.log('\n📝 If there are errors, check vercel.json and set sensitive env vars in Vercel Dashboard');
  });

program.parse();
