import type { BuildProfile } from '../types';

export const defaultBuildProfiles: BuildProfile[] = [
  {
    id: 'tc',
    name: 'TC',
    standard: 'c++17',
    flags: ['-std=c++17', '-O2', '-DLOCAL'],
    timeLimit: 5000,
    isDefault: false,
    mode: 'tc',
  },
  {
    id: 'vikas',
    name: 'Vikas',
    standard: 'c++17',
    flags: ['-std=c++17', '-O2', '-DLOCAL'],
    timeLimit: 5000,
    isDefault: true,
    mode: 'file',
  },
  {
    id: 'debug',
    name: 'Debug',
    standard: 'c++17',
    flags: ['-std=c++17', '-g', '-O0', '-Wall', '-Wextra', '-Wshadow', '-D_GLIBCXX_DEBUG', '-DLOCAL'],
    timeLimit: 10000,
    isDefault: false,
    mode: 'tc',
  },
  {
    id: 'release',
    name: 'Release',
    standard: 'c++17',
    flags: ['-std=c++17', '-O2', '-Wall'],
    timeLimit: 30000,
    isDefault: false,
    mode: 'file',
  },
];
