# laravercel

```
██╗      █████╗ ██████╗  █████╗ ██╗   ██╗███████╗██████╗  ██████╗███████╗██╗     
██║     ██╔══██╗██╔══██╗██╔══██╗██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝██║     
██║     ███████║██████╔╝███████║██║   ██║█████╗  ██████╔╝██║     █████╗  ██║     
██║     ██╔══██║██╔══██╗██╔══██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██║     ██╔══╝  ██║     
███████╗██║  ██║██║  ██║██║  ██║ ╚████╔╝ ███████╗██║  ██║╚██████╗███████╗███████╗
╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝
```

<p align=center>
  Auto-deploy Laravel to Vercel with Inertia and Livewire support 🐘⚡
</p>

## 🚀 Quick Start

```bash
npx laravercel
```

That's it! It will auto-detect your project configuration and generate all the files needed for Vercel deployment.

## ✨ Features

- **Auto-detect PHP version** from `composer.json` → chooses correct `vercel-php` runtime
- **Auto-detect Inertia** (React, Vue, Svelte)
- **Auto-detect Livewire**
- **Auto-detect build tools** (Vite, Mix)
- **Auto-convert `.env`** to Vercel environment variables
- **Auto-generate `api/index.php`** for Vercel serverless function
- **Smart `.vercelignore`** - excludes vendor, node_modules, etc.
- **Auto-update `AppServiceProvider.php`** - adds `URL::forceScheme('https')`
- **Auto-update `vite.config.ts`** - skip wayfinder on Vercel
- **Auto-update `.gitignore`** - remove wayfinder directories
- **Auto-run wayfinder** - `php artisan wayfinder:generate --with-form`

## 📋 What it generates

### `vercel.json`

```json
{
  "version": 2,
  "framework": null,
  "functions": {
    "api/index.php": {
      "runtime": "vercel-php@0.9.0"
    }
  },
  "routes": [
    { "src": "/build/(.*)", "dest": "/public/build/" },
    { "src": "/(.*)", "dest": "/api/index.php" }
  ],
  "env": {
    "APP_ENV": "production",
    "APP_DEBUG": "true",
    "APP_URL": "",
    "APP_CONFIG_CACHE": "/tmp/config.php",
    "APP_EVENTS_CACHE": "/tmp/events.php",
    "APP_PACKAGES_CACHE": "/tmp/packages.php",
    "APP_ROUTES_CACHE": "/tmp/routes.php",
    "APP_SERVICES_CACHE": "/tmp/services.php",
    "VIEW_COMPILED_PATH": "/tmp",
    "CACHE_DRIVER": "array",
    "LOG_CHANNEL": "stderr",
    "SESSION_DRIVER": "cookie"
  },
  "buildCommand": "vite build",
  "outputDirectory": "public"
}
```

### Files Generated

| File | Description |
|------|-------------|
| `vercel.json` | Vercel deployment configuration |
| `api/index.php` | Serverless function entry point |
| `.vercelignore` | Files to exclude from deployment |

### Auto-Updates

| File | Update |
|------|--------|
| `app/Providers/AppServiceProvider.php` | Adds `URL::forceScheme('https')` |
| `vite.config.ts` | Skip wayfinder on Vercel |
| `.gitignore` | Removes wayfinder directories |

## 🔧 Usage

### Basic

```bash
npx laravercel
```

### Options

```bash
laravercel --help

Options:
  -c, --cwd <path>          Working directory (default: current directory)
  --force                   Overwrite existing vercel.json
  --skip-vercelignore       Skip generating .vercelignore
  --skip-api               Skip generating api/index.php
```

### Examples

```bash
# Generate in current directory
npx laravercel

# Generate in specific directory
npx laravercel --cwd /path/to/laravel

# Overwrite existing vercel.json
npx laravercel --force
```

## ⚠️ Important

### Sensitive Environment Variables

Some variables from `.env` are **not** included in `vercel.json` for security. Set these manually in **Vercel Dashboard → Settings → Environment Variables**:

- `APP_KEY` (required!)
- `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `REDIS_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Other API keys

The CLI will remind you which variables need to be set manually.

### APP_KEY

Make sure `APP_KEY` is set in your `.env` file before running `laravercel`. If you don't have one:

```bash
php artisan key:generate
```

## 🐘 PHP Version Support

| PHP Version | Runtime |
|-------------|---------|
| 8.5         | vercel-php@0.9.0 |
| 8.4         | vercel-php@0.8.0 |
| 8.3         | vercel-php@0.7.4 |
| 8.2         | vercel-php@0.6.2 |
| 8.1         | vercel-php@0.5.5 |
| 8.0         | vercel-php@0.4.5 |
| 7.4         | vercel-php@0.3.8 |

## 🔨 Build & Publish

```bash
# Install dependencies
npm install

# Build
npm run build

# Publish to npm
npm publish
```

## 📝 License

MIT

## Author

Ukkasyah Ahmad - [https://github.com/ukkasyahahmad](https://github.com/ukkasyahahmad)
