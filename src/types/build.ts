export interface BuildProfile {
  id: string;
  name: string;
  standard: string;
  flags: string[];
  timeLimit: number;
  isDefault: boolean;
  mode: 'tc' | 'file';
}

export interface BuildConfig {
  compilerPath: string;
  profiles: BuildProfile[];
  saveBeforeBuild: boolean;
  clearOutputBeforeBuild: boolean;
  showExecutionTime: boolean;
}

export interface CompileResult {
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
  errors: CompileError[];
  warnings: string[];
  rawOutput: string;
}

export interface CompileError {
  file: string;
  line: number;
  column: number;
  severity: string;
  message: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
}
