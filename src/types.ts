export interface ComposerJson {
  require: any;
  requireDev: any;
}

export interface PackageJson {
  dependencies: any;
  devDependencies: any;
}

export interface VercelFunctionConfig {
  runtime: string;
  memory: number;
  maxDuration: number;
  excludeFiles: string;
}

export interface VercelRoute {
  src: string;
  dest: string;
}

export interface VercelConfig {
  version: number;
  framework: string | null;
  functions: any;
  routes: VercelRoute[];
  env: any;
  buildCommand?: string;
  outputDirectory?: string;
  allEnvVars?: Record<string, string>;
}

export interface DetectResult {
  phpVersion: string;
  hasInertia: boolean;
  inertiaDriver: string | null;
  hasLivewire: boolean;
  hasVite: boolean;
  hasMix: boolean;
}
