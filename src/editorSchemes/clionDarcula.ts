import type { EditorColorScheme } from '../types/editorScheme';

export const clionDarcula: EditorColorScheme = {
  id: 'clion-darcula',
  name: 'CLion Darcula',
  type: 'dark',
  monacoTheme: {
    base: 'vs-dark',
    inherit: false,
    rules: [
      // ═══════════════════════════════════════════════════
      //  DEFAULT TEXT  —  #A9B7C6 on #2B2B2B
      //  JetBrains Darcula signature base colors
      // ═══════════════════════════════════════════════════
      { token: '', foreground: 'A9B7C6', background: '2B2B2B' },

      // ═══════════════════════════════════════════════════
      //  COMMENTS  —  gray #808080  (NOT italic in Darcula)
      //  // line comments and /* block comments */
      // ═══════════════════════════════════════════════════
      { token: 'comment', foreground: '808080' },
      { token: 'comment.cpp', foreground: '808080' },
      { token: 'comment.line', foreground: '808080' },
      { token: 'comment.line.cpp', foreground: '808080' },
      { token: 'comment.block', foreground: '808080' },
      { token: 'comment.block.cpp', foreground: '808080' },
      { token: 'comment.content', foreground: '808080' },
      { token: 'comment.content.cpp', foreground: '808080' },

      // ═══════════════════════════════════════════════════
      //  DOC COMMENTS  —  green #629755  italic
      //  /** documentation comments */
      // ═══════════════════════════════════════════════════
      { token: 'comment.doc', foreground: '629755', fontStyle: 'italic' },
      { token: 'comment.doc.cpp', foreground: '629755', fontStyle: 'italic' },
      // doc‐comment tags (@param, @return, @brief, @see)
      { token: 'comment.doc.tag', foreground: '629755', fontStyle: 'bold' },
      { token: 'comment.doc.tag.cpp', foreground: '629755', fontStyle: 'bold' },

      // ═══════════════════════════════════════════════════
      //  KEYWORDS  —  orange #CC7832
      //  In Darcula, ALL keywords share the same orange.
      //  No separate color for control‑flow vs type keywords.
      //  (if, else, for, while, do, switch, case, default,
      //   break, continue, return, goto, int, void, char,
      //   double, float, long, short, unsigned, signed,
      //   auto, struct, class, enum, union, typedef, const,
      //   static, extern, volatile, register, inline,
      //   virtual, explicit, mutable, friend, template,
      //   typename, namespace, using, operator, sizeof,
      //   alignof, decltype, noexcept, constexpr, concept,
      //   requires, co_await, co_return, co_yield,
      //   static_assert, public, private, protected,
      //   new, delete, try, catch, throw, true, false,
      //   nullptr, this)
      // ═══════════════════════════════════════════════════
      { token: 'keyword', foreground: 'CC7832' },
      { token: 'keyword.cpp', foreground: 'CC7832' },
      { token: 'keyword.control', foreground: 'CC7832' },
      { token: 'keyword.control.cpp', foreground: 'CC7832' },
      { token: 'keyword.control.flow', foreground: 'CC7832' },
      { token: 'keyword.control.flow.cpp', foreground: 'CC7832' },
      { token: 'keyword.control.loop', foreground: 'CC7832' },
      { token: 'keyword.control.loop.cpp', foreground: 'CC7832' },
      { token: 'keyword.control.conditional', foreground: 'CC7832' },
      { token: 'keyword.control.conditional.cpp', foreground: 'CC7832' },
      { token: 'keyword.control.return', foreground: 'CC7832' },
      { token: 'keyword.control.return.cpp', foreground: 'CC7832' },
      { token: 'keyword.control.switch', foreground: 'CC7832' },
      { token: 'keyword.control.switch.cpp', foreground: 'CC7832' },
      { token: 'keyword.control.case', foreground: 'CC7832' },
      { token: 'keyword.control.new', foreground: 'CC7832' },
      { token: 'keyword.control.delete', foreground: 'CC7832' },
      { token: 'keyword.control.throw', foreground: 'CC7832' },
      { token: 'keyword.control.trycatch', foreground: 'CC7832' },
      { token: 'keyword.other', foreground: 'CC7832' },
      { token: 'keyword.other.cpp', foreground: 'CC7832' },
      { token: 'keyword.type', foreground: 'CC7832' },
      { token: 'keyword.type.cpp', foreground: 'CC7832' },
      { token: 'keyword.modifier', foreground: 'CC7832' },
      { token: 'keyword.modifier.cpp', foreground: 'CC7832' },
      { token: 'keyword.struct', foreground: 'CC7832' },
      { token: 'keyword.class', foreground: 'CC7832' },
      { token: 'keyword.enum', foreground: 'CC7832' },
      { token: 'keyword.union', foreground: 'CC7832' },
      { token: 'keyword.typedef', foreground: 'CC7832' },
      { token: 'keyword.operator', foreground: 'CC7832' },
      { token: 'keyword.operator.cpp', foreground: 'CC7832' },
      { token: 'keyword.operator.sizeof', foreground: 'CC7832' },
      { token: 'keyword.operator.alignof', foreground: 'CC7832' },
      { token: 'keyword.operator.cast', foreground: 'CC7832' },
      { token: 'keyword.operator.expression', foreground: 'CC7832' },
      { token: 'keyword.operator.new', foreground: 'CC7832' },
      { token: 'keyword.operator.delete', foreground: 'CC7832' },
      { token: 'keyword.operator.wordlike', foreground: 'CC7832' },
      { token: 'keyword.directive', foreground: 'BBB529' },
      { token: 'keyword.directive.cpp', foreground: 'BBB529' },
      { token: 'keyword.directive.include', foreground: 'BBB529' },
      { token: 'keyword.directive.include.cpp', foreground: 'BBB529' },
      { token: 'keyword.directive.define', foreground: 'BBB529' },
      { token: 'keyword.directive.define.cpp', foreground: 'BBB529' },
      { token: 'keyword.directive.ifdef', foreground: 'BBB529' },
      { token: 'keyword.directive.ifndef', foreground: 'BBB529' },
      { token: 'keyword.directive.endif', foreground: 'BBB529' },
      { token: 'keyword.directive.pragma', foreground: 'BBB529' },
      { token: 'keyword.directive.error', foreground: 'BBB529' },
      { token: 'keyword.directive.include.begin', foreground: '6A8759' },
      { token: 'keyword.directive.include.end', foreground: '6A8759' },

      // ═══════════════════════════════════════════════════
      //  STORAGE / TYPE KEYWORDS  —  orange #CC7832
      //  (static, extern, const, volatile, mutable,
      //   register, inline, constexpr, thread_local,
      //   int, void, char, bool, double, float, etc.)
      // ═══════════════════════════════════════════════════
      { token: 'storage', foreground: 'CC7832' },
      { token: 'storage.cpp', foreground: 'CC7832' },
      { token: 'storage.type', foreground: 'CC7832' },
      { token: 'storage.type.cpp', foreground: 'CC7832' },
      { token: 'storage.modifier', foreground: 'CC7832' },
      { token: 'storage.modifier.cpp', foreground: 'CC7832' },
      { token: 'storage.type.builtin', foreground: 'CC7832' },
      { token: 'storage.type.builtin.cpp', foreground: 'CC7832' },
      { token: 'storage.type.primitive', foreground: 'CC7832' },
      { token: 'storage.type.primitive.cpp', foreground: 'CC7832' },

      // ═══════════════════════════════════════════════════
      //  USER‑DEFINED TYPES  —  default #A9B7C6
      //  In Darcula, user types (class/struct/enum names,
      //  typedefs) are NOT specially colored — they use
      //  the default text foreground.
      // ═══════════════════════════════════════════════════
      { token: 'type', foreground: 'A9B7C6' },
      { token: 'type.cpp', foreground: 'A9B7C6' },
      { token: 'type.identifier', foreground: 'A9B7C6' },
      { token: 'type.identifier.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.type', foreground: 'A9B7C6' },
      { token: 'entity.name.type.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.type.class', foreground: 'A9B7C6' },
      { token: 'entity.name.type.class.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.type.struct', foreground: 'A9B7C6' },
      { token: 'entity.name.type.struct.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.type.enum', foreground: 'A9B7C6' },
      { token: 'entity.name.type.enum.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.type.typedef', foreground: 'A9B7C6' },
      { token: 'entity.name.type.typedef.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.type.template', foreground: '20999D' },
      { token: 'entity.name.type.template.cpp', foreground: '20999D' },
      { token: 'entity.name.type.concept', foreground: 'A9B7C6' },
      { token: 'entity.name.class', foreground: 'A9B7C6' },
      { token: 'entity.name.class.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.struct', foreground: 'A9B7C6' },
      { token: 'entity.name.struct.cpp', foreground: 'A9B7C6' },
      { token: 'support.type', foreground: 'A9B7C6' },
      { token: 'support.type.cpp', foreground: 'A9B7C6' },
      { token: 'support.class', foreground: 'A9B7C6' },
      { token: 'support.class.cpp', foreground: 'A9B7C6' },
      { token: 'support.type.posix-reserved', foreground: 'A9B7C6' },
      { token: 'support.type.stdint', foreground: 'A9B7C6' },

      // ═══════════════════════════════════════════════════
      //  FUNCTIONS  —  yellow #FFC66D
      //  In CLion, both declarations AND calls are yellow.
      // ═══════════════════════════════════════════════════
      { token: 'entity.name.function', foreground: 'FFC66D' },
      { token: 'entity.name.function.cpp', foreground: 'FFC66D' },
      { token: 'entity.name.function.member', foreground: 'FFC66D' },
      { token: 'entity.name.function.member.cpp', foreground: 'FFC66D' },
      { token: 'entity.name.function.operator', foreground: 'FFC66D' },
      { token: 'entity.name.function.preprocessor', foreground: 'FFC66D' },
      { token: 'entity.name.function.destructor', foreground: 'FFC66D' },
      { token: 'entity.name.function.constructor', foreground: 'FFC66D' },
      { token: 'support.function', foreground: 'FFC66D' },
      { token: 'support.function.cpp', foreground: 'FFC66D' },
      { token: 'support.function.C99', foreground: 'FFC66D' },
      { token: 'meta.function-call', foreground: 'FFC66D' },
      { token: 'meta.function-call.cpp', foreground: 'FFC66D' },

      // ═══════════════════════════════════════════════════
      //  VARIABLES  —  default #A9B7C6
      //  In Darcula, local variables and parameters are
      //  the same as default text foreground.
      // ═══════════════════════════════════════════════════
      { token: 'variable', foreground: 'A9B7C6' },
      { token: 'variable.cpp', foreground: 'A9B7C6' },
      { token: 'variable.other', foreground: 'A9B7C6' },
      { token: 'variable.other.cpp', foreground: 'A9B7C6' },
      { token: 'variable.other.local', foreground: 'A9B7C6' },
      { token: 'variable.other.local.cpp', foreground: 'A9B7C6' },
      { token: 'variable.other.global', foreground: 'A9B7C6' },
      { token: 'variable.other.global.cpp', foreground: 'A9B7C6' },
      { token: 'variable.parameter', foreground: 'A9B7C6' },
      { token: 'variable.parameter.cpp', foreground: 'A9B7C6' },
      { token: 'variable.other.object', foreground: 'A9B7C6' },
      { token: 'variable.other.object.cpp', foreground: 'A9B7C6' },

      // ─── Fields / Properties  —  purple #9876AA ───────
      //  In CLion, struct/class member fields are purple.
      //  Static fields are purple italic.
      { token: 'variable.other.member', foreground: '9876AA' },
      { token: 'variable.other.member.cpp', foreground: '9876AA' },
      { token: 'variable.other.property', foreground: '9876AA' },
      { token: 'variable.other.property.cpp', foreground: '9876AA' },

      // ─── Enum members / Constants  —  purple #9876AA ──
      { token: 'variable.other.enummember', foreground: '9876AA' },
      { token: 'variable.other.enummember.cpp', foreground: '9876AA' },
      { token: 'variable.other.constant', foreground: '9876AA' },
      { token: 'variable.other.constant.cpp', foreground: '9876AA' },

      // ─── Predefined variables  —  #A9B7C6 ────────────
      { token: 'variable.predefined', foreground: 'A9B7C6' },
      { token: 'variable.predefined.cpp', foreground: 'A9B7C6' },

      // ─── `this` keyword  —  orange #CC7832 ───────────
      //  In Darcula, `this` is a keyword.
      { token: 'variable.language', foreground: 'CC7832' },
      { token: 'variable.language.cpp', foreground: 'CC7832' },
      { token: 'variable.language.this', foreground: 'CC7832' },
      { token: 'variable.language.this.cpp', foreground: 'CC7832' },

      // ═══════════════════════════════════════════════════
      //  IDENTIFIERS (fallback)  —  #A9B7C6
      // ═══════════════════════════════════════════════════
      { token: 'identifier', foreground: 'A9B7C6' },
      { token: 'identifier.cpp', foreground: 'A9B7C6' },

      // ═══════════════════════════════════════════════════
      //  NAMESPACE  —  default #A9B7C6
      //  In Darcula, namespace names are not colored
      //  differently from default text.
      // ═══════════════════════════════════════════════════
      { token: 'namespace', foreground: 'A9B7C6' },
      { token: 'namespace.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.namespace', foreground: 'A9B7C6' },
      { token: 'entity.name.namespace.cpp', foreground: 'A9B7C6' },
      { token: 'entity.name.scope-resolution', foreground: 'A9B7C6' },
      { token: 'entity.name.scope-resolution.cpp', foreground: 'A9B7C6' },

      // ═══════════════════════════════════════════════════
      //  PREPROCESSOR DIRECTIVES  —  olive #BBB529
      //  (#include, #define, #undef, #ifdef, #ifndef,
      //   #if, #else, #elif, #endif, #pragma, #error,
      //   #warning, #line)
      //  The # symbol itself is also #BBB529.
      // ═══════════════════════════════════════════════════
      { token: 'preprocessor', foreground: 'BBB529' },
      { token: 'preprocessor.cpp', foreground: 'BBB529' },
      { token: 'meta.preprocessor', foreground: 'BBB529' },
      { token: 'meta.preprocessor.cpp', foreground: 'BBB529' },
      // Header paths in #include → string green #6A8759
      { token: 'meta.preprocessor.string', foreground: '6A8759' },
      { token: 'meta.preprocessor.string.cpp', foreground: '6A8759' },
      // Macro names → dark olive #908B25
      { token: 'meta.preprocessor.macro', foreground: '908B25' },
      { token: 'meta.preprocessor.macro.cpp', foreground: '908B25' },

      // ═══════════════════════════════════════════════════
      //  STRINGS  —  green #6A8759
      //  In Darcula, strings are a muted/dark green.
      // ═══════════════════════════════════════════════════
      { token: 'string', foreground: '6A8759' },
      { token: 'string.cpp', foreground: '6A8759' },
      { token: 'string.quoted', foreground: '6A8759' },
      { token: 'string.quoted.double', foreground: '6A8759' },
      { token: 'string.quoted.double.cpp', foreground: '6A8759' },
      { token: 'string.quoted.single', foreground: '6A8759' },
      { token: 'string.quoted.single.cpp', foreground: '6A8759' },
      { token: 'string.quoted.include', foreground: '6A8759' },
      { token: 'string.quoted.include.cpp', foreground: '6A8759' },
      { token: 'string.quoted.angle', foreground: '6A8759' },
      { token: 'string.quoted.angle.cpp', foreground: '6A8759' },
      { token: 'string.include', foreground: '6A8759' },
      { token: 'string.include.cpp', foreground: '6A8759' },
      { token: 'string.raw', foreground: '6A8759' },
      { token: 'string.raw.cpp', foreground: '6A8759' },
      { token: 'character', foreground: '6A8759' },
      { token: 'character.cpp', foreground: '6A8759' },

      // ─── Escape sequences  —  orange #CC7832 ─────────
      //  In Darcula, string escapes (\n, \t, \\, \", etc.)
      //  are orange, matching keyword color.
      { token: 'string.escape', foreground: 'CC7832' },
      { token: 'string.escape.cpp', foreground: 'CC7832' },
      { token: 'constant.character.escape', foreground: 'CC7832' },
      { token: 'constant.character.escape.cpp', foreground: 'CC7832' },

      // ─── Format specifiers (%d, %s, %f)  —  #CC7832 ──
      { token: 'string.format', foreground: 'CC7832' },
      { token: 'string.format.cpp', foreground: 'CC7832' },
      { token: 'constant.other.placeholder', foreground: 'CC7832' },
      { token: 'constant.other.placeholder.cpp', foreground: 'CC7832' },

      // ─── Regex in strings ─────────────────────────────
      { token: 'string.regex', foreground: '6A8759' },
      { token: 'string.regex.cpp', foreground: '6A8759' },

      // ═══════════════════════════════════════════════════
      //  NUMBERS  —  blue #6897BB
      //  All numeric literals (int, float, hex, oct, bin,
      //  with suffixes like f, u, l, ll, ULL, etc.)
      // ═══════════════════════════════════════════════════
      { token: 'number', foreground: '6897BB' },
      { token: 'number.cpp', foreground: '6897BB' },
      { token: 'number.float', foreground: '6897BB' },
      { token: 'number.float.cpp', foreground: '6897BB' },
      { token: 'number.hex', foreground: '6897BB' },
      { token: 'number.hex.cpp', foreground: '6897BB' },
      { token: 'number.binary', foreground: '6897BB' },
      { token: 'number.binary.cpp', foreground: '6897BB' },
      { token: 'number.octal', foreground: '6897BB' },
      { token: 'number.octal.cpp', foreground: '6897BB' },
      { token: 'number.decimal', foreground: '6897BB' },
      { token: 'number.decimal.cpp', foreground: '6897BB' },
      { token: 'number.suffix', foreground: '6897BB' },

      // ═══════════════════════════════════════════════════
      //  CONSTANTS
      // ═══════════════════════════════════════════════════
      { token: 'constant', foreground: '9876AA' },
      { token: 'constant.cpp', foreground: '9876AA' },
      { token: 'constant.numeric', foreground: '6897BB' },
      { token: 'constant.numeric.cpp', foreground: '6897BB' },
      { token: 'constant.numeric.integer', foreground: '6897BB' },
      { token: 'constant.numeric.float', foreground: '6897BB' },
      { token: 'constant.numeric.hex', foreground: '6897BB' },
      { token: 'constant.numeric.octal', foreground: '6897BB' },
      { token: 'constant.numeric.binary', foreground: '6897BB' },
      // true, false, nullptr — keyword orange #CC7832
      { token: 'constant.language', foreground: 'CC7832' },
      { token: 'constant.language.cpp', foreground: 'CC7832' },
      { token: 'constant.language.boolean', foreground: 'CC7832' },
      { token: 'constant.language.boolean.cpp', foreground: 'CC7832' },
      { token: 'constant.language.nullptr', foreground: 'CC7832' },
      { token: 'constant.language.nullptr.cpp', foreground: 'CC7832' },
      // Character constants → string green
      { token: 'constant.character', foreground: '6A8759' },
      { token: 'constant.character.cpp', foreground: '6A8759' },
      // Other constants (enum values, macros)
      { token: 'constant.other', foreground: '9876AA' },
      { token: 'constant.other.cpp', foreground: '9876AA' },
      { token: 'constant.other.enum', foreground: '9876AA' },
      { token: 'constant.other.enum.cpp', foreground: '9876AA' },
      { token: 'constant.other.macro', foreground: '908B25' },
      { token: 'constant.other.macro.cpp', foreground: '908B25' },

      // ═══════════════════════════════════════════════════
      //  ANNOTATIONS / ATTRIBUTES
      //  ([[nodiscard]], [[deprecated]], __attribute__)
      //  Colored similarly to preprocessor → olive #BBB529
      // ═══════════════════════════════════════════════════
      { token: 'annotation', foreground: 'BBB529' },
      { token: 'annotation.cpp', foreground: 'BBB529' },
      { token: 'meta.attribute', foreground: 'BBB529' },
      { token: 'meta.attribute.cpp', foreground: 'BBB529' },

      // ═══════════════════════════════════════════════════
      //  LABELS  —  default #A9B7C6
      // ═══════════════════════════════════════════════════
      { token: 'entity.name.label', foreground: 'A9B7C6' },
      { token: 'entity.name.label.cpp', foreground: 'A9B7C6' },
      { token: 'label', foreground: 'A9B7C6' },
      { token: 'label.cpp', foreground: 'A9B7C6' },

      // ═══════════════════════════════════════════════════
      //  OPERATORS  —  default #A9B7C6
      //  In Darcula, operators are NOT specially colored;
      //  they blend with the default text.
      // ═══════════════════════════════════════════════════
      { token: 'operator', foreground: 'A9B7C6' },
      { token: 'operator.cpp', foreground: 'A9B7C6' },
      { token: 'operator.assignment', foreground: 'A9B7C6' },
      { token: 'operator.arithmetic', foreground: 'A9B7C6' },
      { token: 'operator.comparison', foreground: 'A9B7C6' },
      { token: 'operator.logical', foreground: 'A9B7C6' },
      { token: 'operator.bitwise', foreground: 'A9B7C6' },
      { token: 'operator.scope', foreground: 'A9B7C6' },
      { token: 'operator.arrow', foreground: 'A9B7C6' },
      { token: 'operator.ternary', foreground: 'A9B7C6' },
      { token: 'operator.increment', foreground: 'A9B7C6' },
      { token: 'operator.decrement', foreground: 'A9B7C6' },

      // ═══════════════════════════════════════════════════
      //  DELIMITERS / PUNCTUATION  —  default #A9B7C6
      //  Braces, brackets, parens, semicolons, commas,
      //  dots — all default text in Darcula.
      // ═══════════════════════════════════════════════════
      { token: 'delimiter', foreground: 'A9B7C6' },
      { token: 'delimiter.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.bracket', foreground: 'A9B7C6' },
      { token: 'delimiter.bracket.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.parenthesis', foreground: 'A9B7C6' },
      { token: 'delimiter.parenthesis.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.curly', foreground: 'A9B7C6' },
      { token: 'delimiter.curly.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.angle', foreground: 'A9B7C6' },
      { token: 'delimiter.angle.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.square', foreground: 'A9B7C6' },
      { token: 'delimiter.square.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.semicolon', foreground: 'A9B7C6' },
      { token: 'delimiter.semicolon.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.comma', foreground: 'A9B7C6' },
      { token: 'delimiter.comma.cpp', foreground: 'A9B7C6' },
      { token: 'delimiter.period', foreground: 'A9B7C6' },
      { token: 'delimiter.arrow', foreground: 'A9B7C6' },
      { token: 'delimiter.scope', foreground: 'A9B7C6' },
      // # in preprocessor → olive #BBB529
      { token: 'delimiter.hash', foreground: 'BBB529' },
      { token: 'delimiter.hash.cpp', foreground: 'BBB529' },
      { token: 'punctuation', foreground: 'A9B7C6' },
      { token: 'punctuation.cpp', foreground: 'A9B7C6' },
      // String delimiters (" ") → string green
      { token: 'punctuation.definition.string', foreground: '6A8759' },
      { token: 'punctuation.definition.string.cpp', foreground: '6A8759' },
      // Comment delimiters (// /* */) → comment gray
      { token: 'punctuation.definition.comment', foreground: '808080' },
      { token: 'punctuation.definition.comment.cpp', foreground: '808080' },
      // Directive punctuation (#) → olive
      { token: 'punctuation.definition.directive', foreground: 'BBB529' },

      // ═══════════════════════════════════════════════════
      //  SUPPORT (std library, built‐ins)
      // ═══════════════════════════════════════════════════
      { token: 'support.constant', foreground: '9876AA' },
      { token: 'support.constant.cpp', foreground: '9876AA' },
      { token: 'support.variable', foreground: 'A9B7C6' },
      { token: 'support.variable.cpp', foreground: 'A9B7C6' },
      { token: 'support.other', foreground: 'A9B7C6' },

      // ═══════════════════════════════════════════════════
      //  TAGS (doxygen XML, etc.)
      // ═══════════════════════════════════════════════════
      { token: 'tag', foreground: 'CC7832' },
      { token: 'tag.cpp', foreground: 'CC7832' },
      { token: 'attribute.name', foreground: 'BABABA' },
      { token: 'attribute.value', foreground: '6A8759' },

      // ═══════════════════════════════════════════════════
      //  METATOKENS
      // ═══════════════════════════════════════════════════
      { token: 'metatag', foreground: 'BBB529' },
      { token: 'metatag.content', foreground: '6A8759' },
      { token: 'metatag.cpp', foreground: 'BBB529' },

      // ═══════════════════════════════════════════════════
      //  REGEXP
      // ═══════════════════════════════════════════════════
      { token: 'regexp', foreground: '6A8759' },

      // ═══════════════════════════════════════════════════
      //  INVALID / DEPRECATED
      // ═══════════════════════════════════════════════════
      { token: 'invalid', foreground: 'BC3F3C', fontStyle: 'underline' },
      { token: 'invalid.illegal', foreground: 'BC3F3C', fontStyle: 'underline' },
      { token: 'invalid.deprecated', foreground: '808080', fontStyle: 'strikethrough' },

      // ═══════════════════════════════════════════════════
      //  TEXT EMPHASIS (doc comment markup)
      // ═══════════════════════════════════════════════════
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      // ═══════════════════════════════════════════════════
      //  WHITESPACE
      // ═══════════════════════════════════════════════════
      { token: 'white', foreground: '4D5154' },
    ],

    colors: {
      // ─────────────────────────────────────────────
      //  EDITOR CANVAS
      //  Darcula's warm #2B2B2B background
      // ─────────────────────────────────────────────
      'editor.background': '#2B2B2B',
      'editor.foreground': '#A9B7C6',

      // ─────────────────────────────────────────────
      //  LINE HIGHLIGHT
      //  Subtle #323232, no border (JetBrains style)
      // ─────────────────────────────────────────────
      'editor.lineHighlightBackground': '#323232',
      'editor.lineHighlightBorder': '#32323200',
      'editor.rangeHighlightBackground': '#13371433',
      'editor.rangeHighlightBorder': '#13371400',

      // ─────────────────────────────────────────────
      //  SELECTION
      //  Deep blue #214283 — signature Darcula select
      // ─────────────────────────────────────────────
      'editor.selectionBackground': '#214283',
      'editor.inactiveSelectionBackground': '#214283AA',
      'editor.selectionHighlightBackground': '#32593D44',
      'editor.selectionHighlightBorder': '#32593D00',

      // ─────────────────────────────────────────────
      //  WORD HIGHLIGHT
      //  JetBrains‑style identifier highlight
      // ─────────────────────────────────────────────
      'editor.wordHighlightBackground': '#344134',
      'editor.wordHighlightBorder': '#34413400',
      'editor.wordHighlightStrongBackground': '#40332B',
      'editor.wordHighlightStrongBorder': '#40332B00',
      'editor.wordHighlightTextBackground': '#344134',

      // ─────────────────────────────────────────────
      //  FIND / SEARCH
      //  Green‑tinted find results matching CLion
      // ─────────────────────────────────────────────
      'editor.findMatchBackground': '#155221',
      'editor.findMatchBorder': '#32593D',
      'editor.findMatchHighlightBackground': '#32593D55',
      'editor.findMatchHighlightBorder': '#32593D00',
      'editor.findRangeHighlightBackground': '#214283AA',
      'editor.findRangeHighlightBorder': '#21428300',

      // ─────────────────────────────────────────────
      //  HOVER
      // ─────────────────────────────────────────────
      'editor.hoverHighlightBackground': '#21428340',

      // ─────────────────────────────────────────────
      //  FOLDING
      // ─────────────────────────────────────────────
      'editor.foldBackground': '#3A3A3A55',

      // ─────────────────────────────────────────────
      //  LINKED EDITING
      // ─────────────────────────────────────────────
      'editor.linkedEditingBackground': '#BC3F3C33',

      // ─────────────────────────────────────────────
      //  CURSOR / CARET
      //  Light gray caret, matching CLion default
      // ─────────────────────────────────────────────
      'editorCursor.foreground': '#BBBBBB',
      'editorCursor.background': '#2B2B2B',

      // ─────────────────────────────────────────────
      //  LINE NUMBERS
      //  Muted gray #606366, active brighter #A4A3A3
      // ─────────────────────────────────────────────
      'editorLineNumber.foreground': '#606366',
      'editorLineNumber.activeForeground': '#A4A3A3',
      'editorLineNumber.dimmedForeground': '#4E4E4E',

      // ─────────────────────────────────────────────
      //  WHITESPACE GLYPHS
      // ─────────────────────────────────────────────
      'editorWhitespace.foreground': '#4D5154',

      // ─────────────────────────────────────────────
      //  RULERS  (right margin / print margin)
      //  CLion shows a vertical line at column 120
      // ─────────────────────────────────────────────
      'editorRuler.foreground': '#4D4D4D',

      // ─────────────────────────────────────────────
      //  CODE LENS
      // ─────────────────────────────────────────────
      'editorCodeLens.foreground': '#808080',

      // ─────────────────────────────────────────────
      //  LIGHT BULB (quick‑fix)
      // ─────────────────────────────────────────────
      'editorLightBulb.foreground': '#F0A732',
      'editorLightBulbAutoFix.foreground': '#6897BB',

      // ─────────────────────────────────────────────
      //  BRACKET MATCHING
      //  Teal‑green background, no harsh border
      // ─────────────────────────────────────────────
      'editorBracketMatch.background': '#3B514D',
      'editorBracketMatch.border': '#3B514D',

      // ─────────────────────────────────────────────
      //  BRACKET‑PAIR COLORIZATION
      //  JetBrains Rainbow Brackets style
      // ─────────────────────────────────────────────
      'editorBracketHighlight.foreground1': '#E8BA36',
      'editorBracketHighlight.foreground2': '#9E75D7',
      'editorBracketHighlight.foreground3': '#3AA59D',
      'editorBracketHighlight.foreground4': '#E8BA36',
      'editorBracketHighlight.foreground5': '#9E75D7',
      'editorBracketHighlight.foreground6': '#3AA59D',
      'editorBracketHighlight.unexpectedBracket.foreground': '#BC3F3C',

      // ─────────────────────────────────────────────
      //  BRACKET‑PAIR GUIDES
      // ─────────────────────────────────────────────
      'editorBracketPairGuide.activeBackground1': '#E8BA3666',
      'editorBracketPairGuide.activeBackground2': '#9E75D766',
      'editorBracketPairGuide.activeBackground3': '#3AA59D66',
      'editorBracketPairGuide.activeBackground4': '#E8BA3666',
      'editorBracketPairGuide.activeBackground5': '#9E75D766',
      'editorBracketPairGuide.activeBackground6': '#3AA59D66',
      'editorBracketPairGuide.background1': '#00000000',
      'editorBracketPairGuide.background2': '#00000000',
      'editorBracketPairGuide.background3': '#00000000',
      'editorBracketPairGuide.background4': '#00000000',
      'editorBracketPairGuide.background5': '#00000000',
      'editorBracketPairGuide.background6': '#00000000',

      // ─────────────────────────────────────────────
      //  INDENT GUIDES
      //  Very subtle lines, typical of JetBrains
      // ─────────────────────────────────────────────
      'editorIndentGuide.background': '#393939',
      'editorIndentGuide.activeBackground': '#606366',
      'editorIndentGuide.background1': '#393939',
      'editorIndentGuide.activeBackground1': '#606366',

      // ─────────────────────────────────────────────
      //  ERRORS / WARNINGS / INFO / HINTS
      //  JetBrains uses slightly different reds/ambers
      // ─────────────────────────────────────────────
      'editorError.foreground': '#BC3F3C',
      'editorError.background': '#BC3F3C00',
      'editorError.border': '#00000000',
      'editorWarning.foreground': '#BE9117',
      'editorWarning.background': '#BE911700',
      'editorWarning.border': '#00000000',
      'editorInfo.foreground': '#6897BB',
      'editorInfo.background': '#6897BB00',
      'editorInfo.border': '#00000000',
      'editorHint.foreground': '#A9B7C6',
      'editorHint.border': '#00000000',

      // ─────────────────────────────────────────────
      //  UNNECESSARY (dimmed) CODE
      //  CLion dims unused code significantly
      // ─────────────────────────────────────────────
      'editorUnnecessaryCode.opacity': '#000000AA',
      'editorUnnecessaryCode.border': '#00000000',

      // ─────────────────────────────────────────────
      //  GHOST TEXT (inline suggestions / AI assist)
      // ─────────────────────────────────────────────
      'editorGhostText.foreground': '#FFFFFF40',
      'editorGhostText.background': '#00000000',
      'editorGhostText.border': '#00000000',

      // ─────────────────────────────────────────────
      //  GUTTER
      //  Slightly lighter than editor background
      //  VCS colors match JetBrains conventions
      // ─────────────────────────────────────────────
      'editorGutter.background': '#313335',
      'editorGutter.modifiedBackground': '#4C81A1',
      'editorGutter.addedBackground': '#384C38',
      'editorGutter.deletedBackground': '#656E76',
      'editorGutter.commentRangeForeground': '#808080',
      'editorGutter.commentGlyphForeground': '#808080',
      'editorGutter.commentUnresolvedGlyphForeground': '#808080',
      'editorGutter.foldingControlForeground': '#A9B7C6',

      // ─────────────────────────────────────────────
      //  OVERVIEW RULER (right edge scrollbar marks)
      // ─────────────────────────────────────────────
      'editorOverviewRuler.border': '#3D3D3D',
      'editorOverviewRuler.background': '#2B2B2B',
      'editorOverviewRuler.findMatchForeground': '#32593D',
      'editorOverviewRuler.rangeHighlightForeground': '#214283CC',
      'editorOverviewRuler.selectionHighlightForeground': '#A9B7C6CC',
      'editorOverviewRuler.wordHighlightForeground': '#A9B7C6CC',
      'editorOverviewRuler.wordHighlightStrongForeground': '#9876AACC',
      'editorOverviewRuler.wordHighlightTextForeground': '#A9B7C6CC',
      'editorOverviewRuler.modifiedForeground': '#4C81A199',
      'editorOverviewRuler.addedForeground': '#384C3899',
      'editorOverviewRuler.deletedForeground': '#656E7699',
      'editorOverviewRuler.errorForeground': '#BC3F3CB3',
      'editorOverviewRuler.warningForeground': '#BE9117',
      'editorOverviewRuler.infoForeground': '#6897BB',
      'editorOverviewRuler.bracketMatchForeground': '#3B514D',

      // ─────────────────────────────────────────────
      //  MINIMAP
      // ─────────────────────────────────────────────
      'minimap.background': '#2B2B2B',
      'minimap.foregroundOpacity': '#000000FF',
      'minimap.selectionHighlight': '#214283',
      'minimap.selectionOccurrenceHighlight': '#344134',
      'minimap.errorHighlight': '#BC3F3CB3',
      'minimap.warningHighlight': '#BE9117',
      'minimap.findMatchHighlight': '#32593D',
      'minimapSlider.background': '#606366AA',
      'minimapSlider.hoverBackground': '#78787860',
      'minimapSlider.activeBackground': '#A9B7C640',
      'minimapGutter.addedBackground': '#384C38',
      'minimapGutter.modifiedBackground': '#4C81A1',
      'minimapGutter.deletedBackground': '#656E76',

      // ─────────────────────────────────────────────
      //  SCROLLBAR
      //  JetBrains uses very subtle scrollbars
      // ─────────────────────────────────────────────
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#5A5A5A44',
      'scrollbarSlider.hoverBackground': '#68686866',
      'scrollbarSlider.activeBackground': '#78787888',

      // ─────────────────────────────────────────────
      //  WIDGETS — Suggest, Hover, Peek, Markers
      //  JetBrains popup background is #3C3F41
      // ─────────────────────────────────────────────
      'editorWidget.background': '#3C3F41',
      'editorWidget.foreground': '#A9B7C6',
      'editorWidget.border': '#4B4B4B',
      'editorWidget.resizeBorder': '#5E5E5E',

      'editorSuggestWidget.background': '#3C3F41',
      'editorSuggestWidget.border': '#4B4B4B',
      'editorSuggestWidget.foreground': '#A9B7C6',
      'editorSuggestWidget.selectedBackground': '#113A5C',
      'editorSuggestWidget.selectedForeground': '#FFFFFF',
      'editorSuggestWidget.selectedIconForeground': '#FFFFFF',
      'editorSuggestWidget.highlightForeground': '#6897BB',
      'editorSuggestWidget.focusHighlightForeground': '#6897BB',

      'editorHoverWidget.background': '#3C3F41',
      'editorHoverWidget.border': '#5E5E5E',
      'editorHoverWidget.foreground': '#A9B7C6',
      'editorHoverWidget.statusBarBackground': '#353739',
      'editorHoverWidget.highlightForeground': '#6897BB',

      'editorMarkerNavigation.background': '#3C3F41',
      'editorMarkerNavigationError.background': '#BC3F3C',
      'editorMarkerNavigationWarning.background': '#BE9117',
      'editorMarkerNavigationInfo.background': '#6897BB',
      'editorMarkerNavigationError.headerBackground': '#BC3F3C1A',
      'editorMarkerNavigationWarning.headerBackground': '#BE91171A',
      'editorMarkerNavigationInfo.headerBackground': '#6897BB1A',

      // ─────────────────────────────────────────────
      //  PEEK VIEW
      // ─────────────────────────────────────────────
      'peekView.border': '#4B4B4B',
      'peekViewEditor.background': '#2D2D2D',
      'peekViewEditorGutter.background': '#313335',
      'peekViewEditor.matchHighlightBackground': '#32593D99',
      'peekViewEditor.matchHighlightBorder': '#32593D00',
      'peekViewResult.background': '#3C3F41',
      'peekViewResult.fileForeground': '#A9B7C6',
      'peekViewResult.lineForeground': '#808080',
      'peekViewResult.matchHighlightBackground': '#32593D66',
      'peekViewResult.selectionBackground': '#214283',
      'peekViewResult.selectionForeground': '#FFFFFF',
      'peekViewTitle.background': '#3C3F41',
      'peekViewTitleDescription.foreground': '#808080',
      'peekViewTitleLabel.foreground': '#A9B7C6',

      // ─────────────────────────────────────────────
      //  DIFF EDITOR
      //  JetBrains green/red/blue tinted diff
      // ─────────────────────────────────────────────
      'diffEditor.insertedTextBackground': '#29443633',
      'diffEditor.insertedTextBorder': '#29443600',
      'diffEditor.removedTextBackground': '#48230B33',
      'diffEditor.removedTextBorder': '#48230B00',
      'diffEditor.insertedLineBackground': '#2944361A',
      'diffEditor.removedLineBackground': '#48230B1A',
      'diffEditor.diagonalFill': '#45494A33',
      'diffEditorGutter.insertedLineBackground': '#29443666',
      'diffEditorGutter.removedLineBackground': '#48230B66',
      'diffEditorOverview.insertedForeground': '#29443699',
      'diffEditorOverview.removedForeground': '#48230B99',

      // ─────────────────────────────────────────────
      //  INPUT (search box, filter, find bar)
      //  JetBrains input field style
      // ─────────────────────────────────────────────
      'input.background': '#45494A',
      'input.border': '#646464',
      'input.foreground': '#A9B7C6',
      'input.placeholderForeground': '#808080',
      'inputOption.activeBackground': '#21428366',
      'inputOption.activeBorder': '#214283',
      'inputOption.activeForeground': '#FFFFFF',
      'inputOption.hoverBackground': '#45494A80',
      'inputValidation.errorBackground': '#58302B',
      'inputValidation.errorBorder': '#BC3F3C',
      'inputValidation.errorForeground': '#FFFFFF',
      'inputValidation.infoBackground': '#2D4557',
      'inputValidation.infoBorder': '#6897BB',
      'inputValidation.infoForeground': '#FFFFFF',
      'inputValidation.warningBackground': '#4D3B12',
      'inputValidation.warningBorder': '#BE9117',
      'inputValidation.warningForeground': '#FFFFFF',

      // ─────────────────────────────────────────────
      //  STICKY SCROLL
      // ─────────────────────────────────────────────
      'editorStickyScroll.background': '#2B2B2B',
      'editorStickyScrollHover.background': '#323232',

      // ─────────────────────────────────────────────
      //  INLAY HINTS
      //  JetBrains‑style subtle parameter name hints
      // ─────────────────────────────────────────────
      'editorInlayHint.background': '#3C3F4180',
      'editorInlayHint.foreground': '#787878',
      'editorInlayHint.typeForeground': '#787878',
      'editorInlayHint.parameterForeground': '#787878',
    },
  },
};
