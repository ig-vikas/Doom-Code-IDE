import { invoke } from '@tauri-apps/api/core';
import type { CompileResult, RunResult } from '../types';

export async function compileCpp(
  sourcePath: string,
  outputPath: string,
  flags: string[]
): Promise<CompileResult> {
  return invoke<CompileResult>('compile_cpp', { sourcePath, outputPath, flags });
}

export async function runExecutable(
  execPath: string,
  stdin: string,
  timeoutMs: number
): Promise<RunResult> {
  return invoke<RunResult>('run_executable', { execPath, stdin, timeoutMs });
}

export async function killRunningProcess(): Promise<void> {
  return invoke<void>('kill_running_process');
}

export async function checkCompiler(): Promise<string | null> {
  return invoke<string | null>('check_compiler');
}
