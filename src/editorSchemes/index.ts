import type { EditorColorScheme } from '../types/editorScheme';

export { vscodeDarkPlus } from './vscodeDarkPlus';
export { vscodeDarkPlusPlus } from './vscodeDarkPlusPlus';
export { vscodeDarkPlusPlusForge } from './vscodeDarkPlusPlusForge';

import { vscodeDarkPlus } from './vscodeDarkPlus';
import { vscodeDarkPlusPlus } from './vscodeDarkPlusPlus';
import { vscodeDarkPlusPlusForge } from './vscodeDarkPlusPlusForge';

export const allEditorSchemes: EditorColorScheme[] = [
  vscodeDarkPlusPlus,
  vscodeDarkPlusPlusForge,
  vscodeDarkPlus,
];
