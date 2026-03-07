export type Verdict = 'accepted' | 'wrong-answer' | 'time-limit-exceeded' | 'runtime-error' | 'compilation-error' | 'pending' | 'running';

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  verdict: Verdict;
  executionTime: number | null;
  stderr: string;
}
