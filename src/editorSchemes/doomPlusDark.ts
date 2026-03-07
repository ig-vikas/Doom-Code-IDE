import type { EditorColorScheme } from '../types/editorScheme';

export const doomPlusDark: EditorColorScheme = {
  id: 'doom-plus-dark',
  name: 'Doom+ Dark',
  type: 'dark',
  monacoTheme: {
    base: 'vs-dark',
    inherit: false,
    rules: [
      // ═══════════════════════════════════════════
      //  DEFAULT
      // ═══════════════════════════════════════════
      { token: '', foreground: 'D4D4D4', background: '1E1E1E' },

      // ═══════════════════════════════════════════
      //  COMMENTS  —  #6A9955 italic
      // ═══════════════════════════════════════════
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.line', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.block', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.cpp', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.line.cpp', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.block.cpp', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.doc.cpp', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.content', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'comment.content.cpp', foreground: '6A9955', fontStyle: 'italic' },
      // doc‐comment tags like @param, @return
      { token: 'comment.doc.tag', foreground: '569CD6', fontStyle: 'italic' },
      { token: 'comment.doc.tag.cpp', foreground: '569CD6', fontStyle: 'italic' },

      // ═══════════════════════════════════════════
      //  KEYWORDS  —  blue #569CD6
      //  (int, void, char, double, float, long,
      //   short, unsigned, signed, struct, class,
      //   enum, union, typedef, const, static,
      //   extern, volatile, register, inline,
      //   virtual, explicit, mutable, friend,
      //   public, private, protected, template,
      //   typename, namespace, using, operator,
      //   sizeof, alignof, decltype, noexcept,
      //   constexpr, static_assert, auto)
      // ═══════════════════════════════════════════
      { token: 'keyword', foreground: '569CD6' },
      { token: 'keyword.cpp', foreground: '569CD6' },
      { token: 'keyword.other', foreground: '569CD6' },
      { token: 'keyword.other.cpp', foreground: '569CD6' },
      { token: 'keyword.type', foreground: '569CD6' },
      { token: 'keyword.type.cpp', foreground: '569CD6' },
      { token: 'keyword.modifier', foreground: '569CD6' },
      { token: 'keyword.modifier.cpp', foreground: '569CD6' },
      { token: 'keyword.struct', foreground: '569CD6' },
      { token: 'keyword.class', foreground: '569CD6' },
      { token: 'keyword.enum', foreground: '569CD6' },
      { token: 'keyword.union', foreground: '569CD6' },
      { token: 'keyword.typedef', foreground: '569CD6' },

      // ═══════════════════════════════════════════
      //  CONTROL‐FLOW KEYWORDS  —  magenta #C586C0
      //  (if, else, for, while, do, switch, case,
      //   default, break, continue, return, goto,
      //   throw, try, catch, new, delete)
      // ═══════════════════════════════════════════
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'keyword.control.cpp', foreground: 'C586C0' },
      { token: 'keyword.control.flow', foreground: 'C586C0' },
      { token: 'keyword.control.flow.cpp', foreground: 'C586C0' },
      { token: 'keyword.control.loop', foreground: 'C586C0' },
      { token: 'keyword.control.loop.cpp', foreground: 'C586C0' },
      { token: 'keyword.control.conditional', foreground: 'C586C0' },
      { token: 'keyword.control.conditional.cpp', foreground: 'C586C0' },
      { token: 'keyword.control.return', foreground: 'C586C0' },
      { token: 'keyword.control.return.cpp', foreground: 'C586C0' },
      { token: 'keyword.control.switch', foreground: 'C586C0' },
      { token: 'keyword.control.switch.cpp', foreground: 'C586C0' },
      { token: 'keyword.control.case', foreground: 'C586C0' },
      { token: 'keyword.control.new', foreground: 'C586C0' },
      { token: 'keyword.control.delete', foreground: 'C586C0' },
      { token: 'keyword.control.throw', foreground: 'C586C0' },
      { token: 'keyword.control.trycatch', foreground: 'C586C0' },

      // operator keywords (sizeof, new, delete as operator)  —  #569CD6
      { token: 'keyword.operator', foreground: '569CD6' },
      { token: 'keyword.operator.cpp', foreground: '569CD6' },
      { token: 'keyword.operator.sizeof', foreground: '569CD6' },
      { token: 'keyword.operator.alignof', foreground: '569CD6' },
      { token: 'keyword.operator.cast', foreground: '569CD6' },
      { token: 'keyword.operator.expression', foreground: '569CD6' },
      { token: 'keyword.operator.new', foreground: 'C586C0' },
      { token: 'keyword.operator.delete', foreground: 'C586C0' },
      { token: 'keyword.operator.wordlike', foreground: '569CD6' },

      // ═══════════════════════════════════════════
      //  PREPROCESSOR / DIRECTIVES  —  #C586C0
      //  (#include, #define, #undef, #ifdef,
      //   #ifndef, #if, #else, #elif, #endif,
      //   #pragma, #error, #warning, #line)
      // ═══════════════════════════════════════════
      { token: 'preprocessor', foreground: 'C586C0' },
      { token: 'preprocessor.cpp', foreground: 'C586C0' },
      { token: 'meta.preprocessor', foreground: 'C586C0' },
      { token: 'meta.preprocessor.cpp', foreground: 'C586C0' },
      { token: 'meta.preprocessor.string', foreground: 'CE9178' },
      { token: 'meta.preprocessor.string.cpp', foreground: 'CE9178' },
      { token: 'meta.preprocessor.macro', foreground: '569CD6' },
      { token: 'meta.preprocessor.macro.cpp', foreground: '569CD6' },
      { token: 'keyword.directive', foreground: 'C586C0' },
      { token: 'keyword.directive.cpp', foreground: 'C586C0' },
      { token: 'keyword.directive.include', foreground: 'C586C0' },
      { token: 'keyword.directive.include.cpp', foreground: 'C586C0' },
      { token: 'keyword.directive.include.begin', foreground: 'CE9178' },
      { token: 'keyword.directive.include.end', foreground: 'CE9178' },
      { token: 'keyword.directive.define', foreground: 'C586C0' },
      { token: 'keyword.directive.define.cpp', foreground: 'C586C0' },
      { token: 'keyword.directive.ifdef', foreground: 'C586C0' },
      { token: 'keyword.directive.ifndef', foreground: 'C586C0' },
      { token: 'keyword.directive.endif', foreground: 'C586C0' },
      { token: 'keyword.directive.pragma', foreground: 'C586C0' },
      { token: 'keyword.directive.error', foreground: 'C586C0' },

      // ═══════════════════════════════════════════
      //  STORAGE MODIFIERS  —  #569CD6
      //  (static, extern, const, volatile, mutable,
      //   register, inline, constexpr, thread_local)
      // ═══════════════════════════════════════════
      { token: 'storage', foreground: '569CD6' },
      { token: 'storage.cpp', foreground: '569CD6' },
      { token: 'storage.type', foreground: '569CD6' },
      { token: 'storage.type.cpp', foreground: '569CD6' },
      { token: 'storage.modifier', foreground: '569CD6' },
      { token: 'storage.modifier.cpp', foreground: '569CD6' },
      { token: 'storage.type.builtin', foreground: '569CD6' },
      { token: 'storage.type.builtin.cpp', foreground: '569CD6' },
      { token: 'storage.type.primitive', foreground: '569CD6' },
      { token: 'storage.type.primitive.cpp', foreground: '569CD6' },

      // ═══════════════════════════════════════════
      //  USER‑DEFINED TYPES  —  teal #4EC9B0
      //  (class names, struct names, enum names,
      //   typedefs, template params, concept names)
      // ═══════════════════════════════════════════
      { token: 'type', foreground: '4EC9B0' },
      { token: 'type.cpp', foreground: '4EC9B0' },
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'type.identifier.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type', foreground: '4EC9B0' },
      { token: 'entity.name.type.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type.class', foreground: '4EC9B0' },
      { token: 'entity.name.type.class.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type.struct', foreground: '4EC9B0' },
      { token: 'entity.name.type.struct.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type.enum', foreground: '4EC9B0' },
      { token: 'entity.name.type.enum.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type.typedef', foreground: '4EC9B0' },
      { token: 'entity.name.type.typedef.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type.template', foreground: '4EC9B0' },
      { token: 'entity.name.type.template.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.type.concept', foreground: '4EC9B0' },
      { token: 'entity.name.class', foreground: '4EC9B0' },
      { token: 'entity.name.class.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.struct', foreground: '4EC9B0' },
      { token: 'entity.name.struct.cpp', foreground: '4EC9B0' },
      { token: 'support.type', foreground: '4EC9B0' },
      { token: 'support.type.cpp', foreground: '4EC9B0' },
      { token: 'support.class', foreground: '4EC9B0' },
      { token: 'support.class.cpp', foreground: '4EC9B0' },
      { token: 'support.type.posix-reserved', foreground: '4EC9B0' },
      { token: 'support.type.stdint', foreground: '4EC9B0' },

      // ═══════════════════════════════════════════
      //  FUNCTIONS  —  yellow #DCDCAA
      // ═══════════════════════════════════════════
      { token: 'entity.name.function', foreground: 'DCDCAA' },
      { token: 'entity.name.function.cpp', foreground: 'DCDCAA' },
      { token: 'entity.name.function.member', foreground: 'DCDCAA' },
      { token: 'entity.name.function.member.cpp', foreground: 'DCDCAA' },
      { token: 'entity.name.function.operator', foreground: 'DCDCAA' },
      { token: 'entity.name.function.preprocessor', foreground: 'DCDCAA' },
      { token: 'entity.name.function.destructor', foreground: 'DCDCAA' },
      { token: 'entity.name.function.constructor', foreground: 'DCDCAA' },
      { token: 'support.function', foreground: 'DCDCAA' },
      { token: 'support.function.cpp', foreground: 'DCDCAA' },
      { token: 'support.function.C99', foreground: 'DCDCAA' },
      { token: 'meta.function-call', foreground: 'DCDCAA' },
      { token: 'meta.function-call.cpp', foreground: 'DCDCAA' },

      // ═══════════════════════════════════════════
      //  VARIABLES  —  light blue #9CDCFE
      // ═══════════════════════════════════════════
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'variable.cpp', foreground: '9CDCFE' },
      { token: 'variable.other', foreground: '9CDCFE' },
      { token: 'variable.other.cpp', foreground: '9CDCFE' },
      { token: 'variable.other.local', foreground: '9CDCFE' },
      { token: 'variable.other.local.cpp', foreground: '9CDCFE' },
      { token: 'variable.other.global', foreground: '9CDCFE' },
      { token: 'variable.other.global.cpp', foreground: '9CDCFE' },
      { token: 'variable.other.member', foreground: '9CDCFE' },
      { token: 'variable.other.member.cpp', foreground: '9CDCFE' },
      { token: 'variable.other.object', foreground: '9CDCFE' },
      { token: 'variable.other.object.cpp', foreground: '9CDCFE' },
      { token: 'variable.other.property', foreground: '9CDCFE' },
      { token: 'variable.other.property.cpp', foreground: '9CDCFE' },
      { token: 'variable.parameter', foreground: '9CDCFE' },
      { token: 'variable.parameter.cpp', foreground: '9CDCFE' },
      { token: 'variable.predefined', foreground: '4FC1FF' },
      { token: 'variable.predefined.cpp', foreground: '4FC1FF' },
      // `this` keyword  —  #569CD6
      { token: 'variable.language', foreground: '569CD6' },
      { token: 'variable.language.cpp', foreground: '569CD6' },
      { token: 'variable.language.this', foreground: '569CD6' },
      { token: 'variable.language.this.cpp', foreground: '569CD6' },
      // enum members / compile‐time constants  —  bright blue #4FC1FF
      { token: 'variable.other.enummember', foreground: '4FC1FF' },
      { token: 'variable.other.enummember.cpp', foreground: '4FC1FF' },
      { token: 'variable.other.constant', foreground: '4FC1FF' },
      { token: 'variable.other.constant.cpp', foreground: '4FC1FF' },

      // ═══════════════════════════════════════════
      //  IDENTIFIERS (fallback)  —  #9CDCFE
      // ═══════════════════════════════════════════
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'identifier.cpp', foreground: '9CDCFE' },

      // ═══════════════════════════════════════════
      //  NAMESPACE  —  teal italic #4EC9B0
      // ═══════════════════════════════════════════
      { token: 'namespace', foreground: '4EC9B0' },
      { token: 'namespace.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.namespace', foreground: '4EC9B0' },
      { token: 'entity.name.namespace.cpp', foreground: '4EC9B0' },
      { token: 'entity.name.scope-resolution', foreground: '4EC9B0' },
      { token: 'entity.name.scope-resolution.cpp', foreground: '4EC9B0' },

      // ═══════════════════════════════════════════
      //  STRINGS  —  orange/salmon #CE9178
      // ═══════════════════════════════════════════
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.cpp', foreground: 'CE9178' },
      { token: 'string.quoted', foreground: 'CE9178' },
      { token: 'string.quoted.double', foreground: 'CE9178' },
      { token: 'string.quoted.double.cpp', foreground: 'CE9178' },
      { token: 'string.quoted.single', foreground: 'CE9178' },
      { token: 'string.quoted.single.cpp', foreground: 'CE9178' },
      { token: 'string.quoted.include', foreground: 'CE9178' },
      { token: 'string.quoted.include.cpp', foreground: 'CE9178' },
      { token: 'string.quoted.angle', foreground: 'CE9178' },
      { token: 'string.quoted.angle.cpp', foreground: 'CE9178' },
      { token: 'string.include', foreground: 'CE9178' },
      { token: 'string.include.cpp', foreground: 'CE9178' },
      { token: 'string.raw', foreground: 'CE9178' },
      { token: 'string.raw.cpp', foreground: 'CE9178' },
      { token: 'character', foreground: 'CE9178' },
      { token: 'character.cpp', foreground: 'CE9178' },
      // escape sequences  —  gold #D7BA7D
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'string.escape.cpp', foreground: 'D7BA7D' },
      { token: 'constant.character.escape', foreground: 'D7BA7D' },
      { token: 'constant.character.escape.cpp', foreground: 'D7BA7D' },
      // format specifiers like %d, %s  —  bright blue #9CDCFE
      { token: 'string.format', foreground: '9CDCFE' },
      { token: 'string.format.cpp', foreground: '9CDCFE' },
      { token: 'constant.other.placeholder', foreground: '9CDCFE' },
      { token: 'constant.other.placeholder.cpp', foreground: '9CDCFE' },
      // regex in strings
      { token: 'string.regex', foreground: 'D16969' },
      { token: 'string.regex.cpp', foreground: 'D16969' },

      // ═══════════════════════════════════════════
      //  NUMBERS  —  light green #B5CEA8
      // ═══════════════════════════════════════════
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'number.cpp', foreground: 'B5CEA8' },
      { token: 'number.float', foreground: 'B5CEA8' },
      { token: 'number.float.cpp', foreground: 'B5CEA8' },
      { token: 'number.hex', foreground: 'B5CEA8' },
      { token: 'number.hex.cpp', foreground: 'B5CEA8' },
      { token: 'number.binary', foreground: 'B5CEA8' },
      { token: 'number.binary.cpp', foreground: 'B5CEA8' },
      { token: 'number.octal', foreground: 'B5CEA8' },
      { token: 'number.octal.cpp', foreground: 'B5CEA8' },
      { token: 'number.decimal', foreground: 'B5CEA8' },
      { token: 'number.decimal.cpp', foreground: 'B5CEA8' },
      { token: 'number.suffix', foreground: 'B5CEA8' },

      // ═══════════════════════════════════════════
      //  CONSTANTS  —  various
      // ═══════════════════════════════════════════
      { token: 'constant', foreground: '4FC1FF' },
      { token: 'constant.cpp', foreground: '4FC1FF' },
      { token: 'constant.numeric', foreground: 'B5CEA8' },
      { token: 'constant.numeric.cpp', foreground: 'B5CEA8' },
      { token: 'constant.numeric.integer', foreground: 'B5CEA8' },
      { token: 'constant.numeric.float', foreground: 'B5CEA8' },
      { token: 'constant.numeric.hex', foreground: 'B5CEA8' },
      { token: 'constant.numeric.octal', foreground: 'B5CEA8' },
      { token: 'constant.numeric.binary', foreground: 'B5CEA8' },
      // true, false, nullptr, NULL  —  #569CD6
      { token: 'constant.language', foreground: '569CD6' },
      { token: 'constant.language.cpp', foreground: '569CD6' },
      { token: 'constant.language.boolean', foreground: '569CD6' },
      { token: 'constant.language.boolean.cpp', foreground: '569CD6' },
      { token: 'constant.language.nullptr', foreground: '569CD6' },
      { token: 'constant.language.nullptr.cpp', foreground: '569CD6' },
      // character constants
      { token: 'constant.character', foreground: 'CE9178' },
      { token: 'constant.character.cpp', foreground: 'CE9178' },
      // other constants (macros, enum values)  —  #4FC1FF
      { token: 'constant.other', foreground: '4FC1FF' },
      { token: 'constant.other.cpp', foreground: '4FC1FF' },
      { token: 'constant.other.enum', foreground: '4FC1FF' },
      { token: 'constant.other.enum.cpp', foreground: '4FC1FF' },
      { token: 'constant.other.macro', foreground: '569CD6' },
      { token: 'constant.other.macro.cpp', foreground: '569CD6' },

      // ═══════════════════════════════════════════
      //  ANNOTATIONS / ATTRIBUTES  —  #DCDCAA
      //  ([[nodiscard]], [[deprecated]], etc.)
      // ═══════════════════════════════════════════
      { token: 'annotation', foreground: 'DCDCAA' },
      { token: 'annotation.cpp', foreground: 'DCDCAA' },
      { token: 'meta.attribute', foreground: 'DCDCAA' },
      { token: 'meta.attribute.cpp', foreground: 'DCDCAA' },

      // ═══════════════════════════════════════════
      //  LABELS  —  #C8C8C8
      // ═══════════════════════════════════════════
      { token: 'entity.name.label', foreground: 'C8C8C8' },
      { token: 'entity.name.label.cpp', foreground: 'C8C8C8' },
      { token: 'label', foreground: 'C8C8C8' },
      { token: 'label.cpp', foreground: 'C8C8C8' },

      // ═══════════════════════════════════════════
      //  OPERATORS  —  #D4D4D4
      //  (=, +, -, *, /, %, ==, !=, <, >, <=, >=,
      //   &&, ||, !, &, |, ^, ~, <<, >>, ++, --,
      //   +=, -=, *=, /=, %=, <<=, >>=, &=, |=,
      //   ^=, ->, .*, ->*, ::, ? :, ,)
      // ═══════════════════════════════════════════
      { token: 'operator', foreground: 'D4D4D4' },
      { token: 'operator.cpp', foreground: 'D4D4D4' },
      { token: 'operator.assignment', foreground: 'D4D4D4' },
      { token: 'operator.arithmetic', foreground: 'D4D4D4' },
      { token: 'operator.comparison', foreground: 'D4D4D4' },
      { token: 'operator.logical', foreground: 'D4D4D4' },
      { token: 'operator.bitwise', foreground: 'D4D4D4' },
      { token: 'operator.scope', foreground: 'D4D4D4' },
      { token: 'operator.arrow', foreground: 'D4D4D4' },
      { token: 'operator.ternary', foreground: 'D4D4D4' },
      { token: 'operator.increment', foreground: 'D4D4D4' },
      { token: 'operator.decrement', foreground: 'D4D4D4' },

      // ═══════════════════════════════════════════
      //  DELIMITERS / PUNCTUATION  —  #D4D4D4
      // ═══════════════════════════════════════════
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'delimiter.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.bracket', foreground: 'D4D4D4' },
      { token: 'delimiter.bracket.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.parenthesis', foreground: 'D4D4D4' },
      { token: 'delimiter.parenthesis.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.curly', foreground: 'D4D4D4' },
      { token: 'delimiter.curly.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.angle', foreground: 'D4D4D4' },
      { token: 'delimiter.angle.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.square', foreground: 'D4D4D4' },
      { token: 'delimiter.square.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.semicolon', foreground: 'D4D4D4' },
      { token: 'delimiter.semicolon.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.comma', foreground: 'D4D4D4' },
      { token: 'delimiter.comma.cpp', foreground: 'D4D4D4' },
      { token: 'delimiter.period', foreground: 'D4D4D4' },
      { token: 'delimiter.arrow', foreground: 'D4D4D4' },
      { token: 'delimiter.scope', foreground: 'D4D4D4' },
      { token: 'delimiter.hash', foreground: 'C586C0' },
      { token: 'delimiter.hash.cpp', foreground: 'C586C0' },
      { token: 'punctuation', foreground: 'D4D4D4' },
      { token: 'punctuation.cpp', foreground: 'D4D4D4' },
      { token: 'punctuation.definition.string', foreground: 'CE9178' },
      { token: 'punctuation.definition.string.cpp', foreground: 'CE9178' },
      { token: 'punctuation.definition.comment', foreground: '6A9955' },
      { token: 'punctuation.definition.comment.cpp', foreground: '6A9955' },
      { token: 'punctuation.definition.directive', foreground: 'C586C0' },

      // ═══════════════════════════════════════════
      //  SUPPORT  —  std library, builtins
      // ═══════════════════════════════════════════
      { token: 'support.constant', foreground: '4FC1FF' },
      { token: 'support.constant.cpp', foreground: '4FC1FF' },
      { token: 'support.variable', foreground: '9CDCFE' },
      { token: 'support.variable.cpp', foreground: '9CDCFE' },
      { token: 'support.other', foreground: '9CDCFE' },

      // ═══════════════════════════════════════════
      //  TAGS (doxygen/XML in doc comments)
      // ═══════════════════════════════════════════
      { token: 'tag', foreground: '569CD6' },
      { token: 'tag.cpp', foreground: '569CD6' },
      { token: 'attribute.name', foreground: '9CDCFE' },
      { token: 'attribute.value', foreground: 'CE9178' },

      // ═══════════════════════════════════════════
      //  METATOKENS
      // ═══════════════════════════════════════════
      { token: 'metatag', foreground: 'C586C0' },
      { token: 'metatag.content', foreground: 'CE9178' },
      { token: 'metatag.cpp', foreground: 'C586C0' },

      // ═══════════════════════════════════════════
      //  REGEXP
      // ═══════════════════════════════════════════
      { token: 'regexp', foreground: 'D16969' },

      // ═══════════════════════════════════════════
      //  INVALID / DEPRECATED
      // ═══════════════════════════════════════════
      { token: 'invalid', foreground: 'F44747', fontStyle: 'underline' },
      { token: 'invalid.illegal', foreground: 'F44747', fontStyle: 'underline' },
      { token: 'invalid.deprecated', foreground: 'BFBFBF', fontStyle: 'strikethrough' },

      // ═══════════════════════════════════════════
      //  TEXT EMPHASIS (markdown in doc comments)
      // ═══════════════════════════════════════════
      { token: 'emphasis', fontStyle: 'italic' },
      { token: 'strong', fontStyle: 'bold' },

      // ═══════════════════════════════════════════
      //  WHITESPACE (for visible whitespace render)
      // ═══════════════════════════════════════════
      { token: 'white', foreground: '3B3B3B' },
    ],

    colors: {
      // ─── Editor canvas ─────────────────────────
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',

      // ─── Line highlight ────────────────────────
      'editor.lineHighlightBackground': '#2A2D2E',
      'editor.lineHighlightBorder': '#28282800',
      'editor.rangeHighlightBackground': '#FFFFFF0B',
      'editor.rangeHighlightBorder': '#FFFFFF00',

      // ─── Selection ─────────────────────────────
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
      'editor.selectionHighlightBackground': '#ADD6FF26',
      'editor.selectionHighlightBorder': '#495F7700',
      'editor.selectionForeground': '#FFFFFF',

      // ─── Word highlight ────────────────────────
      'editor.wordHighlightBackground': '#575757B8',
      'editor.wordHighlightBorder': '#575757B8',
      'editor.wordHighlightStrongBackground': '#004972B8',
      'editor.wordHighlightStrongBorder': '#004972B8',
      'editor.wordHighlightTextBackground': '#575757B8',

      // ─── Find / Search ─────────────────────────
      'editor.findMatchBackground': '#515C6A',
      'editor.findMatchBorder': '#74879F',
      'editor.findMatchHighlightBackground': '#EA5C0055',
      'editor.findMatchHighlightBorder': '#EA5C0000',
      'editor.findRangeHighlightBackground': '#3A3D4166',
      'editor.findRangeHighlightBorder': '#3A3D4100',

      // ─── Hover ─────────────────────────────────
      'editor.hoverHighlightBackground': '#264F7840',

      // ─── Folding ───────────────────────────────
      'editor.foldBackground': '#264F7833',

      // ─── Linked editing ────────────────────────
      'editor.linkedEditingBackground': '#FF00004D',

      // ─── Cursor ────────────────────────────────
      'editorCursor.foreground': '#AEAFAD',
      'editorCursor.background': '#000000',

      // ─── Line numbers ──────────────────────────
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editorLineNumber.dimmedForeground': '#545454',

      // ─── Whitespace glyphs ─────────────────────
      'editorWhitespace.foreground': '#3B3B3B',

      // ─── Rulers ────────────────────────────────
      'editorRuler.foreground': '#5A5A5A',

      // ─── Code lens ─────────────────────────────
      'editorCodeLens.foreground': '#999999',

      // ─── Light bulb ────────────────────────────
      'editorLightBulb.foreground': '#FFCC00',
      'editorLightBulbAutoFix.foreground': '#75BEFF',

      // ─── Bracket matching ──────────────────────
      'editorBracketMatch.background': '#0064001A',
      'editorBracketMatch.border': '#888888',

      // ─── Bracket‐pair colorization ─────────────
      'editorBracketHighlight.foreground1': '#FFD700',
      'editorBracketHighlight.foreground2': '#DA70D6',
      'editorBracketHighlight.foreground3': '#179FFF',
      'editorBracketHighlight.foreground4': '#FFD700',
      'editorBracketHighlight.foreground5': '#DA70D6',
      'editorBracketHighlight.foreground6': '#179FFF',
      'editorBracketHighlight.unexpectedBracket.foreground': '#FF0000',

      // ─── Bracket‐pair guides ───────────────────
      'editorBracketPairGuide.activeBackground1': '#FFD70066',
      'editorBracketPairGuide.activeBackground2': '#DA70D666',
      'editorBracketPairGuide.activeBackground3': '#179FFF66',
      'editorBracketPairGuide.activeBackground4': '#FFD70066',
      'editorBracketPairGuide.activeBackground5': '#DA70D666',
      'editorBracketPairGuide.activeBackground6': '#179FFF66',
      'editorBracketPairGuide.background1': '#00000000',
      'editorBracketPairGuide.background2': '#00000000',
      'editorBracketPairGuide.background3': '#00000000',
      'editorBracketPairGuide.background4': '#00000000',
      'editorBracketPairGuide.background5': '#00000000',
      'editorBracketPairGuide.background6': '#00000000',

      // ─── Indent guides ─────────────────────────
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'editorIndentGuide.background1': '#404040',
      'editorIndentGuide.activeBackground1': '#707070',

      // ─── Errors / Warnings / Info / Hints ──────
      'editorError.foreground': '#F14C4C',
      'editorError.background': '#F14C4C00',
      'editorError.border': '#00000000',
      'editorWarning.foreground': '#CCA700',
      'editorWarning.background': '#CCA70000',
      'editorWarning.border': '#00000000',
      'editorInfo.foreground': '#3794FF',
      'editorInfo.background': '#3794FF00',
      'editorInfo.border': '#00000000',
      'editorHint.foreground': '#EEEEEE',
      'editorHint.border': '#00000000',

      // ─── Unnecessary (dimmed) code ─────────────
      'editorUnnecessaryCode.opacity': '#000000AA',
      'editorUnnecessaryCode.border': '#00000000',

      // ─── Ghost text (inline suggestions) ───────
      'editorGhostText.foreground': '#FFFFFF56',
      'editorGhostText.background': '#00000000',
      'editorGhostText.border': '#00000000',

      // ─── Gutter ────────────────────────────────
      'editorGutter.background': '#1E1E1E',
      'editorGutter.modifiedBackground': '#1B81A8',
      'editorGutter.addedBackground': '#487E02',
      'editorGutter.deletedBackground': '#F14C4C',
      'editorGutter.commentRangeForeground': '#C5C5C5',
      'editorGutter.commentGlyphForeground': '#C5C5C5',
      'editorGutter.commentUnresolvedGlyphForeground': '#C5C5C5',
      'editorGutter.foldingControlForeground': '#C5C5C5',

      // ─── Overview ruler (right edge) ───────────
      'editorOverviewRuler.border': '#7F7F7F4D',
      'editorOverviewRuler.background': '#1E1E1E',
      'editorOverviewRuler.findMatchForeground': '#D18616',
      'editorOverviewRuler.rangeHighlightForeground': '#007ACC99',
      'editorOverviewRuler.selectionHighlightForeground': '#A0A0A0CC',
      'editorOverviewRuler.wordHighlightForeground': '#A0A0A0CC',
      'editorOverviewRuler.wordHighlightStrongForeground': '#C0A0C0CC',
      'editorOverviewRuler.wordHighlightTextForeground': '#A0A0A0CC',
      'editorOverviewRuler.modifiedForeground': '#1B81A899',
      'editorOverviewRuler.addedForeground': '#487E0299',
      'editorOverviewRuler.deletedForeground': '#F14C4C99',
      'editorOverviewRuler.errorForeground': '#FF1212B3',
      'editorOverviewRuler.warningForeground': '#CCA700',
      'editorOverviewRuler.infoForeground': '#3794FF',
      'editorOverviewRuler.bracketMatchForeground': '#A0A0A0',

      // ─── Minimap ───────────────────────────────
      'minimap.background': '#1E1E1E',
      'minimap.foregroundOpacity': '#000000FF',
      'minimap.selectionHighlight': '#264F78',
      'minimap.selectionOccurrenceHighlight': '#676767',
      'minimap.errorHighlight': '#FF1212B3',
      'minimap.warningHighlight': '#CCA700',
      'minimap.findMatchHighlight': '#D18616',
      'minimapSlider.background': '#79797933',
      'minimapSlider.hoverBackground': '#64646459',
      'minimapSlider.activeBackground': '#BFBFBF33',
      'minimapGutter.addedBackground': '#487E02',
      'minimapGutter.modifiedBackground': '#1B81A8',
      'minimapGutter.deletedBackground': '#F14C4C',

      // ─── Scrollbar ─────────────────────────────
      'scrollbar.shadow': '#000000',
      'scrollbarSlider.background': '#79797966',
      'scrollbarSlider.hoverBackground': '#646464B3',
      'scrollbarSlider.activeBackground': '#BFBFBF66',

      // ─── Widgets (suggest, hover, peek) ────────
      'editorWidget.background': '#252526',
      'editorWidget.foreground': '#CCCCCC',
      'editorWidget.border': '#454545',
      'editorWidget.resizeBorder': '#5F5F5F',

      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#454545',
      'editorSuggestWidget.foreground': '#D4D4D4',
      'editorSuggestWidget.selectedBackground': '#04395E',
      'editorSuggestWidget.selectedForeground': '#FFFFFF',
      'editorSuggestWidget.selectedIconForeground': '#FFFFFF',
      'editorSuggestWidget.highlightForeground': '#18A3FF',
      'editorSuggestWidget.focusHighlightForeground': '#18A3FF',

      'editorHoverWidget.background': '#252526',
      'editorHoverWidget.border': '#454545',
      'editorHoverWidget.foreground': '#CCCCCC',
      'editorHoverWidget.statusBarBackground': '#2C2C2D',
      'editorHoverWidget.highlightForeground': '#18A3FF',

      'editorMarkerNavigation.background': '#2D2D30',
      'editorMarkerNavigationError.background': '#F14C4C',
      'editorMarkerNavigationWarning.background': '#CCA700',
      'editorMarkerNavigationInfo.background': '#3794FF',
      'editorMarkerNavigationError.headerBackground': '#F14C4C1A',
      'editorMarkerNavigationWarning.headerBackground': '#CCA7001A',
      'editorMarkerNavigationInfo.headerBackground': '#3794FF1A',

      // ─── Peek view ─────────────────────────────
      'peekView.border': '#3794FF',
      'peekViewEditor.background': '#001F33',
      'peekViewEditorGutter.background': '#001F33',
      'peekViewEditor.matchHighlightBackground': '#FF8F0099',
      'peekViewEditor.matchHighlightBorder': '#FF8F0000',
      'peekViewResult.background': '#252526',
      'peekViewResult.fileForeground': '#FFFFFF',
      'peekViewResult.lineForeground': '#BBBBBB',
      'peekViewResult.matchHighlightBackground': '#EA5C004D',
      'peekViewResult.selectionBackground': '#3399FF33',
      'peekViewResult.selectionForeground': '#FFFFFF',
      'peekViewTitle.background': '#252526',
      'peekViewTitleDescription.foreground': '#CCCCCCB3',
      'peekViewTitleLabel.foreground': '#FFFFFF',

      // ─── Diff editor ───────────────────────────
      'diffEditor.insertedTextBackground': '#9BB95533',
      'diffEditor.insertedTextBorder': '#9BB95500',
      'diffEditor.removedTextBackground': '#FF000033',
      'diffEditor.removedTextBorder': '#FF000000',
      'diffEditor.insertedLineBackground': '#9BB9551A',
      'diffEditor.removedLineBackground': '#FF00001A',
      'diffEditor.diagonalFill': '#CCCCCC33',
      'diffEditorGutter.insertedLineBackground': '#487E0266',
      'diffEditorGutter.removedLineBackground': '#F14C4C66',
      'diffEditorOverview.insertedForeground': '#487E0299',
      'diffEditorOverview.removedForeground': '#F14C4C99',

      // ─── Input (search box, filter, etc.) ──────
      'input.background': '#3C3C3C',
      'input.border': '#454545',
      'input.foreground': '#CCCCCC',
      'input.placeholderForeground': '#A6A6A6',
      'inputOption.activeBackground': '#007ACC66',
      'inputOption.activeBorder': '#007ACC',
      'inputOption.activeForeground': '#FFFFFF',
      'inputOption.hoverBackground': '#5A5D5E80',
      'inputValidation.errorBackground': '#5A1D1D',
      'inputValidation.errorBorder': '#BE1100',
      'inputValidation.errorForeground': '#FFFFFF',
      'inputValidation.infoBackground': '#063B49',
      'inputValidation.infoBorder': '#007ACC',
      'inputValidation.infoForeground': '#FFFFFF',
      'inputValidation.warningBackground': '#352A05',
      'inputValidation.warningBorder': '#B89500',
      'inputValidation.warningForeground': '#FFFFFF',

      // ─── Sticky scroll ─────────────────────────
      'editorStickyScroll.background': '#1E1E1E',
      'editorStickyScrollHover.background': '#2A2D2E',

      // ─── Inlay hints ───────────────────────────
      'editorInlayHint.background': '#4D4D4D40',
      'editorInlayHint.foreground': '#969696',
      'editorInlayHint.typeForeground': '#969696',
      'editorInlayHint.parameterForeground': '#969696',
    },
  },
};
