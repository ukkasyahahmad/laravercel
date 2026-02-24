#!/usr/bin/env node

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { Command } from 'commander';
import { detect } from './detect';
import { generateVercelConfig, generateVercelIgnore, writeVercelJson, writeVercelIgnore, writeApiIndexPhp, getSensitiveVars } from './generate';
import { note, intro, outro, spinner, select } from '@clack/prompts';

const BANNER = `
█╗      █████╗ ██████╗  █████╗ ██╗   ██╗███████╗██████╗  ██████╗███████╗██╗     
██║     ██╔══██╗██╔══██╗██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║     
██║     ███████║██████╔╝███████║██║   ██║█████╗  ██████╔╝██║     █████╗  ██║     
██║     ██╔══██║██╔══██╗██╔══██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██║     ██╔══╝  ██║     
███████╗██║  ██║██║  ██║██║  ██║ ╚████╔╝ ███████╗██║  ██║╚██████╗███████╗███████╗
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝
`;

const program = new Command();

program
  .name('laravercel')
  .description('Auto-deploy Laravel to Vercel with Inertia and Livewire support')
  .version('1.1.0')
  .option('-c, --cwd <path>', 'Working directory', process.cwd())
  .option('--force', 'Overwrite existing vercel.json')
  .option('--skip-vercelignore', 'Skip generating .vercelignore')
  .option('--skip-api', 'Skip generating api/index.php')
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
    
    console.log(BANNER);
    
    intro(`Deploy Laravel to Vercel`);
    
    const detectSpinner = spinner();
    detectSpinner.start('Detecting project configuration...');
    
    const detected = detect(cwd);
    
    detectSpinner.stop('Detected!');
    
    console.log(`🐘 PHP Version: ${detected.phpVersion}`);
    console.log(`⚡ Inertia: ${detected.hasInertia ? detected.inertiaDriver : 'No'}`);
    console.log(`⚡ Livewire: ${detected.hasLivewire ? 'Yes' : 'No'}`);
    console.log(`🔧 Build Tool: ${detected.hasVite ? 'Vite' : detected.hasMix ? 'Mix' : 'None'}`);
    
    const buildSpinner = spinner();
    buildSpinner.start('Generating Vercel configuration...');
    
    const config = generateVercelConfig(detected, cwd);
    writeVercelJson(config, cwd);
    
    if (!options.skipApi) {
      writeApiIndexPhp(cwd);
    }
    
    if (!options.skipVercelignore) {
      const ignore = generateVercelIgnore(cwd);
      writeVercelIgnore(ignore, cwd);
    }
    
    buildSpinner.stop('Done!');
    
    const allEnvVars = config.allEnvVars || {};
    const sensitiveVars = getSensitiveVars(allEnvVars);
    
    if (sensitiveVars.length > 0) {
      const includeSensitive = await select({
        message: `Found ${sensitiveVars.length} sensitive env var(s): ${sensitiveVars.join(', ')}. Include in vercel.json?`,
        options: [
          { value: 'yes', label: 'Yes, include all (merged with production defaults)' },
          { value: 'no', label: 'No, I will set manually in Vercel Dashboard' },
        ],
      });
      
      if (includeSensitive === 'yes') {
        for (const key of sensitiveVars) {
          if (allEnvVars[key]) {
            config.env[key] = allEnvVars[key];
          }
        }
        
        const fs = await import('fs');
        const vercelJsonPath = path.join(cwd, 'vercel.json');
        const { allEnvVars: _, ...configToWrite } = config as any;
        fs.writeFileSync(vercelJsonPath, JSON.stringify(configToWrite, null, 2) + '\n');
        console.log('✅ Added sensitive vars to vercel.json');
      } else {
        console.log('\n⚠️  Remember to set these in Vercel Dashboard → Settings → Environment Variables:');
        for (const v of sensitiveVars) {
          console.log(`   - ${v}`);
        }
      }
    }
    
    const hasWayfinder = fs.existsSync(path.join(cwd, 'vite.config.ts')) && 
                         fs.readFileSync(path.join(cwd, 'vite.config.ts'), 'utf-8').includes('@laravel/vite-plugin-wayfinder');
    
    if (hasWayfinder) {
      const wayfinderSpinner = spinner();
      wayfinderSpinner.start('Running php artisan wayfinder:generate --with-form...');
      
      try {
        execSync('php artisan wayfinder:generate --with-form', { cwd, stdio: 'ignore' });
        wayfinderSpinner.stop('Wayfinder generated!');
      } catch (error) {
        wayfinderSpinner.stop('Warning: wayfinder command failed (php artisan may not be available)');
      }
    }
    
    note(`Next steps:
  1. Review changes
  2. Commit your changes:
     
     git add .
     git commit -m "Add Vercel deployment config"
     git push
  
  3. Deploy to Vercel:
     
     npx vercel
  `, 'Ready to deploy!');
    
    outro('✨ All done! Happy deploying!');
  });

program.parse();
