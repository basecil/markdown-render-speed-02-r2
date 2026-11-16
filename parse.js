// A dependency-free Markdown renderer that reproduces marked 18.1.3's output
// (GFM on, breaks off, pedantic off) exactly, written from scratch for speed.

const LINE_UNDERLINE = /\n {0,3}(?:=+|-+)[ \t]*(?:\n|$)/;
const LIST_PREFIX_CACHE = new Map();
const PREFIX_CACHE = new Map();
const B = {}; // block rules
const I = {}; // inline rules
const O = {}; // helper rules
B.newline = new RegExp("^(?:[ \\t]*(?:\\n|$))+", "");
B.code = new RegExp("^((?: {4}| {0,3}\\t)[^\\n]+(?:\\n(?:[ \\t]*(?:\\n|$))*)?)+", "");
B.fences = new RegExp("^ {0,3}(`{3,}(?=[^`\\n]*(?:\\n|$))|~{3,})([^\\n]*)(?:\\n|$)(?:|([\\s\\S]*?)(?:\\n|$))(?: {0,3}(?:(?=`)\\1`*|(?=~)\\1~*) *(?=\\n|$)|$)", "");
B.heading = new RegExp("^ {0,3}(#{1,6})(?=\\s|$)(.*)(?:\\n+|$)", "");
B.hr = new RegExp("^ {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)", "");
B.blockquote = new RegExp("^( {0,3}> ?(?:(?![ \\t]*(?:\\n|$))(([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|\\d{1,9}[.)])(?:[ \\t]|\\n|$)| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)|[ \\t]+\\n)[^\\n]+)*))|[^\\n]*)(?:\\n|$))+", "");
B.list = new RegExp("^( {0,3}(?:[*+-]|\\d{1,9}[.)]))([ \\t][^\\n]*?)?(?:\\n|$)", "");
B.html = new RegExp("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:<\\/\\1>[^\\n]*\\n*|$)|<!--(?:-?>|[\\s\\S]*?(?:-->|$))[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n*|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n*|$)|<\\/?(address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \\t]+|\\n|\\/?>|$)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<(?!(?:script|pre|style|textarea)(?![a-z0-9-]))([a-z][a-z0-9-]*)(?: +[a-zA-Z:_][\\w.:-]*(?: *= *\"[^\"\\n]*\"| *= *'[^'\\n]*'| *= *[^\\s\"'=<>`]+)?)*? *\\/?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)|<\\/[a-z][a-z0-9-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$))", "i");
B.def = new RegExp("^ {0,3}\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]: *(?:\\n[ \\t]*)?([^<\\s][^\\s]*|<.*?>)(?:(?: +(?:\\n[ \\t]*)?| *\\n[ \\t]*)((?:\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\\\n]|\\n(?!\\n))*'|\\((?:\\\\[\\s\\S]|[^()\\\\])*\\))))? *(?:\\n+|$)", "");
B.table = new RegExp("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)", "");
B.lheading = new RegExp("^(?! {0,3}(?:[*+-]|\\d{1,9}[.)]) |(?: {4}| {0,3}\\t)| {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n)((?:.|\\n(?!\\s*?\\n| {0,3}(?:[*+-]|\\d{1,9}[.)]) | {0,3}(?:`{3,}|~{3,})| {0,3}>| {0,3}#{1,6}(?:\\s|$)| {0,3}(?:(?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}<[^\\n>]+>\\n| {0,3}\\|?(?:[:\\- ]*\\|)+[\\:\\- ]*\\n))+?)\\n {0,3}(=+|-+)[ \\t]*(?:\\n+|$)", "");
B.paragraph = new RegExp("^([^\\n]+(?:\\n(?! {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)| *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n| {0,3}((?:-[\\t ]*){3,}|(?:_[ \\t]*){3,}|(?:\\*[ \\t]*){3,})(?:\\n+|$)| {0,3}#{1,6}(?:\\s|$)| {0,3}>|(?: {4}| {0,3}\t)[^\\n]| {0,3}(?:`{3,}(?=[^`\\n]*(?:\\n|$))|~~~)[^\\n]*(?:\\n|$)| {0,3}(?:[*+-]|1[.)])[ \\t]| {0,3}(?:<\\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?: +|\\n|\\/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)).*(?:\\n|$))*)\\n*|$)|[ \\t]+\\n)[^\\n]+)*)", "");
B.text = new RegExp("^[^\\n]+", "");
I.escape = new RegExp("^\\\\([!\"#$%&'()*+,\\-./:;<=>?@\\[\\]\\\\^_`{|}~])", "");
I.tag = new RegExp("^<!--(?:-?>|[\\s\\S]*?-->)|^<\\/[a-zA-Z][a-zA-Z0-9-]*\\s*>|^<[a-zA-Z][a-zA-Z0-9-]*(?:\\s+[a-zA-Z:_][\\w.:-]*(?:\\s*=\\s*\"[^\"]*\"|\\s*=\\s*'[^']*'|\\s*=\\s*[^\\s\"'=<>`]+)?)*?\\s*\\/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>", "");
I.link = new RegExp("^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\([ \\t\\n]*(<(?:\\\\.|[^\\n<>\\\\])+>|[^ \\t\\n\\x00-\\x1f]+|(?=\\)))(?:(?:[ \\t]+(?:\\n[ \\t]*)?|\\n[ \\t]*)(\"(?:\\\\[\\s\\S]|[^\"\\\\])*\"|'(?:\\\\[\\s\\S]|[^'\\\\])*'|\\((?:\\\\[\\s\\S]|[^)\\\\])*\\)))?[ \\t\\n]*\\)", "");
I.reflink = new RegExp("^!?\\[((?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\])|[^\\[\\]\\\\`])*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\]", "");
I.nolink = new RegExp("^!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\\\n]|\\n(?![ \\t]*\\n))+)\\](?:\\[\\])?", "");
I.emStrongLDelim = new RegExp("^(?:\\*+(?:((?!\\*)(?!~)[\\p{P}\\p{S}])|([^\\s*]))?)|^_+(?:((?!_)(?!~)[\\p{P}\\p{S}])|([^\\s_]))?", "u");
I.emStrongRDelimAst = new RegExp("^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?=[\\s]|$)|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?!\\*)(?=(?!~)[\\s\\p{P}\\p{S}]|$)|(?!\\*)(?!~)[\\s\\p{P}\\p{S}](\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))|[\\s](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?!\\*)(?!~)[\\p{P}\\p{S}](\\*+)(?!\\*)(?=(?!~)[\\p{P}\\p{S}])|(?:[^\\s\\p{P}\\p{S}]|~)(\\*+)(?=(?:[^\\s\\p{P}\\p{S}]|~))", "gu");
I.emStrongRDelimUnd = new RegExp("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)[\\p{P}\\p{S}](_+)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](_+)(?!_)(?=[\\s\\p{P}\\p{S}]|$)|(?!_)[\\s\\p{P}\\p{S}](_+)(?=[^\\s\\p{P}\\p{S}])|[\\s](_+)(?!_)(?=[\\p{P}\\p{S}])|(?!_)[\\p{P}\\p{S}](_+)(?!_)(?=[\\p{P}\\p{S}])", "gu");
I.code = new RegExp("^(`+)([^`]|[^`][\\s\\S]*?[^`])\\1(?!`)", "");
I.br = new RegExp("^( {2,}|\\\\)\\n(?!\\s*$)[ \\t]*", "");
I.delLDelim = new RegExp("^~~?(?:((?!~)[\\p{P}\\p{S}])|[^\\s~])", "u");
I.delRDelim = new RegExp("^[^~]+(?=[^~])|(?!~)[\\p{P}\\p{S}](~~?)(?=[\\s]|$)|[^\\s\\p{P}\\p{S}](~~?)(?!~)(?=[\\s\\p{P}\\p{S}]|$)|(?!~)[\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])|[\\s](~~?)(?!~)(?=[\\p{P}\\p{S}])|(?!~)[\\p{P}\\p{S}](~~?)(?!~)(?=[\\p{P}\\p{S}])|[^\\s\\p{P}\\p{S}](~~?)(?=[^\\s\\p{P}\\p{S}])", "gu");
I.autolink = new RegExp("^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\\s\\x00-\\x1f<>]*|[a-zA-Z0-9.!#$%&'*+/=?_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_]))>", "");
I.url = new RegExp("^(?:mailto:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])|xmpp:[A-Za-z0-9._+-]+@[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])(?:\\/[A-Za-z0-9@.]+)?)|^((?:[hH][tT][tT][pP][sS]?|[fF][tT][pP]):\\/\\/|www\\.)(?:[a-zA-Z0-9\\-]+\\.?)+[^\\s<]*|^[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![\\w-])", "");
I.text = new RegExp("^(?:[^a-zA-Z0-9](?=(?:mailto|xmpp):)|(`+|~+|[^`~])(?:(?=[`~])|(?= {2,}\\n)|(?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@)|[\\s\\S]*?(?:(?=[\\\\<!\\[`*~_]|\\b_|[hH][tT][tT][pP][sS]?|[fF][tT][pP]:\\/\\/|(?<![^\\s*_~(])www\\.|$)|[^ ](?= {2,}\\n)|[^a-zA-Z0-9](?=(?:mailto|xmpp):)|[^a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-](?=[a-zA-Z0-9.!#$%&'*+\\/=?_`{\\|}~-]+@))))", "");
I.punctuation = new RegExp("^((?![*_])[\\s\\p{P}\\p{S}])", "u");
I.anyPunctuation = new RegExp("\\\\([\\p{P}\\p{S}])", "gu");
I.anyPunctuationOutsideCode = new RegExp("(`+)(?:[^`]|[^`][\\s\\S]*?[^`])\\1(?!`)|`+|\\\\([\\p{P}\\p{S}])", "gu");
I.blockSkip = new RegExp("\\[(?:[^\\[\\]`]|(?<a>`+)[^`]+\\k<a>(?!`))*?\\]\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)]|\\((?:\\\\[\\s\\S]|[^\\\\\\(\\)])*\\))*\\)|(?<!`)()(?<b>`+)[^`]+\\k<b>(?!`)|<(?! )[^<>]*?>", "g");
I.reflinkSearch = new RegExp("!?\\[((?:[^\\[\\]\\\\`]*(?:\\[(?:\\[(?:\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|[^\\[\\]\\\\])*\\]|\\\\[\\s\\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\\]))){0,999}?[^\\[\\]\\\\`]*?)\\]\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\]|!?\\[((?!\\s*\\])(?:\\\\[\\s\\S]|[^\\[\\]\\\\]){1,999})\\](?:\\[\\])?(?!\\()", "g");
I.backpedal = new RegExp("(?:[^?!.,:;*_'\"~()&]+|\\([^)]*\\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'\"~)]+(?!$))+", "");
I.del = new RegExp("^(~~?)(?=[^\\s~])((?:\\\\[\\s\\S]|[^\\\\])*?(?:\\\\[\\s\\S]|[^\\s~\\\\]))\\1(?=[^~]|$)", "");
O.codeRemoveIndent = new RegExp("^(?: {0,3}\\t| {1,4})", "gm");
O.outputLinkReplace = new RegExp("\\\\([\\[\\]])", "g");
O.indentCodeCompensation = new RegExp("^(\\s+)(?:```)", "");
O.beginningSpace = new RegExp("^\\s+", "");
O.endingHash = new RegExp("#$", "");
O.startingSpaceChar = new RegExp("^ ", "");
O.endingSpaceChar = new RegExp(" $", "");
O.endingSpaceTabChar = new RegExp("[ \\t]$", "");
O.nonSpaceChar = new RegExp("[^ ]", "");
O.newLineCharGlobal = new RegExp("\\n", "g");
O.tabCharGlobal = new RegExp("\\t", "g");
O.leadingSpaceTab = new RegExp("^[ \\t]+", "");
O.multipleSpaceGlobal = new RegExp("\\s+", "g");
O.blankLine = new RegExp("^[ \\t]*$", "");
O.doubleBlankLine = new RegExp("\\n[ \\t]*\\n[ \\t]*$", "");
O.blockquoteStart = new RegExp("^ {0,3}>", "");
O.blockquoteSetextReplace = new RegExp("\\n {0,3}((?:=+|-+)[ \\t]*)(?=\\n|$)", "g");
O.blockquoteSetextReplace2 = new RegExp("^ {0,3}>[ \\t]?", "gm");
O.blockquoteMarkerWhitespace = new RegExp("^( {0,3}>)([ \\t]+)", "gm");
O.listReplaceNesting = new RegExp("^ {1,4}(?=( {4})*[^ ])", "g");
O.listIsTask = new RegExp("^\\[[ xX]\\][ \\t]+\\S", "");
O.listReplaceTask = new RegExp("^\\[[ xX]\\][ \\t]+", "");
O.listTaskCheckbox = new RegExp("\\[[ xX]\\]", "");
O.anyLine = new RegExp("\\n.*\\n", "");
O.hrefBrackets = new RegExp("^<(.*)>$", "");
O.tableDelimiter = new RegExp("[:|]", "");
O.tableAlignChars = new RegExp("^\\||\\| *$", "g");
O.tableRowBlankLine = new RegExp("\\n[ \\t]*$", "");
O.tableAlignRight = new RegExp("^ *-+: *$", "");
O.tableAlignCenter = new RegExp("^ *:-+: *$", "");
O.tableAlignLeft = new RegExp("^ *:-+ *$", "");
O.startATag = new RegExp("^<a ", "i");
O.endATag = new RegExp("^<\\/a>", "i");
O.startPreScriptTag = new RegExp("^<(pre|code|kbd|script)(\\s|>)", "i");
O.endPreScriptTag = new RegExp("^<\\/(pre|code|kbd|script)(\\s|>)", "i");
O.startAngleBracket = new RegExp("^<", "");
O.endAngleBracket = new RegExp(">$", "");
O.unicodeAlphaNumeric = new RegExp("[\\p{L}\\p{N}]", "u");
O.numericCharacterReference = new RegExp("&#(?:(\\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));", "");
O.numericCharacterReferenceOrAmpersand = new RegExp("&#(?:(\\d{1,7})|[Xx]([A-Fa-f0-9]{1,6}));|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)", "g");
O.escapeTest = new RegExp("[&<>\"']", "");
O.escapeReplace = new RegExp("[&<>\"']", "g");
O.escapeTestNoEncode = new RegExp("[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)", "");
O.escapeReplaceNoEncode = new RegExp("[<>\"']|&(?!(#\\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\\w+);)", "g");
O.caret = new RegExp("(^|[^\\[])\\^", "g");
O.percentDecode = new RegExp("%25", "g");
O.findPipe = new RegExp("\\|", "g");
O.splitPipe = new RegExp(" \\|", "");
O.slashPipe = new RegExp("\\\\\\|", "g");
O.carriageReturn = new RegExp("\\r\\n|\\r", "g");
O.spaceLine = new RegExp("^ +$", "gm");
O.notSpaceStart = new RegExp("^\\S*", "");
O.endingNewline = new RegExp("\\n$", "");

const HTML_TAGS = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeOne = (c) => ESCAPE_MAP[c];

function escapeHtml(s, encode) {
  if (encode) {
    if (O.escapeTest.test(s)) return s.replace(O.escapeReplace, escapeOne);
  } else if (O.escapeTestNoEncode.test(s)) {
    return s.replace(O.escapeReplaceNoEncode, escapeOne);
  }
  return s;
}

function decodeEntities(s) {
  if (!O.numericCharacterReference.test(s)) return s;
  return s.replace(O.numericCharacterReferenceOrAmpersand, (whole, dec, hex) => {
    if (dec === undefined && hex === undefined) return '&amp;';
    const n = dec === undefined ? Number.parseInt(hex, 16) : Number.parseInt(dec, 10);
    if (n === 0 || n > 1114111 || (n >= 55296 && n <= 57343)) return '\uFFFD';
    if (n === 38) return '&amp;';
    return String.fromCodePoint(n);
  });
}

function encodeHref(href) {
  try {
    return encodeURI(href).replace(O.percentDecode, '%');
  } catch {
    return null;
  }
}

// Trim `c` characters off the end of `s`; with `not`, trim characters that are not `c`.
function trimEndChar(s, c, not) {
  let n = s.length;
  if (n === 0) return '';
  let i = 0;
  while (i < n) {
    const ch = s.charAt(n - i - 1);
    if (ch === c && !not) i++;
    else if (ch !== c && not) i++;
    else break;
  }
  return s.slice(0, n - i);
}

// Drop trailing blank lines when the string holds more than one trailing blank line.
function trimBlankTail(s) {
  const parts = s.split('\n');
  let t = parts.length - 1;
  while (t >= 0 && O.blankLine.test(parts[t])) t--;
  return parts.length - t <= 2 ? s : parts.slice(0, t + 1).join('\n');
}

// Link label normalization.
function normLabel(s) {
  return s.trim().replace(O.multipleSpaceGlobal, ' ').toLowerCase().toUpperCase().toLowerCase();
}

// Index of the bracket that closes the one at the start of `open`/`close` group, or -1/-2.
function bracketDepth(s, pair) {
  if (s.indexOf(pair[0]) === -1 && s.indexOf(pair[1]) === -1) return -1;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\') i++;
    else if (s[i] === pair[0]) depth++;
    else if (s[i] === pair[1] && (depth--, depth < 0)) return i;
  }
  return depth > 0 ? -2 : -1;
}

// Expand tabs to stop columns of four.
function expandTabs(s, start) {
  let col = start || 0;
  let out = '';
  for (const ch of s) {
    if (ch === '\t') {
      const w = 4 - (col % 4);
      out += ' '.repeat(w);
      col += w;
    } else {
      out += ch;
      col++;
    }
  }
  return out;
}

// Split one table row into cells, honouring escaped pipes.
function splitRow(line, count) {
  const escaped = line.replace(O.findPipe, (m, idx, str) => {
    let odd = false;
    let p = idx;
    while (--p >= 0 && str[p] === '\\') odd = !odd;
    return odd ? '|' : ' |';
  });
  const cells = escaped.split(O.splitPipe);
  if (cells[0].trim() || cells.shift(), cells.length > 0 && !cells[cells.length - 1].trim()) cells.pop();
  if (count) {
    if (cells.length > count) cells.splice(count);
    else for (; cells.length < count; ) cells.push('');
  }
  for (let i = 0; i < cells.length; i++) cells[i] = cells[i].trim().replace(O.slashPipe, '|');
  return cells;
}

// Fence content indentation compensation relative to the opening fence's indent.
function compensateIndent(raw, text) {
  const m = raw.match(O.indentCodeCompensation);
  if (m === null) return text;
  const indent = m[1];
  return text
    .split('\n')
    .map((line) => {
      const lead = line.match(O.beginningSpace);
      if (lead === null) return line;
      const n = lead[0].length;
      return line.slice(Math.min(n, indent.length));
    })
    .join('\n');
}

// Does the link text hold a link-like construct that stops it being a link (marked's guard)?
function linkTextBlocked(src, text, offset, rules) {
  if (!text.includes('<')) {
    // fast path still must consider code spans and nested links? marked only checks '<'
    return false;
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\') {
      i++;
      continue;
    }
    if (text[i] === '`') {
      const code = I.code.exec(text.slice(i));
      if (code) {
        i += code[0].length - 1;
        continue;
      }
    }
    if (text[i] !== '<') continue;
    const rest = src.slice(offset + i);
    const tag = I.tag.exec(rest) || I.autolink.exec(rest);
    if (tag) {
      if (tag[0].length > text.length - i) return true;
      i += tag[0].length - 1;
    }
  }
  return false;
}

// ---------------------------------------------------------------- delimiters

// Code-point length of the first character of `s`.
function firstCpLen(s) {
  return s.charCodeAt(0) >= 0xd800 && s.charCodeAt(0) <= 0xdbff ? 2 : 1;
}

// Code-point length of a short ASCII-ish string.
function cpLen(s) {
  let n = 0;
  for (let i = 0; i < s.length; ) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) i += 2;
    else i += 1;
    n++;
  }
  return n;
}

// Positions of the last possible emphasis/strong and strikethrough closers in a masked source.
function maskInfo(masked) {
  let lastAst = -1, lastUnd = -1, lastDel = -1;
  const n = masked.length;
  for (let i = 0; i < n; i++) {
    const c = masked.charCodeAt(i);
    if (c !== 42 && c !== 95 && c !== 126) continue;
    const prev = i === 0 ? '\n' : masked[i - 1];
    let j = i + 1;
    while (j < n && masked.charCodeAt(j) === c) j++;
    if (prev !== ' ' && prev !== '\t' && prev !== '\n' && prev !== '\r' && prev !== '\f') {
      if (c === 126) lastDel = i;
      else if (c === 42) lastAst = i;
      else lastUnd = i;
    }
    i = j - 1;
  }
  return { masked, lastAst, lastUnd, lastDel };
}

// ---------------------------------------------------------------- lexer

class Lexer {
  constructor() {
    this.tokens = [];
    this.tokens.links = Object.create(null);
    this.inlineQueue = [];
    this.maskStack = [];
    this.state = { inLink: false, inRawBlock: false, linkEmitted: false, linkParenPossible: true, top: true };
  }

  lex(src) {
    src = src.replace(O.carriageReturn, '\n');
    this.blockTokens(src, this.tokens);
    const q = this.inlineQueue;
    for (let i = 0; i < q.length; i++) {
      this.state.inRawBlock = false;
      this.inlineTokens(q[i].src, q[i].tokens);
    }
    this.inlineQueue = [];
    return this.tokens;
  }

  // ---- block level

  blockTokens(src, out, inList) {
    let prevLen = Infinity;
    while (src) {
      if (src.length < prevLen) prevLen = src.length;
      else throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));

      let tok = this.tokenSpace(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        const last = out[out.length - 1];
        if (tok.raw.length === 1 && last !== undefined) last.raw += '\n';
        else out.push(tok);
        continue;
      }

      tok = this.tokenCode(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        const last = out[out.length - 1];
        if (last !== undefined && (last.type === 'paragraph' || last.type === 'text')) {
          last.raw += (last.raw.endsWith('\n') ? '' : '\n') + tok.raw;
          last.text += '\n' + tok.text;
          this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
        } else out.push(tok);
        continue;
      }

      tok = this.tokenFences(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }

      tok = this.tokenHeading(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }

      tok = this.tokenHr(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }

      if (src.charCodeAt(0) === 62 || (src.charCodeAt(0) === 32 && this.bqStart(src))) {
        tok = this.tokenBlockquote(src);
        if (tok) {
          src = src.substring(tok.raw.length);
          out.push(tok);
          continue;
        }
      }

      if (this.listStart(src)) {
        tok = this.tokenList(src);
        if (tok) {
          src = src.substring(tok.raw.length);
          out.push(tok);
          continue;
        }
      }

      if (this.htmlStart(src)) {
        tok = this.tokenHtml(src);
        if (tok) {
          src = src.substring(tok.raw.length);
          out.push(tok);
          continue;
        }
      }

      if (this.defStart(src)) {
        tok = this.tokenDef(src);
        if (tok) {
          src = src.substring(tok.raw.length);
          const last = out[out.length - 1];
          if (last !== undefined && (last.type === 'paragraph' || last.type === 'text')) {
            last.raw += (last.raw.endsWith('\n') ? '' : '\n') + tok.raw;
            last.text += '\n' + tok.raw;
            this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
          } else {
            if (!this.tokens.links[tok.tag]) this.tokens.links[tok.tag] = { href: tok.href, title: tok.title };
            out.push(tok);
          }
          continue;
        }
      }

      if (this.tablePossible(src)) {
        tok = this.tokenTable(src);
        if (tok) {
          src = src.substring(tok.raw.length);
          out.push(tok);
          continue;
        }
      }

      if (this.lheadingPossible(src)) {
        tok = this.tokenLheading(src);
        if (tok) {
          src = src.substring(tok.raw.length);
          out.push(tok);
          continue;
        }
      }

      if (this.state.top) {
        tok = this.tokenParagraph(src);
        if (tok) {
          const last = out[out.length - 1];
          if (inList && last !== undefined && last.type === 'paragraph') {
            last.raw += (last.raw.endsWith('\n') ? '' : '\n') + tok.raw;
            last.text += '\n' + tok.text;
            this.inlineQueue.pop();
            this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
          } else out.push(tok);
          inList = tok.raw.length !== src.length;
          src = src.substring(tok.raw.length);
          continue;
        }
      }

      tok = this.tokenText(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        const last = out[out.length - 1];
        if (last !== undefined && last.type === 'text') {
          last.raw += (last.raw.endsWith('\n') ? '' : '\n') + tok.raw;
          last.text += '\n' + tok.text;
          this.inlineQueue.pop();
          this.inlineQueue[this.inlineQueue.length - 1].src = last.text;
        } else out.push(tok);
        continue;
      }

      if (src) throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
      break;
    }
    this.state.top = true;
    return out;
  }

  // Cheap checks that a block tokenizer has a chance before running its regex.
  bqStart(s) {
    let i = 0;
    while (i < 3 && s.charCodeAt(i) === 32) i++;
    return s.charCodeAt(i) === 62;
  }

  listStart(s) {
    let i = 0;
    while (i < 3 && s.charCodeAt(i) === 32) i++;
    const c = s.charCodeAt(i);
    if (c === 42 || c === 43 || c === 45) {
      const d = s.charCodeAt(i + 1);
      return d === 32 || d === 9 || d === 10 || i + 1 === s.length;
    }
    if (c >= 48 && c <= 57) {
      let j = i;
      while (j < i + 9 && s.charCodeAt(j) >= 48 && s.charCodeAt(j) <= 57) j++;
      const d = s.charCodeAt(j);
      if (d === 46 || d === 41) {
        const e = s.charCodeAt(j + 1);
        return e === 32 || e === 9 || e === 10 || j + 1 === s.length;
      }
    }
    return false;
  }

  htmlStart(s) {
    let i = 0;
    while (i < 3 && s.charCodeAt(i) === 32) i++;
    return s.charCodeAt(i) === 60;
  }

  defStart(s) {
    let i = 0;
    while (i < 3 && s.charCodeAt(i) === 32) i++;
    return s.charCodeAt(i) === 91;
  }

  tablePossible(s) {
    const nl = s.indexOf('\n');
    if (nl < 0) return false;
    const line2 = s.indexOf('\n', nl + 1);
    const dash = s.slice(nl + 1, line2 < 0 ? s.length : line2);
    return dash.indexOf('|') !== -1 || dash.indexOf(':') !== -1;
  }

  lheadingPossible(s) {
    return LINE_UNDERLINE.test(s);
  }

  tokenSpace(src) {
    if (src.charCodeAt(0) !== 32 && src.charCodeAt(0) !== 9 && src.charCodeAt(0) !== 10) return;
    const m = B.newline.exec(src);
    if (m && m[0].length > 0) return { type: 'space', raw: m[0] };
  }

  tokenCode(src) {
    const c = src.charCodeAt(0);
    if (!(c === 32 || c === 9)) return;
    const m = B.code.exec(src);
    if (m) {
      const raw = trimBlankTail(m[0]);
      return { type: 'code', raw, codeBlockStyle: 'indented', text: raw.replace(O.codeRemoveIndent, '') };
    }
  }

  tokenFences(src) {
    const c = src.charCodeAt(0);
    if (!(c === 96 || c === 126 || c === 32)) return;
    if (c === 32 && !(src.charCodeAt(1) === 96 || src.charCodeAt(1) === 126 || src.charCodeAt(1) === 32)) return;
    const m = B.fences.exec(src);
    if (m) {
      const raw = m[0];
      const text = compensateIndent(raw, m[3] || '');
      return { type: 'code', raw, lang: m[2] ? m[2].trim().replace(I.anyPunctuation, '$1') : m[2], text };
    }
  }

  tokenHeading(src) {
    const c = src.charCodeAt(0);
    if (!(c === 35 || c === 32)) return;
    if (c === 32 && !(src.charCodeAt(1) === 35 || src.charCodeAt(1) === 32 || src.charCodeAt(1) === 9)) return;
    const m = B.heading.exec(src);
    if (m) {
      let text = m[2].trim();
      if (O.endingHash.test(text)) {
        const t = trimEndChar(text, '#', false);
        if (!t || O.endingSpaceTabChar.test(t)) text = t.trim();
      }
      return { type: 'heading', raw: trimEndChar(m[0], '\n', false), depth: m[1].length, text, tokens: this.inline(text) };
    }
  }

  tokenHr(src) {
    const c = src.charCodeAt(0);
    if (!(c === 45 || c === 95 || c === 42 || c === 32 || c === 9)) return;
    if (c === 32 && !(src.charCodeAt(1) === 45 || src.charCodeAt(1) === 95 || src.charCodeAt(1) === 42 || src.charCodeAt(1) === 32)) return;
    const m = B.hr.exec(src);
    if (m) return { type: 'hr', raw: trimEndChar(m[0], '\n', false) };
  }

  tokenBlockquote(src) {
    const m = B.blockquote.exec(src);
    if (!m) return;
    let lines = trimEndChar(m[0], '\n', false).split('\n');
    let raw = '', text = '';
    const tokens = [];
    while (lines.length > 0) {
      let sawMarker = false;
      const group = [];
      let p;
      for (p = 0; p < lines.length; p++) {
        if (O.blockquoteStart.test(lines[p])) {
          group.push(lines[p]);
          sawMarker = true;
        } else if (!sawMarker) group.push(lines[p]);
        else break;
      }
      lines = lines.slice(p);
      const head = group.join('\n');
      const stripped = head
        .replace(O.blockquoteMarkerWhitespace, (all, marker, ws) => marker + expandTabs(ws, marker.length))
        .replace(O.blockquoteSetextReplace, '\n    $1')
        .replace(O.blockquoteSetextReplace2, '');
      raw = raw ? raw + '\n' + head : head;
      text = text ? text + '\n' + stripped : stripped;
      const top = this.state.top;
      this.state.top = true;
      this.blockTokens(stripped, tokens, true);
      this.state.top = top;
      if (lines.length === 0) break;
      const last = tokens[tokens.length - 1];
      const type = last && last.type;
      if (type === 'code' || type === 'heading' || type === 'hr' || type === 'html' || type === 'table') break;
      if (type === 'blockquote') {
        const inner = last;
        const rest = lines.join('\n');
        const combined = inner.raw + '\n' + rest.replace(O.blockquoteSetextReplace2, '');
        const again = this.tokenBlockquote(combined);
        tokens[tokens.length - 1] = again;
        const after = combined.substring(again.raw.length).replace(/^\n/, '');
        const used = after ? after.split('\n').length : 0;
        const keep = used ? lines.slice(0, -used) : lines;
        if (keep.length > 0) raw = raw + '\n' + keep.join('\n');
        text = text.substring(0, text.length - inner.text.length) + again.text;
        lines = lines.slice(keep.length);
        if (lines.length > 0 && O.blockquoteStart.test(lines[0])) continue;
        break;
      } else if (type === 'list') {
        const inner = last;
        const rest = lines.join('\n');
        const combined = inner.raw + '\n' + rest;
        const again = this.tokenList(combined);
        tokens[tokens.length - 1] = again;
        const used = again.raw.length > inner.raw.length ? combined.slice(inner.raw.length + 1, again.raw.length).split('\n').length : 0;
        if (used > 0) {
          const keep = lines.slice(0, used).join('\n');
          raw = raw + '\n' + keep;
          text = text + '\n' + keep;
        }
        lines = lines.slice(used);
        continue;
      }
    }
    return { type: 'blockquote', raw, tokens, text };
  }

  tokenList(src) {
    let m = B.list.exec(src);
    if (!m) return;
    const start = src;
    const offset = () => start.length - src.length;
    let marker = m[1].trim();
    const ordered = marker.length > 1;
    const list = {
      type: 'list',
      raw: '',
      ordered,
      start: ordered ? +marker.slice(0, -1) : '',
      loose: false,
      items: [],
    };
    marker = ordered ? `\\d{1,9}\\${marker.slice(-1)}` : `\\${marker}`;
    const itemRe = new RegExp(`^( {0,3}${marker})((?:[\t ][^\\n]*)?(?:\\n|$))`);
    let loosePending = false;

    while (src) {
      let ended = false;
      let text = '';
      if (!(m = itemRe.exec(src)) || B.hr.test(src)) break;
      const itemStart = offset();
      src = src.substring(m[0].length);
      const firstLine = m[2].split('\n', 1)[0];
      const markerLen = m[1].length;
      let line = firstLine.replace(O.leadingSpaceTab, (ws) => expandTabs(ws, markerLen));
      const nextLine = src.split('\n', 1)[0];
      let blank = !line.trim();
      let indent;
      if (blank) indent = markerLen + 1;
      else {
        indent = line.search(O.nonSpaceChar);
        if (indent > 4) indent = 1;
        text = line.slice(indent);
        indent += markerLen;
      }
      if (blank && O.blankLine.test(nextLine)) {
        src = src.substring(nextLine.length + 1);
        ended = true;
      }

      if (!ended) {
        // Block starters to stop an item's continuation. marked clamps the allowance to indent-1.
        const allow = Math.max(0, Math.min(3, indent - 1));
        let bulletRe = LIST_PREFIX_CACHE.get(allow);
        let hrRe, fenceRe, headingRe, htmlRe, bqRe;
        if (bulletRe === undefined) {
          bulletRe = new RegExp(`^ {0,${allow}}(?:[*+-]|\\d{1,9}[.)])((?:[\t ][^\\n]*)?(?:\\n|$))`);
          LIST_PREFIX_CACHE.set(allow, bulletRe);
        }
        if (!PREFIX_CACHE.has(allow)) {
          PREFIX_CACHE.set(allow, {
            hr: new RegExp(`^ {0,${allow}}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\\*[ \t]*){3,})(?:\\n+|$)`),
            fence: new RegExp(`^ {0,${allow}}(?:\`\`\`|~~~)`),
            heading: new RegExp(`^ {0,${allow}}#{1,6}(?:\\s|$)`),
            html: new RegExp(
              `^ {0,${allow}}(?:</?(?:${HTML_TAGS})(?: +|$|/?>)|<(?:(?:script|pre|style|textarea)(?:[\\s>]|$)|!--)|<\\?|<![A-Za-z]|<!\\[CDATA\\[)`,
              'i',
            ),
            bq: new RegExp(`^ {0,${allow}}>`),
          });
        }
        const cache = PREFIX_CACHE.get(allow);
        hrRe = cache.hr;
        fenceRe = cache.fence;
        headingRe = cache.heading;
        htmlRe = cache.html;
        bqRe = cache.bq;

        while (src) {
          const nl = src.indexOf('\n');
          const cur = nl < 0 ? src : src.slice(0, nl);
          const expanded = cur.replace(O.leadingSpaceTab, (ws) => expandTabs(ws));
          if (
            this.startsMarker(cur) &&
            (fenceRe.test(cur) || headingRe.test(cur) || htmlRe.test(cur) || bqRe.test(cur) || bulletRe.test(cur) || hrRe.test(cur))
          )
            break;
          if (expanded.search(O.nonSpaceChar) >= indent || !cur.trim()) {
            text += '\n' + expanded.slice(indent);
          } else {
            if (
              blank ||
              line.replace(O.tabCharGlobal, '    ').search(O.nonSpaceChar) >= 4 ||
              fenceRe.test(line) ||
              headingRe.test(line) ||
              htmlRe.test(line) ||
              hrRe.test(line)
            )
              break;
            const setext = /^ {0,3}(?:=+|-+) *$/.test(cur) && B.lheading.test(line + '\n' + cur);
            const add = setext ? '    ' + expanded.replace(/^ {0,3}/, '') : cur;
            text += '\n' + add;
          }
          blank = !cur.trim();
          src = src.substring(cur.length + 1);
          line = expanded.slice(indent);
        }
      }

      const rawItem = start.slice(itemStart, offset());
      if (!list.loose) {
        if (loosePending) list.loose = true;
        else if (O.doubleBlankLine.test(rawItem)) loosePending = true;
      }
      list.items.push({
        type: 'list_item',
        raw: rawItem,
        task: O.listIsTask.test(text),
        loose: false,
        text,
        tokens: [],
      });
    }

    const lastItem = list.items[list.items.length - 1];
    if (!lastItem) return;
    lastItem.raw = lastItem.raw.trimEnd();
    lastItem.text = lastItem.text.trimEnd();
    list.raw = start.slice(0, offset()).trimEnd();

    for (const item of list.items) {
      this.state.top = false;
      item.tokens = this.blockTokens(item.text, []);
      if (!list.loose) {
        let hasSpace = false, loose = false;
        for (const t of item.tokens) {
          if (t.type === 'space') {
            hasSpace = true;
            if (O.anyLine.test(t.raw)) loose = true;
          }
        }
        list.loose = hasSpace && loose;
      }
    }

    for (const item of list.items) {
      const first = item.tokens[0];
      if (item.task && first && (first.type === 'text' || first.type === 'paragraph')) {
        item.text = item.text.replace(O.listReplaceTask, '');
        first.raw = first.raw.replace(O.listReplaceTask, '');
        first.text = first.text.replace(O.listReplaceTask, '');
        const q = this.inlineQueue;
        for (let i = q.length - 1; i >= 0; i--) {
          if (O.listIsTask.test(q[i].src)) {
            q[i].src = q[i].src.replace(O.listReplaceTask, '');
            break;
          }
        }
        const check = O.listTaskCheckbox.exec(item.raw);
        if (check) {
          const box = { type: 'checkbox', raw: check[0] + ' ', checked: check[0] !== '[ ]' };
          item.checked = box.checked;
          if (list.loose) {
            const head = item.tokens[0];
            if (
              head &&
              (head.type === 'paragraph' || head.type === 'text') &&
              head.tokens
            ) {
              head.raw = box.raw + head.raw;
              head.text = box.raw + head.text;
              head.tokens.unshift(box);
            } else {
              item.tokens.unshift({ type: 'paragraph', raw: box.raw, text: box.raw, tokens: [box] });
            }
          } else item.tokens.unshift(box);
        }
      } else if (item.task) item.task = false;
    }

    if (list.loose) {
      for (const item of list.items) {
        item.loose = true;
        for (const t of item.tokens) if (t.type === 'text') t.type = 'paragraph';
      }
    }
    return list;
  }

  // Does a line begin with something that may start a block (cheap pre-check)?
  startsMarker(s) {
    let i = 0;
    while (i < 4 && s.charCodeAt(i) === 32) i++;
    const c = s.charCodeAt(i);
    return (
      c === 35 || c === 96 || c === 126 || c === 60 || c === 62 || c === 42 || c === 45 || c === 95 || c === 43 || (c >= 48 && c <= 57)
    );
  }

  tokenHtml(src) {
    const m = B.html.exec(src);
    if (m) {
      const text = trimBlankTail(m[0]);
      return { type: 'html', block: true, raw: text, pre: m[1] === 'pre' || m[1] === 'script' || m[1] === 'style', text };
    }
  }

  tokenDef(src) {
    const m = B.def.exec(src);
    if (m) {
      if (!O.startAngleBracket.test(m[2]) && bracketDepth(m[2], '()') !== -1) return;
      const tag = normLabel(m[1]);
      const href = m[2] ? m[2].replace(O.hrefBrackets, '$1').replace(I.anyPunctuation, '$1') : '';
      const title = m[3] ? m[3].substring(1, m[3].length - 1).replace(I.anyPunctuation, '$1') : m[3];
      return { type: 'def', tag, raw: trimEndChar(m[0], '\n', false), href, title };
    }
  }

  tokenTable(src) {
    const m = B.table.exec(src);
    if (!m || !O.tableDelimiter.test(m[2])) return;
    const header = splitRow(m[1]);
    const aligns = m[2].replace(O.tableAlignChars, '').split('|');
    const rows = m[3] && m[3].trim() ? m[3].replace(O.tableRowBlankLine, '').split('\n') : [];
    const table = { type: 'table', raw: trimEndChar(m[0], '\n', false), header: [], align: [], rows: [] };
    if (header.length !== aligns.length) return;
    for (const a of aligns) {
      if (O.tableAlignRight.test(a)) table.align.push('right');
      else if (O.tableAlignCenter.test(a)) table.align.push('center');
      else if (O.tableAlignLeft.test(a)) table.align.push('left');
      else table.align.push(null);
    }
    for (let i = 0; i < header.length; i++) {
      table.header.push({ text: header[i], tokens: this.inline(header[i]), header: true, align: table.align[i] });
    }
    for (const row of rows) {
      const cells = splitRow(row, table.header.length);
      table.rows.push(
        cells.map((cell, i) => ({ text: cell, tokens: this.inline(cell), header: false, align: table.align[i] })),
      );
    }
    return table;
  }

  tokenLheading(src) {
    const m = B.lheading.exec(src);
    if (m) {
      const text = m[1].trim();
      return {
        type: 'heading',
        raw: trimEndChar(m[0], '\n', false),
        depth: m[2].charAt(0) === '=' ? 1 : 2,
        text,
        tokens: this.inline(text),
      };
    }
  }

  tokenParagraph(src) {
    const m = B.paragraph.exec(src);
    if (m) {
      const text = m[1].charAt(m[1].length - 1) === '\n' ? m[1].slice(0, -1) : m[1];
      return { type: 'paragraph', raw: m[0], text, tokens: this.inline(text) };
    }
  }

  tokenText(src) {
    const m = B.text.exec(src);
    if (m) return { type: 'text', raw: m[0], text: m[0], tokens: this.inline(m[0]) };
  }

  inline(src, out) {
    out = out || [];
    this.inlineQueue.push({ src, tokens: out });
    return out;
  }
}

// ---------------------------------------------------------------- masking

// Replace constructs that must not influence delimiter matching with same-length filler.
function maskSource(src, links) {
  let t = src;
  if (src.indexOf('[') !== -1) {
    t = t.replace(I.reflinkSearch, (m) => {
      const open = m.lastIndexOf('[');
      if (!Object.hasOwn(links, normLabel(m.slice(open + 1, -1)))) return m;
      if (open > 1 && m.charAt(0) !== '!') {
        const inner = m.slice(1, open - 1);
        if (linkInText(inner, links)) {
          return '[' + inner.replace(I.reflinkSearch, maskRefReplacer(links)) + '][' + 'a'.repeat(m.length - open - 2) + ']';
        }
      }
      return '[' + 'a'.repeat(m.length - 2) + ']';
    });
  }
  t = t.replace(I.anyPunctuationOutsideCode, (m, ticks, punct) => {
    if (punct) return '+'.repeat(m.length);
    if (ticks) return ticks + m.slice(ticks.length, -ticks.length).replace(/`/g, '+') + ticks;
    return m;
  });
  t = t.replace(I.blockSkip, (m, empty, ticks) => {
    const o = ticks ? ticks.length : 0;
    return m.slice(0, o) + '[' + 'a'.repeat(m.length - o - 2) + ']';
  });
  return t;
}

function maskRefReplacer(links) {
  return (m) => {
    const open = m.lastIndexOf('[');
    if (!Object.hasOwn(links, normLabel(m.slice(open + 1, -1)))) return m;
    if (open > 1 && m.charAt(0) !== '!') {
      const inner = m.slice(1, open - 1);
      if (linkInText(inner, links)) {
        return '[' + inner.replace(I.reflinkSearch, maskRefReplacer(links)) + '][' + 'a'.repeat(m.length - open - 2) + ']';
      }
    }
    return '[' + 'a'.repeat(m.length - 2) + ']';
  };
}

// Does this text contain a link that would make a reference definition inside it invisible?
function linkInText(text, links) {
  if (text.indexOf('[') === -1) return false;
  for (const m of text.matchAll(I.blockSkip)) {
    if (I.link.test(m[0]) && text.charAt(m.index - 1) !== '!') return true;
  }
  for (const m of text.matchAll(I.reflinkSearch)) {
    const s = m[0];
    const open = s.lastIndexOf('[');
    const image = s.charAt(0) === '!';
    const defined = Object.hasOwn(links, normLabel(s.slice(open + 1, -1)));
    if (!image && defined) {
      if (!(open > 1 && linkInText(s.slice(1, open - 1), links))) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- inline lexer

Lexer.prototype.inlineTokens = function (src, out) {
  out = out || [];
  const prevPossible = this.state.linkParenPossible;
  this.state.linkParenPossible = prevPossible && src.includes(')');
  try {
    const needsMask = src.indexOf('*') !== -1 || src.indexOf('_') !== -1 || src.indexOf('~') !== -1;
    const masked = needsMask ? maskSource(src, this.tokens.links) : src;
    const info = maskInfo(masked);
    const stack = this.maskStack;
    stack.push(info);
    try {
      return this.inlineLoop(src, masked, out, info);
    } finally {
      stack.pop();
    }
  } finally {
    this.state.linkParenPossible = prevPossible;
  }
};

Lexer.prototype.inlineLoop = function (src, masked, out, info) {
  let lastText = false;
  let prevChar = '';
  let guard = Infinity;

  while (src) {
    if (src.length < guard) guard = src.length;
    else throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
    if (!lastText) prevChar = '';
    lastText = false;

    const c = src.charCodeAt(0);

    // escape
    if (c === 92) {
      const m = I.escape.exec(src);
      if (m) {
        src = src.substring(m[0].length);
        out.push({ type: 'escape', raw: m[0], text: m[1] });
        continue;
      }
    }

    // inline HTML tag
    if (c === 60) {
      const m = I.tag.exec(src);
      if (m) {
        const st = this.state;
        const raw = m[0];
        if (!st.inLink && O.startATag.test(raw)) st.inLink = true;
        else if (st.inLink && O.endATag.test(raw)) st.inLink = false;
        if (!st.inRawBlock && O.startPreScriptTag.test(raw)) st.inRawBlock = true;
        else if (st.inRawBlock && O.endPreScriptTag.test(raw)) st.inRawBlock = false;
        src = src.substring(raw.length);
        out.push({ type: 'html', raw, inLink: st.inLink, inRawBlock: st.inRawBlock, block: false, text: raw });
        continue;
      }
    }

    // inline link or image
    if ((c === 91 || c === 33) && this.state.linkParenPossible) {
      const tok = this.inlineLink(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }
    }

    // reference link
    if (c === 91 || c === 33) {
      const tok = this.inlineRefLink(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        const last = out[out.length - 1];
        if (tok.type === 'text' && last !== undefined && last.type === 'text') {
          last.raw += tok.raw;
          last.text += tok.text;
        } else out.push(tok);
        continue;
      }
    }

    // emphasis / strong
    if (c === 42 || c === 95) {
      const tok = this.inlineEmStrong(src, masked, prevChar, info);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }
    }

    // code span
    if (c === 96) {
      const m = I.code.exec(src);
      if (m) {
        let text = m[2].replace(O.newLineCharGlobal, ' ');
        if (O.nonSpaceChar.test(text) && O.startingSpaceChar.test(text) && O.endingSpaceChar.test(text)) {
          text = text.substring(1, text.length - 1);
        }
        src = src.substring(m[0].length);
        out.push({ type: 'codespan', raw: m[0], text });
        continue;
      }
    }

    // hard break
    if (c === 32 || c === 92) {
      const m = I.br.exec(src);
      if (m) {
        src = src.substring(m[0].length);
        out.push({ type: 'br', raw: m[0] });
        continue;
      }
    }

    // strikethrough
    if (c === 126) {
      const tok = this.inlineDel(src, masked, prevChar, info);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }
    }

    // angle-bracket autolink
    if (c === 60) {
      const m = I.autolink.exec(src);
      if (m) {
        const text = m[1];
        const href = m[2] === '@' ? 'mailto:' + text : text;
        src = src.substring(m[0].length);
        out.push({
          type: 'link',
          raw: m[0],
          text,
          href,
          autolink: true,
          tokens: [{ type: 'text', raw: text, text }],
        });
        continue;
      }
    }

    // extended autolink
    if (!this.state.inLink && (c === 104 || c === 72 || c === 102 || c === 70 || c === 119 || c === 109 || c === 120 || isEmailStart(c))) {
      const tok = this.inlineUrl(src);
      if (tok) {
        src = src.substring(tok.raw.length);
        out.push(tok);
        continue;
      }
    }

    // plain text
    const m = I.text.exec(src);
    if (m) {
      src = src.substring(m[0].length);
      const raw = m[0];
      const last = raw.slice(-1);
      if (last !== '_') prevChar = last;
      lastText = true;
      const inRaw = this.state.inRawBlock;
      const text = inRaw ? raw : decodeEntities(raw);
      const prev = out[out.length - 1];
      if (prev !== undefined && prev.type === 'text') {
        prev.raw += raw;
        prev.text += text;
      } else out.push({ type: 'text', raw, text, escaped: inRaw });
      continue;
    }

    if (src) throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
    break;
  }
  return out;
};

function isEmailStart(c) {
  return (
    (c >= 48 && c <= 57) ||
    (c >= 65 && c <= 90) ||
    (c >= 97 && c <= 122) ||
    c === 46 || c === 95 || c === 43 || c === 45
  );
}

// Build a link/image token from a match and a definition.
function makeLink(m, def, raw, lexer) {
  const href = def.href;
  const title = def.title || null;
  const text = m[1].replace(O.outputLinkReplace, '$1');
  const image = m[0].charAt(0) === '!';
  const st = lexer.state;
  const prevInLink = st.inLink;
  const prevEmitted = st.linkEmitted;
  const prevRaw = st.inRawBlock;
  st.inLink = true;
  st.linkEmitted = false;
  const tokens = lexer.inlineTokens(text);
  const emitted = st.linkEmitted;
  st.linkEmitted = prevEmitted;
  st.inLink = prevInLink;
  if (!image) {
    if (emitted) {
      st.inRawBlock = prevRaw;
      return;
    }
    st.linkEmitted = true;
  }
  return { type: image ? 'image' : 'link', raw, href, title, text, tokens };
}

Lexer.prototype.inlineLink = function (src) {
  const m = I.link.exec(src);
  if (!m) return;
  const offset = m[0].charAt(0) === '!' ? 2 : 1;
  if (linkTextBlocked(src, m[1], offset)) return;
  const dest = m[2].trim();
  if (O.startAngleBracket.test(dest)) {
    if (!O.endAngleBracket.test(dest)) return;
    const t = trimEndChar(dest.slice(0, -1), '\\', false);
    if ((dest.length - t.length) % 2 === 0) return;
  } else {
    const idx = bracketDepth(m[2], '()');
    if (idx === -2) return;
    if (idx > -1) {
      const cut = (m[0].indexOf('!') === 0 ? 5 : 4) + m[1].length + idx;
      m[2] = m[2].substring(0, idx);
      m[0] = m[0].substring(0, cut).trim();
      m[3] = '';
    }
  }
  const last = trimEndChar(m[0].slice(0, -1), '\\', false);
  if ((m[0].length - last.length) % 2 === 0) return;
  const title = m[3] ? m[3].slice(1, -1) : '';
  let href = m[2].trim();
  if (O.startAngleBracket.test(href)) href = href.slice(1, -1);
  return makeLink(
    m,
    { href: href && href.replace(I.anyPunctuation, '$1'), title: title && title.replace(I.anyPunctuation, '$1') },
    m[0],
    this,
  );
};

Lexer.prototype.inlineRefLink = function (src) {
  let m = I.reflink.exec(src);
  if (!m) m = I.nolink.exec(src);
  if (!m) return;
  const offset = m[0].charAt(0) === '!' ? 2 : 1;
  if (linkTextBlocked(src, m[1], offset)) return;
  const def = this.tokens.links[normLabel(m[2] || m[1])];
  if (!def) {
    const ch = m[0].charAt(0);
    return { type: 'text', raw: ch, text: ch };
  }
  return makeLink(m, def, m[0], this);
};

Lexer.prototype.inlineEmStrong = function (src, masked, prev, info) {
  let m = I.emStrongLDelim.exec(src);
  if (!m || (!m[1] && !m[2] && !m[3] && !m[4])) return;
  const ch = m[0][0];
  const sameAsPrev = prev === ch;
  const i = masked.length - src.length;
  let l = i;
  while (l > 0 && masked[l - 1] === ch) l--;
  const priorSlice = masked.slice(Math.max(0, l - 2), l);
  const p = priorSlice ? [...priorSlice].at(-1) : '';
  const punct = p === '*' || p === '_' || !!I.punctuation.exec(p);
  if (l < i) prev = p;
  const prevPunct = l < i ? punct : !!I.punctuation.exec(prev);
  if (m[4] && prev.match(O.unicodeAlphaNumeric)) return;
  const delimChar = m[1] || m[3] || '';
  if (!delimChar || !prev || prevPunct) {
    const k = cpLen(m[0]) - 1;
    let mRun = k;
    let f = 0;
    const y = i - l + k;
    const R = !!p.trim() && (!!delimChar || (ch === '*' && !punct));
    if (ch !== '*' && ch !== '_') return;
    const re = ch === '*' ? I.emStrongRDelimAst : I.emStrongRDelimUnd;
    const lastCloser = ch === '*' ? info.lastAst : info.lastUnd;
    const Q = masked.length - src.length + k;
    if (lastCloser < Q) return;
    const sub = masked.slice(-1 * src.length + k);
    const limit = lastCloser - Q;
    re.lastIndex = 0;
    let s;
    while ((s = re.exec(sub)) !== null && !(s.index > limit)) {
      const g = s[1] || s[2] || s[3] || s[4] || s[5] || s[6];
      if (!g) continue;
      const b = cpLen(g);
      if (s[3] || s[4]) {
        mRun += b;
        continue;
      } else if (s[5] || s[6] || R) {
        if (sameAsPrev && (s[5] || s[6])) break;
        if (y % 3 && !((y + b) % 3)) {
          f += b;
          continue;
        }
      }
      mRun -= b;
      if (mRun > 0) continue;
      const bFinal = Math.min(b, b + mRun + f);
      const firstCharLen = firstCpLen(s[0]);
      const whole = src.slice(0, k + s.index + firstCharLen + bFinal);
      if (Math.min(k, bFinal) % 2) {
        const inner = whole.slice(1, -1);
        return { type: 'em', raw: whole, text: inner, tokens: this.inlineTokens(inner) };
      }
      const inner = whole.slice(2, -2);
      return { type: 'strong', raw: whole, text: inner, tokens: this.inlineTokens(inner) };
    }
  }
};

Lexer.prototype.inlineDel = function (src, masked, prev, info) {
  let m = I.delLDelim.exec(src);
  if (!m) return;
  if (!(m[1] || '') || !prev || I.punctuation.exec(prev)) {
    const o = cpLen(m[0]) - 1;
    let p = o;
    const re = I.delRDelim;
    const lastCloser = info.lastDel;
    const d = masked.length - src.length + o;
    if (lastCloser < d) return;
    const sub = masked.slice(-1 * src.length + o);
    const limit = lastCloser - d;
    re.lastIndex = 0;
    let s;
    while ((s = re.exec(sub)) !== null && !(s.index > limit)) {
      const g = s[1] || s[2] || s[3] || s[4] || s[5] || s[6];
      if (!g) continue;
      const b = cpLen(g);
      if (b !== o) continue;
      if (s[3] || s[4]) {
        p += b;
        continue;
      }
      p -= b;
      if (p > 0) continue;
      const bFinal = Math.min(b, b + p);
      const firstCharLen = firstCpLen(s[0]);
      const whole = src.slice(0, o + s.index + firstCharLen + bFinal);
      const inner = whole.slice(o, -o);
      return { type: 'del', raw: whole, text: inner, tokens: this.inlineTokens(inner) };
    }
  }
};

Lexer.prototype.inlineUrl = function (src) {
  const m = I.url.exec(src);
  if (!m) return;
  let text;
  let href;
  if (m[2] === '@') {
    text = m[0];
    href = 'mailto:' + text;
  } else {
    let raw = m[0];
    for (;;) {
      const was = raw;
      const bp = I.backpedal.exec(raw);
      raw = bp ? bp[0] : '';
      if (was === raw) break;
    }
    text = raw;
    href = m[1] === 'www.' ? 'http://' + raw : raw;
  }
  return {
    type: 'link',
    raw: text,
    text,
    href,
    autolink: true,
    tokens: [{ type: 'text', raw: text, text }],
  };
};

// ---------------------------------------------------------------- renderer

class Renderer {
  space() {
    return '';
  }
  code(tok) {
    const lang = (tok.lang || '').match(O.notSpaceStart)?.[0];
    const body = tok.text ? tok.text.replace(O.endingNewline, '') + '\n' : '';
    if (lang) {
      return '<pre><code class="language-' + escapeHtml(lang) + '">' + (tok.escaped ? body : escapeHtml(body, true)) + '</code></pre>\n';
    }
    return '<pre><code>' + (tok.escaped ? body : escapeHtml(body, true)) + '</code></pre>\n';
  }
  blockquote(tok) {
    return '<blockquote>\n' + parseBlocks(tok.tokens) + '</blockquote>\n';
  }
  html(tok) {
    return tok.text;
  }
  def() {
    return '';
  }
  heading(tok) {
    return `<h${tok.depth}>` + parseInline(tok.tokens) + `</h${tok.depth}>\n`;
  }
  hr() {
    return '<hr>\n';
  }
  list(tok) {
    let body = '';
    const items = tok.items;
    for (let i = 0; i < items.length; i++) body += this.listitem(items[i]);
    const name = tok.ordered ? 'ol' : 'ul';
    const attr = tok.ordered && tok.start !== 1 ? ' start="' + tok.start + '"' : '';
    return '<' + name + attr + '>\n' + body + '</' + name + '>\n';
  }
  listitem(tok) {
    return '<li>' + parseBlocks(tok.tokens) + '</li>\n';
  }
  checkbox(tok) {
    return '<input ' + (tok.checked ? 'checked="" ' : '') + 'disabled="" type="checkbox"> ';
  }
  paragraph(tok) {
    return '<p>' + parseInline(tok.tokens) + '</p>\n';
  }
  table(tok) {
    let head = '';
    for (let i = 0; i < tok.header.length; i++) head += this.tablecell(tok.header[i]);
    let body = '';
    for (let i = 0; i < tok.rows.length; i++) {
      let row = '';
      const cells = tok.rows[i];
      for (let j = 0; j < cells.length; j++) row += this.tablecell(cells[j]);
      body += this.tablerow(row);
    }
    if (body) body = '<tbody>' + body + '</tbody>';
    return '<table>\n<thead>\n' + this.tablerow(head) + '</thead>\n' + body + '</table>\n';
  }
  tablerow(text) {
    return '<tr>\n' + text + '</tr>\n';
  }
  tablecell(tok) {
    const content = parseInline(tok.tokens);
    const name = tok.header ? 'th' : 'td';
    return (tok.align ? `<${name} align="${tok.align}">` : `<${name}>`) + content + `</${name}>\n`;
  }
  strong(tok) {
    return '<strong>' + parseInline(tok.tokens) + '</strong>';
  }
  em(tok) {
    return '<em>' + parseInline(tok.tokens) + '</em>';
  }
  codespan(tok) {
    return '<code>' + escapeHtml(tok.text, true) + '</code>';
  }
  br() {
    return '<br>';
  }
  del(tok) {
    return '<del>' + parseInline(tok.tokens) + '</del>';
  }
  link(tok) {
    const content = tok.autolink ? escapeHtml(tok.text, true) : parseInline(tok.tokens);
    const encoded = encodeHref(tok.href);
    if (encoded === null) return content;
    let out = '<a href="' + escapeHtml(encoded, tok.autolink) + '"';
    if (tok.title) out += ' title="' + escapeHtml(tok.title) + '"';
    return out + '>' + content + '</a>';
  }
  image(tok) {
    let text = tok.text;
    if (tok.tokens) text = parseInline(tok.tokens, TEXT_RENDERER);
    const encoded = encodeHref(tok.href);
    if (encoded === null) return escapeHtml(text);
    let out = `<img src="${escapeHtml(encoded)}" alt="${escapeHtml(text)}"`;
    if (tok.title) out += ` title="${escapeHtml(tok.title)}"`;
    return out + '>';
  }
}

const RENDERER = new Renderer();

const TEXT_RENDERER = {
  strong(t) {
    return t.tokens ? parseInline(t.tokens, TEXT_RENDERER) : t.text;
  },
  em(t) {
    return t.tokens ? parseInline(t.tokens, TEXT_RENDERER) : t.text;
  },
  codespan(t) {
    return t.text;
  },
  del(t) {
    return t.tokens ? parseInline(t.tokens, TEXT_RENDERER) : t.text;
  },
  html(t) {
    return t.text;
  },
  text(t) {
    return t.text;
  },
  link(t) {
    return t.tokens ? parseInline(t.tokens, TEXT_RENDERER) : t.text;
  },
  image(t) {
    return t.tokens ? parseInline(t.tokens, TEXT_RENDERER) : t.text;
  },
  br() {
    return '';
  },
  checkbox(t) {
    return t.raw;
  },
};

// ---------------------------------------------------------------- parser

function parseBlocks(tokens) {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    switch (tok.type) {
      case 'space':
        out += RENDERER.space(tok);
        break;
      case 'hr':
        out += '<hr>\n';
        break;
      case 'heading':
        out += RENDERER.heading(tok);
        break;
      case 'code':
        out += RENDERER.code(tok);
        break;
      case 'table':
        out += RENDERER.table(tok);
        break;
      case 'blockquote':
        out += RENDERER.blockquote(tok);
        break;
      case 'list':
        out += RENDERER.list(tok);
        break;
      case 'checkbox':
        out += RENDERER.checkbox(tok);
        break;
      case 'html':
        out += tok.text;
        break;
      case 'def':
        break;
      case 'paragraph':
        out += RENDERER.paragraph(tok);
        break;
      case 'text':
        out += RENDERER.text(tok);
        break;
    }
  }
  return out;
}

Renderer.prototype.text = function (tok) {
  if (tok.tokens) return parseInline(tok.tokens);
  if (tok.escaped) return tok.text;
  return escapeHtml(tok.text);
};

function parseInline(tokens, renderer) {
  renderer = renderer || RENDERER;
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    switch (tok.type) {
      case 'escape':
      case 'text':
        out += renderer.text(tok);
        break;
      case 'html':
        out += renderer.html(tok);
        break;
      case 'link':
        out += renderer.link(tok);
        break;
      case 'image':
        out += renderer.image(tok);
        break;
      case 'checkbox':
        out += renderer.checkbox(tok);
        break;
      case 'strong':
        out += renderer.strong(tok);
        break;
      case 'em':
        out += renderer.em(tok);
        break;
      case 'codespan':
        out += renderer.codespan(tok);
        break;
      case 'br':
        out += renderer.br(tok);
        break;
      case 'del':
        out += renderer.del(tok);
        break;
    }
  }
  return out;
}

// ---------------------------------------------------------------- entry

export function parse(markdown) {
  const lexer = new Lexer();
  const tokens = lexer.lex(markdown);
  return parseBlocks(tokens);
}
