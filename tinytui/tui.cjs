'use strict';

// ─── Tiny TUI v4 ───────────────────────────────────────────────────────
// Zero-dependency terminal UI.
//   - Multi-line input (Shift+Enter newline, Enter submit, auto-wrap)
//   - Scrollable conversation area (mouse + keyboard)
//   - Dynamic status bar (chars/tokens during streaming)
//   - /-triggered autocomplete
//   - Simulated streaming assistant replies
//
// stdin raw data parsed directly — no readline dependency.
// ────────────────────────────────────────────────────────────────────────

// ═══ ANSI helpers ════════════════════════════════════════════════════════

var ansi = {
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clearScreen: '\x1b[2J',

  pos: function(row, col) { return '\x1b[' + row + ';' + col + 'H'; },

  fg: function(n) { return '\x1b[38;5;' + n + 'm'; },
  bg: function(n) { return '\x1b[48;5;' + n + 'm'; },
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};

// ═══ Screen buffer ─────────────────────────────────────────────────────

function Screen() {
  var rows = process.stdout.rows || 24;
  var cols = process.stdout.columns || 80;
  this.rows = rows;
  this.cols = cols;
  this._buf = [];
  for (var i = 0; i < rows; i++) {
    this._buf.push({ chars: ' '.repeat(cols), dirty: true });
  }
}

Screen.prototype.resize = function(rows, cols) {
  this.rows = rows;
  this.cols = cols;
  while (this._buf.length < rows) {
    this._buf.push({ chars: ' '.repeat(cols), dirty: true });
  }
  this._buf.length = rows;
  for (var i = 0; i < this._buf.length; i++) {
    var line = this._buf[i];
    line.chars = line.chars.slice(0, cols);
    while (line.chars.length < cols) line.chars += ' ';
    line.dirty = true;
  }
};

Screen.prototype.write = function(row, col, text) {
  if (row < 0 || row >= this.rows) return;
  var line = this._buf[row];
  var start = col;
  var end = col + text.length;
  if (end > this.cols) end = this.cols;
  var visible = text.slice(0, end - col);
  line.chars = line.chars.slice(0, start) + visible + line.chars.slice(start + visible.length);
  while (line.chars.length < this.cols) line.chars += ' ';
  if (line.chars.length > this.cols) line.chars = line.chars.slice(0, this.cols);
  line.dirty = true;
};

Screen.prototype.fill = function(row, text) { this.write(row, 0, text); };

Screen.prototype.frameStart = function() {
  for (var i = 0; i < this._buf.length; i++) this._buf[i].dirty = false;
};

Screen.prototype.dirtyRows = function() {
  var r = [];
  for (var i = 0; i < this._buf.length; i++) {
    if (this._buf[i].dirty) r.push(i);
  }
  return r;
};

// ═══ Word wrapping ─────────────────────────────────────────────────────

function wrapText(text, maxWidth) {
  if (maxWidth <= 0) return [''];
  var lines = [];
  var paragraphs = text.split('\n');
  for (var p = 0; p < paragraphs.length; p++) {
    var para = paragraphs[p];
    if (para.length === 0) { lines.push(''); continue; }
    var remaining = para;
    while (remaining.length > 0) {
      if (remaining.length <= maxWidth) { lines.push(remaining); break; }
      var cut = maxWidth;
      while (cut > 0 && remaining[cut] !== ' ') cut--;
      if (cut === 0) cut = maxWidth;
      lines.push(remaining.slice(0, cut));
      remaining = remaining.slice(cut + (remaining[cut] === ' ' ? 1 : 0));
    }
  }
  return lines;
}

// ═══ Content area ──────────────────────────────────────────────────────

function ContentArea() {
  this.lines = [];
  this.scrollOffset = 0;
  this.maxLines = 1000;
}

ContentArea.prototype.addLines = function(newLines) {
  var atBottom = this.scrollOffset === 0;
  for (var i = 0; i < newLines.length; i++) {
    this.lines.push(newLines[i]);
    if (this.lines.length > this.maxLines) this.lines.shift();
  }
  if (!atBottom) {
    this.scrollOffset += newLines.length;
    if (this.scrollOffset >= this.lines.length)
      this.scrollOffset = Math.max(0, this.lines.length - 1);
  }
};

ContentArea.prototype.scrollUp = function(n) {
  this.scrollOffset = Math.min(Math.max(0, this.lines.length - 1), this.scrollOffset + n);
};
ContentArea.prototype.scrollDown = function(n) {
  this.scrollOffset = Math.max(0, this.scrollOffset - n);
};
ContentArea.prototype.scrollToBottom = function() { this.scrollOffset = 0; };

ContentArea.prototype.visibleSlice = function(height) {
  var end = this.lines.length - this.scrollOffset;
  var start = Math.max(0, end - height);
  return { lines: this.lines.slice(start, end), start: start, end: end };
};

// ═══ Autocomplete ──────────────────────────────────────────────────────

var COMMANDS = [
  { cmd: '/help', desc: 'Show help' },
  { cmd: '/clear', desc: 'Clear screen' },
  { cmd: '/quit', desc: 'Exit' },
];

function AutoComplete(commands) {
  this.commands = commands;
  this.active = false;
  this.matches = [];
  this.selectedIdx = 0;
}

AutoComplete.prototype.update = function(input) {
  // Only autocomplete for / at the very start of the input
  if (!input.startsWith('/')) {
    this.active = false; this.matches = []; return false;
  }
  var prefix = input.toLowerCase();
  this.matches = this.commands.filter(function(c) {
    return c.cmd.toLowerCase().startsWith(prefix);
  });
  this.active = this.matches.length > 0;
  this.selectedIdx = 0;
  return this.active;
};

AutoComplete.prototype.selectNext = function() {
  if (this.matches.length) this.selectedIdx = (this.selectedIdx + 1) % this.matches.length;
};
AutoComplete.prototype.selectPrev = function() {
  if (this.matches.length) this.selectedIdx = (this.selectedIdx - 1 + this.matches.length) % this.matches.length;
};
AutoComplete.prototype.selected = function() { return this.matches[this.selectedIdx] || null; };

// ═══ Streaming ─────────────────────────────────────────────────────────

var SIMULATED_REPLIES = [
  "Here's my analysis:\n\nGreat question! Let me break it down:\n\n1. First, understand the core problem before writing code.\n\n2. Consider trade-offs — simplicity vs performance vs maintainability.\n\n3. Start simple and iterate. The best solutions emerge from real usage.\n\nLet me know if you want me to elaborate!",

  "Interesting point! Here's what I think:\n\nFocus on what matters for your specific use case. Don't try to handle every possible scenario.\n\nA practical approach:\n- Keep the interface minimal\n- Make it easy to test\n- Document key decisions\n- Iterate based on feedback\n\nThis pattern works across many domains.",

  "Let me think about this...\n\nOK, here's my recommendation:\n\n```javascript\nfunction processData(input) {\n  if (!input || !input.length) return [];\n\n  var result = input\n    .filter(function(item) { return item.active; })\n    .map(function(item) {\n      return {\n        id: item.id,\n        name: item.name.toUpperCase(),\n        score: item.score * 1.2\n      };\n    });\n\n  return result;\n}\n```\n\nClean pipeline pattern. Handles edge cases upfront.",

  "Common question! The answer depends on context:\n\n- Small project? Keep it simple.\n- Team work? Prioritize readability.\n- Performance critical? Measure first.\n\nYou can always refactor later. Get something working first.",
];

function StreamSimulator() {
  this.streaming = false;
  this._timer = null;
}

StreamSimulator.prototype.start = function(onChunk, onDone) {
  this.stop();
  this.streaming = true;
  var full = SIMULATED_REPLIES[Math.floor(Math.random() * SIMULATED_REPLIES.length)];
  var idx = 0;
  var chunkSize = 1 + Math.floor(Math.random() * 4);
  var self = this;

  this._timer = setInterval(function() {
    if (idx >= full.length) { self.stop(); onDone(); return; }
    var next = Math.min(idx + chunkSize, full.length);
    onChunk(full.slice(idx, next), full.slice(0, next));
    idx = next;
  }, 20 + Math.random() * 30);
};

StreamSimulator.prototype.stop = function() {
  this.streaming = false;
  if (this._timer) { clearInterval(this._timer); this._timer = null; }
};

// ═══ Stdin parser ──────────────────────────────────────────────────────

// Parse raw stdin bytes into structured events.
// In raw mode, stdin delivers bytes directly. We handle:
//   - Single bytes: printable chars (0x20+), ctrl combos (0x01-0x1A),
//     Enter (0x0D/0x0A), Tab (0x09), Backspace (0x7F/0x08)
//   - Multi-byte: UTF-8 chars, CSI sequences (arrows, home, end, etc),
//     SGR mouse, Alt+Enter (ESC + CR)
function parseStdin(buf) {
  var s = buf.toString();

  // SGR mouse: ESC [ < ...
  if (s.length >= 3 && s.charCodeAt(0) === 0x1b && s[1] === '[' && s[2] === '<') {
    return { type: 'mouse', raw: s };
  }

  // CSI sequences: ESC [ ...
  if (s.length >= 3 && s.charCodeAt(0) === 0x1b && s[1] === '[') {
    var tail = s.slice(2);
    switch (tail) {
      case 'A': return { type: 'key', name: 'up' };
      case 'B': return { type: 'key', name: 'down' };
      case 'C': return { type: 'key', name: 'right' };
      case 'D': return { type: 'key', name: 'left' };
      case 'H': return { type: 'key', name: 'home' };
      case 'F': return { type: 'key', name: 'end' };
      case '5~': return { type: 'key', name: 'pageup' };
      case '6~': return { type: 'key', name: 'pagedown' };
      case '3~': return { type: 'key', name: 'delete' };
      case '1~': return { type: 'key', name: 'home' };
      case '4~': return { type: 'key', name: 'end' };
      case 'Z': return { type: 'key', name: 'tab', shift: true };
    }
    return { type: 'unknown', raw: s };
  }

  // Escape alone
  if (s.length === 1 && s.charCodeAt(0) === 0x1b) {
    return { type: 'key', name: 'escape' };
  }

  // Alt+Enter: ESC followed by \r or \n (newline in multi-line input)
  if (s.length === 2 && s.charCodeAt(0) === 0x1b &&
      (s.charCodeAt(1) === 0x0d || s.charCodeAt(1) === 0x0a)) {
    return { type: 'key', name: 'return', alt: true };
  }

  // Single byte keys
  if (s.length === 1) {
    var code = s.charCodeAt(0);
    if (code === 0x03) return { type: 'key', name: 'c', ctrl: true };     // Ctrl+C
    if (code === 0x0d || code === 0x0a) return { type: 'key', name: 'return' }; // Enter
    if (code === 0x09) return { type: 'key', name: 'tab' };               // Tab
    if (code === 0x7f || code === 0x08) return { type: 'key', name: 'backspace' }; // Backspace
    if (code === 0x15) return { type: 'key', name: 'u', ctrl: true };     // Ctrl+U
    if (code === 0x17) return { type: 'key', name: 'w', ctrl: true };     // Ctrl+W
    if (code === 0x01) return { type: 'key', name: 'a', ctrl: true };     // Ctrl+A → home
    if (code === 0x05) return { type: 'key', name: 'e', ctrl: true };     // Ctrl+E → end
    if (code >= 0x01 && code <= 0x1a) return { type: 'unknown', raw: s }; // Other ctrl
    if (code >= 0x20 && code < 0x7f) return { type: 'char', char: s };    // Printable ASCII
  }

  // Multi-byte UTF-8
  if (s.length > 1 && (s.charCodeAt(0) & 0xc0) === 0xc0) {
    return { type: 'char', char: s };
  }

  return { type: 'unknown', raw: s };
}

// ═══ Multi-line input buffer ──────────────────────────────────────────

// The input is a list of logical lines (split by explicit \n).
// Each logical line is visually wrapped to fit the input width.
// cursorLine / cursorCol track the cursor in logical line coordinates.

var MAX_INPUT_ROWS = 5;   // max visual rows for the input area

function InputBuffer() {
  this.lines = [''];       // logical lines
  this.cursorLine = 0;     // which logical line
  this.cursorCol = 0;      // column within that logical line
}

// Get the flat text (joined with \n)
InputBuffer.prototype.getText = function() {
  return this.lines.join('\n');
};

InputBuffer.prototype.isEmpty = function() {
  return this.lines.length === 1 && this.lines[0].length === 0;
};

// Compute visual rows for the given input width.
// Returns { rows: [visualLineStrings], cursorVisualRow, cursorVisualCol }
InputBuffer.prototype.visualLayout = function(width) {
  if (width <= 0) width = 1;
  var visualRows = [];
  var cursorVR = 0, cursorVC = 0;
  var foundCursor = false;

  for (var li = 0; li < this.lines.length; li++) {
    var logicalLine = this.lines[li];
    if (logicalLine.length === 0) {
      if (li === this.cursorLine && !foundCursor) {
        cursorVR = visualRows.length;
        cursorVC = 0;
        foundCursor = true;
      }
      visualRows.push('');
      continue;
    }
    // Wrap this logical line
    var remaining = logicalLine;
    var lineStartRow = visualRows.length;
    var colOffset = 0;
    while (remaining.length > 0) {
      if (remaining.length <= width) {
        visualRows.push(remaining);
        // Check if cursor is in this visual row
        if (li === this.cursorLine && !foundCursor &&
            this.cursorCol >= colOffset && this.cursorCol <= colOffset + remaining.length) {
          cursorVR = lineStartRow + (visualRows.length - 1 - lineStartRow);
          cursorVC = this.cursorCol - colOffset;
          foundCursor = true;
        }
        break;
      }
      visualRows.push(remaining.slice(0, width));
      // Check cursor
      if (li === this.cursorLine && !foundCursor &&
          this.cursorCol >= colOffset && this.cursorCol < colOffset + width) {
        cursorVR = lineStartRow + (visualRows.length - 1 - lineStartRow);
        cursorVC = this.cursorCol - colOffset;
        foundCursor = true;
      }
      remaining = remaining.slice(width);
      colOffset += width;
    }
  }

  if (!foundCursor) {
    // Cursor at end of last logical line
    cursorVR = visualRows.length - 1;
    cursorVC = (visualRows[visualRows.length - 1] || '').length;
  }

  return { rows: visualRows, cursorVR: cursorVR, cursorVC: cursorVC };
};

// Insert a character at cursor position
InputBuffer.prototype.insertChar = function(ch) {
  var line = this.lines[this.cursorLine];
  this.lines[this.cursorLine] = line.slice(0, this.cursorCol) + ch + line.slice(this.cursorCol);
  this.cursorCol += ch.length;
};

// Insert a newline at cursor position (split the current line)
InputBuffer.prototype.insertNewline = function() {
  var line = this.lines[this.cursorLine];
  var before = line.slice(0, this.cursorCol);
  var after = line.slice(this.cursorCol);
  this.lines[this.cursorLine] = before;
  this.lines.splice(this.cursorLine + 1, 0, after);
  this.cursorLine++;
  this.cursorCol = 0;
};

// Backspace at cursor
InputBuffer.prototype.backspace = function() {
  if (this.cursorCol > 0) {
    var line = this.lines[this.cursorLine];
    this.lines[this.cursorLine] = line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol);
    this.cursorCol--;
  } else if (this.cursorLine > 0) {
    // Join with previous line
    var prevLen = this.lines[this.cursorLine - 1].length;
    this.lines[this.cursorLine - 1] += this.lines[this.cursorLine];
    this.lines.splice(this.cursorLine, 1);
    this.cursorLine--;
    this.cursorCol = prevLen;
  }
};

// Delete at cursor
InputBuffer.prototype.delete = function() {
  var line = this.lines[this.cursorLine];
  if (this.cursorCol < line.length) {
    this.lines[this.cursorLine] = line.slice(0, this.cursorCol) + line.slice(this.cursorCol + 1);
  } else if (this.cursorLine < this.lines.length - 1) {
    // Join with next line
    this.lines[this.cursorLine] += this.lines[this.cursorLine + 1];
    this.lines.splice(this.cursorLine + 1, 1);
  }
};

// Move cursor left
InputBuffer.prototype.moveLeft = function() {
  if (this.cursorCol > 0) {
    this.cursorCol--;
  } else if (this.cursorLine > 0) {
    this.cursorLine--;
    this.cursorCol = this.lines[this.cursorLine].length;
  }
};

// Move cursor right
InputBuffer.prototype.moveRight = function() {
  if (this.cursorCol < this.lines[this.cursorLine].length) {
    this.cursorCol++;
  } else if (this.cursorLine < this.lines.length - 1) {
    this.cursorLine++;
    this.cursorCol = 0;
  }
};

// Move cursor to home (start of line or start of input)
InputBuffer.prototype.moveHome = function() {
  this.cursorCol = 0;
};

// Move cursor to end of current logical line
InputBuffer.prototype.moveEnd = function() {
  this.cursorCol = this.lines[this.cursorLine].length;
};

// Move cursor up one visual row
InputBuffer.prototype.moveUp = function(width) {
  var layout = this.visualLayout(width);
  if (layout.cursorVR > 0) {
    var targetVR = layout.cursorVR - 1;
    var targetRow = layout.rows[targetVR];
    var targetCol = Math.min(layout.cursorVC, targetRow.length);
    // Find logical position
    this._setLogicalPos(layout, targetVR, targetCol);
  }
};

// Move cursor down one visual row
InputBuffer.prototype.moveDown = function(width) {
  var layout = this.visualLayout(width);
  if (layout.cursorVR < layout.rows.length - 1) {
    var targetVR = layout.cursorVR + 1;
    var targetRow = layout.rows[targetVR];
    var targetCol = Math.min(layout.cursorVC, targetRow.length);
    this._setLogicalPos(layout, targetVR, targetCol);
  }
};

// Convert visual row/col back to logical line/col
InputBuffer.prototype._setLogicalPos = function(layout, targetVR, targetCol) {
  // Walk through logical lines and their wrapped visual rows
  var vr = 0;
  for (var li = 0; li < this.lines.length; li++) {
    var logical = this.lines[li];
    if (logical.length === 0) {
      if (vr === targetVR) {
        this.cursorLine = li;
        this.cursorCol = 0;
        return;
      }
      vr++;
      continue;
    }
    var nVisual = Math.ceil(logical.length / layout.rows.length > 0 ?
      logical.length / Math.max(1, /* use width from context */ 80) : 0);
    // Actually, let me recalculate more carefully
    break;
  }

  // Simpler approach: scan through all visual rows
  var vr2 = 0;
  for (var li2 = 0; li2 < this.lines.length; li2++) {
    var logical2 = this.lines[li2];
    if (logical2.length === 0) {
      if (vr2 === targetVR) {
        this.cursorLine = li2;
        this.cursorCol = 0;
        return;
      }
      vr2++;
      continue;
    }
    // Count visual rows for this logical line
    var lineVR = Math.ceil(logical2.length / 80); // need actual width
    // Hmm, this is getting complicated. Let me use a different approach.
    break;
  }

  // Fallback: use the layout we already computed
  // Walk the layout rows and find which logical line they belong to
  var vrIdx = 0;
  for (var li3 = 0; li3 < this.lines.length; li3++) {
    var logLine = this.lines[li3];
    if (logLine.length === 0) {
      if (vrIdx === targetVR) {
        this.cursorLine = li3;
        this.cursorCol = 0;
        return;
      }
      vrIdx++;
      continue;
    }
    // Count visual rows this logical line takes
    var vRowsForLine = Math.max(1, Math.ceil(logLine.length / 80));
    if (targetVR >= vrIdx && targetVR < vrIdx + vRowsForLine) {
      this.cursorLine = li3;
      var vRowOffset = targetVR - vrIdx;
      this.cursorCol = vRowOffset * 80 + targetCol;
      if (this.cursorCol > logLine.length) this.cursorCol = logLine.length;
      return;
    }
    vrIdx += vRowsForLine;
  }

  // Fallback: put cursor at end
  this.cursorLine = this.lines.length - 1;
  this.cursorCol = this.lines[this.cursorLine].length;
};

InputBuffer.prototype.clear = function() {
  this.lines = [''];
  this.cursorLine = 0;
  this.cursorCol = 0;
};

// ═══ TinyTUI ───────────────────────────────────────────────────────────

var PROMPT = '> ';
var PROMPT_LEN = 2; // "> "

function TinyTUI() {
  this.screen = new Screen();
  this.content = new ContentArea();
  this.autocomplete = new AutoComplete(COMMANDS);
  this.streamer = new StreamSimulator();
  this.inputBuf = new InputBuffer();

  this.running = false;
  this._streamLineCount = 0;
  this._streamFullText = '';

  // Layout (calculated each render)
  this.inputStartRow = 0;   // first row of input area (buffer index)
  this.separatorRow = 0;    // status/separator row
  this.contentHeight = 0;   // rows available for content
  this.autoCompleteRow = 0;

  this.stdin = process.stdin;
  this.stdout = process.stdout;
}

// ── Layout ───────────────────────────────────────────────────────────

TinyTUI.prototype.calcLayout = function() {
  var totalRows = this.screen.rows; // e.g. 24

  // Compute how many visual rows the input needs
  var inputWidth = this.screen.cols - PROMPT_LEN;
  if (inputWidth < 1) inputWidth = 1;
  var layout = this.inputBuf.visualLayout(inputWidth);
  var neededRows = layout.rows.length;
  if (neededRows < 1) neededRows = 1;
  if (neededRows > MAX_INPUT_ROWS) neededRows = MAX_INPUT_ROWS;

  // Input area at bottom
  this.inputStartRow = totalRows - neededRows;
  this.separatorRow = this.inputStartRow - 1;
  this.contentHeight = this.separatorRow; // rows 0..separatorRow-1
  this.autoCompleteRow = this.separatorRow - 1;
};

// ── Render ───────────────────────────────────────────────────────────

TinyTUI.prototype.render = function() {
  var screen = this.screen;
  var content = this.content;
  var self = this;

  // First calc layout (input height may have changed)
  this.calcLayout();

  // ── Content area ──
  var visible = content.visibleSlice(this.contentHeight);
  for (var row = 0; row < this.contentHeight; row++) {
    screen.fill(row, (visible.lines[row] || '').padEnd(screen.cols, ' '));
  }

  // ── Scroll indicator ──
  if (content.scrollOffset > 0) {
    var indicator = ' [' + content.scrollOffset + ' lines above] ';
    if (indicator.length < screen.cols) {
      screen.write(0, screen.cols - indicator.length,
        ansi.bg(237) + ansi.fg(228) + indicator + ansi.reset);
    }
  }

  // ── Autocomplete dropdown ──
  if (this.autocomplete.active && this.autocomplete.matches.length > 0) {
    var matches = this.autocomplete.matches;
    var selected = this.autocomplete.selectedIdx;
    var dropdownH = Math.min(matches.length, 6);
    var dropdownTop = this.autoCompleteRow - dropdownH + 1;
    if (dropdownTop < 0) { dropdownH += dropdownTop; dropdownTop = 0; }
    for (var i = 0; i < dropdownH; i++) {
      var m = matches[i];
      var text = '  ' + m.cmd + '  ' + ansi.dim + m.desc + ansi.reset;
      if (text.length > screen.cols) text = text.slice(0, screen.cols - 1);
      screen.fill(dropdownTop + i,
        i === selected
          ? ansi.bg(237) + ansi.fg(255) + text + ansi.reset
          : ansi.bg(235) + text + ansi.reset);
    }
  }

  // ── Separator ──
  var streaming = this.streamer.streaming;
  if (streaming) {
    var chars = this._streamFullText.length;
    var tokens = Math.round(chars / 4);
    var left = ansi.fg(220) + ansi.bold + ' Assistant is thinking...' + ansi.reset;
    var right = ' ' + ansi.fg(252) + chars + ' chars' + ansi.reset
              + ' ' + ansi.dim + '|' + ansi.reset
              + ' ' + ansi.fg(252) + '~' + tokens + ' tokens' + ansi.reset + ' ';
    var mid = screen.cols - plainLen(left) - plainLen(right);
    screen.fill(this.separatorRow,
      left + (mid > 0 ? ansi.dim + '\u2500'.repeat(mid) + ansi.reset : '') + right);
  } else {
    var label = ansi.fg(245) + ansi.dim + '\u2500\u2500\u2500 Chat' + ansi.reset;
    var info = ansi.dim + content.lines.length + ' lines | ^C quit' + ansi.reset;
    var gap = screen.cols - plainLen(label) - plainLen(info);
    screen.fill(this.separatorRow,
      label + (gap > 0 ? ansi.dim + '\u2500'.repeat(gap) + ansi.reset : '') + info);
  }

  // ── Multi-line input area ──
  var inputWidth = screen.cols - PROMPT_LEN;
  if (inputWidth < 1) inputWidth = 1;
  var layout = this.inputBuf.visualLayout(inputWidth);

  // Clamp visual rows to MAX_INPUT_ROWS
  var visualRows = layout.rows.slice(0, MAX_INPUT_ROWS);
  var cursorVR = layout.cursorVR;
  var cursorVC = layout.cursorVC;
  if (cursorVR >= MAX_INPUT_ROWS) {
    cursorVR = MAX_INPUT_ROWS - 1;
    cursorVC = visualRows[cursorVR].length;
  }

  if (streaming) {
    // Show dimmed placeholder
    for (var r = 0; r < MAX_INPUT_ROWS; r++) {
      var row = this.inputStartRow + r;
      if (row >= screen.rows) break;
      if (r === 0) {
        screen.fill(row, ansi.bg(236) + ansi.dim + '  Waiting for response...' + ansi.reset);
      } else {
        screen.fill(row, ansi.bg(236) + ansi.reset);
      }
    }
  } else {
    for (var r = 0; r < MAX_INPUT_ROWS; r++) {
      var row = this.inputStartRow + r;
      if (row >= screen.rows) break;
      if (r < visualRows.length) {
        var lineText = visualRows[r];
        if (r === 0) {
          // First line has the prompt
          screen.fill(row,
            ansi.bg(236) + ansi.fg(75) + ansi.bold + '> ' + ansi.reset
            + ansi.bg(236) + ansi.fg(255) + lineText + ansi.reset);
        } else {
          // Continuation lines: indent with spaces
          screen.fill(row,
            ansi.bg(236) + '  ' + ansi.fg(255) + lineText + ansi.reset);
        }
      } else {
        screen.fill(row, ansi.bg(236) + ansi.reset);
      }
    }
  }

  // ── Write to terminal ──
  var out = '';
  out += ansi.hideCursor;
  var dirty = screen.dirtyRows();
  for (var d = 0; d < dirty.length; d++) {
    var dr = dirty[d];
    out += ansi.pos(dr + 1, 1) + screen._buf[dr].chars;
  }
  // Cursor position (ANSI 1-indexed)
  if (!streaming) {
    var cursorRow = this.inputStartRow + cursorVR;
    var cursorCol = (cursorVR === 0 ? PROMPT_LEN : 2) + cursorVC + 1; // +1 for ANSI 1-indexed col
    out += ansi.pos(cursorRow + 1, cursorCol);
  }
  out += ansi.showCursor;

  this.stdout.write(out);
  screen.frameStart();
};

// ── Input dispatch ──────────────────────────────────────────────────

TinyTUI.prototype.handleEvent = function(ev) {
  if (ev.type === 'mouse') { this._handleMouse(ev.raw); return; }
  if (ev.type === 'unknown' || ev.type === 'char' || ev.type === 'key') {
    // continue
  } else {
    return;
  }

  // Ctrl+C
  if (ev.type === 'key' && ev.name === 'c' && ev.ctrl) { this.quit(); return; }

  // During streaming, ignore all input
  if (this.streamer.streaming) return;

  // Alt+Enter — insert newline
  if (ev.type === 'key' && ev.name === 'return' && ev.alt) {
    this.inputBuf.insertNewline();
    this.autocomplete.update(this.inputBuf.getText());
    this.render();
    return;
  }

  // Enter — submit
  if (ev.type === 'key' && ev.name === 'return' && !ev.alt) {
    this._submit();
    return;
  }

  // Tab — autocomplete
  if (ev.type === 'key' && ev.name === 'tab') {
    if (this.autocomplete.active) {
      var m = this.autocomplete.selected();
      if (m) {
        this.inputBuf.lines = [m.cmd + ' '];
        this.inputBuf.cursorLine = 0;
        this.inputBuf.cursorCol = this.inputBuf.lines[0].length;
        this.autocomplete.update(this.inputBuf.getText());
      }
    }
    this.render();
    return;
  }

  // Autocomplete nav
  if (this.autocomplete.active) {
    if (ev.type === 'key' && ev.name === 'up') { this.autocomplete.selectPrev(); this.render(); return; }
    if (ev.type === 'key' && ev.name === 'down') { this.autocomplete.selectNext(); this.render(); return; }
    if (ev.type === 'key' && ev.name === 'escape') {
      this.autocomplete.active = false;
      this.autocomplete.matches = [];
      this.render();
      return;
    }
  }

  // Backspace
  if (ev.type === 'key' && ev.name === 'backspace') {
    this.inputBuf.backspace();
    this.autocomplete.update(this.inputBuf.getText());
    this.render();
    return;
  }

  // Delete
  if (ev.type === 'key' && ev.name === 'delete') {
    this.inputBuf.delete();
    this.autocomplete.update(this.inputBuf.getText());
    this.render();
    return;
  }

  // Arrow keys
  var inputWidth = Math.max(1, this.screen.cols - PROMPT_LEN);
  if (ev.type === 'key' && ev.name === 'left')  { this.inputBuf.moveLeft(); this.render(); return; }
  if (ev.type === 'key' && ev.name === 'right') { this.inputBuf.moveRight(); this.render(); return; }
  if (ev.type === 'key' && ev.name === 'up' && !this.autocomplete.active) {
    this.inputBuf.moveUp(inputWidth); this.render(); return;
  }
  if (ev.type === 'key' && ev.name === 'down' && !this.autocomplete.active) {
    this.inputBuf.moveDown(inputWidth); this.render(); return;
  }
  if (ev.type === 'key' && ev.name === 'home')  { this.inputBuf.moveHome(); this.render(); return; }
  if (ev.type === 'key' && ev.name === 'end')   { this.inputBuf.moveEnd(); this.render(); return; }

  // Ctrl+A → home, Ctrl+E → end
  if (ev.type === 'key' && ev.name === 'a' && ev.ctrl) { this.inputBuf.moveHome(); this.render(); return; }
  if (ev.type === 'key' && ev.name === 'e' && ev.ctrl) { this.inputBuf.moveEnd(); this.render(); return; }

  // Page Up/Down — scroll content
  if (ev.type === 'key' && ev.name === 'pageup')   { this.content.scrollUp(8); this.render(); return; }
  if (ev.type === 'key' && ev.name === 'pagedown') { this.content.scrollDown(8); this.render(); return; }

  // Ctrl+U — clear input
  if (ev.type === 'key' && ev.name === 'u' && ev.ctrl) {
    this.inputBuf.clear();
    this.autocomplete.update('');
    this.render();
    return;
  }

  // Ctrl+W — delete word
  if (ev.type === 'key' && ev.name === 'w' && ev.ctrl) {
    var line = this.inputBuf.lines[this.inputBuf.cursorLine];
    var before = line.slice(0, this.inputBuf.cursorCol);
    var after = line.slice(this.inputBuf.cursorCol);
    var wordEnd = before.replace(/\S+$/, '');
    var deleted = before.length - wordEnd.length;
    this.inputBuf.lines[this.inputBuf.cursorLine] = wordEnd + after;
    this.inputBuf.cursorCol -= deleted;
    this.autocomplete.update(this.inputBuf.getText());
    this.render();
    return;
  }

  // Regular character
  if (ev.type === 'char') {
    this.inputBuf.insertChar(ev.char);
    this.autocomplete.update(this.inputBuf.getText());
    this.render();
    return;
  }
};

TinyTUI.prototype._handleMouse = function(data) {
  var match = data.match(/\[<(\d+);(\d+);(\d+);([Mm])/);
  if (!match) return;
  var btn = parseInt(match[1], 10);
  var type = match[4];
  if (btn === 64 && type === 'M') { this.content.scrollUp(3); this.render(); }
  if (btn === 65 && type === 'M') { this.content.scrollDown(3); this.render(); }
};

// ── Submit ───────────────────────────────────────────────────────────

TinyTUI.prototype._submit = function() {
  var text = this.inputBuf.getText().trim();
  if (!text) { this.render(); return; }

  // Show user message
  this.content.addLines(wrapText(
    ansi.fg(75) + ansi.bold + '> You:' + ansi.reset + ' ' + text,
    this.screen.cols
  ));
  this.content.addLines(['']);

  this.inputBuf.clear();
  this.autocomplete.active = false;
  this.autocomplete.matches = [];

  if (text.startsWith('/')) {
    this._execCommand(text);
    this.content.scrollToBottom();
    this.render();
    return;
  }

  // Start streaming
  this.content.scrollToBottom();
  var prefix = ansi.fg(220) + ansi.bold + '> Assistant:' + ansi.reset;
  this.content.addLines([prefix]);
  var streamStart = this.content.lines.length;

  this._streamLineCount = 0;
  this._streamFullText = '';

  this.render();

  var self = this;
  this.streamer.start(
    function(chunk, fullText) {
      self._streamFullText = fullText;
      var wrapped = wrapText(fullText, self.screen.cols - 2);
      var indented = wrapped.map(function(l) { return '  ' + l; });
      var prev = self._streamLineCount || 0;
      if (prev === 0) {
        self.content.addLines(indented);
      } else {
        self.content.lines.splice(streamStart, prev);
        for (var i = 0; i < indented.length; i++) {
          self.content.lines.splice(streamStart + i, 0, indented[i]);
        }
      }
      self._streamLineCount = indented.length;
      self.content.scrollToBottom();
      self.render();
    },
    function() {
      self._streamLineCount = 0;
      self.content.addLines(['']);
      self.content.scrollToBottom();
      self.render();
    }
  );
};

TinyTUI.prototype._execCommand = function(cmd) {
  var parts = cmd.split(/\s+/);
  var name = parts[0].toLowerCase();
  var self = this;
  switch (name) {
    case '/help':
      this.content.addLines(
        [ansi.bold + 'Commands:' + ansi.reset].concat(
          COMMANDS.map(function(c) {
            return '  ' + ansi.fg(75) + c.cmd + ansi.reset + '  ' + ansi.dim + c.desc + ansi.reset;
          })
        )
      );
      break;
    case '/quit':
      this.content.addLines([ansi.dim + 'Goodbye!' + ansi.reset]);
      this.content.scrollToBottom();
      this.render();
      setTimeout(function() { self.quit(); }, 300);
      return;
    case '/clear':
      this.content.lines = [];
      this.content.scrollOffset = 0;
      break;
    default:
      this.content.addLines([ansi.fg(196) + 'Unknown: ' + name + ansi.reset]);
  }
};

// ── Lifecycle ────────────────────────────────────────────────────────

TinyTUI.prototype.start = function() {
  if (this.running) return;
  this.running = true;
  var self = this;

  this.stdin.setRawMode(true);
  this.stdin.resume();

  // Mouse tracking
  this.stdout.write('\x1b[?1000h\x1b[?1003h\x1b[?1006h');
  this.calcLayout();
  this.stdout.write(ansi.clearScreen);
  this.stdout.write(ansi.hideCursor);

  // Welcome
  this.content.addLines([
    ansi.bold + 'Tiny TUI v4' + ansi.reset + ' — ' + ansi.dim + 'Multi-line Chat Demo' + ansi.reset,
    '',
    ansi.dim + 'Type anything, Enter to send. Alt+Enter for newline. Auto-wraps on overflow.' + ansi.reset,
    ansi.dim + '/help | Mouse scroll | Up/Down arrows | Ctrl+C quit' + ansi.reset,
    '',
    ansi.fg(220) + ansi.bold + '> Assistant:' + ansi.reset + ' ' + ansi.dim + 'Hi! Try typing a long message or Alt+Enter for multiple lines.' + ansi.reset,
    '',
  ]);

  // Split buffer and dispatch each key separately
  // (real typing sends 1 byte per event; tmux/paste can send many at once)
  var stdinHandler = function(buf) {
    try {
      var s = buf.toString();
      var i = 0;
      while (i < s.length) {
        var ev;
        if (s[i] === '\x1b' && s.length > i + 1) {
          // Escape sequence — find its end
          if (s[i + 1] === '[') {
            var end = i + 2;
            while (end < s.length && !/[A-Za-z~]/.test(s[end])) end++;
            if (end < s.length) end++; // include terminator
            ev = parseStdin(Buffer.from(s.slice(i, end)));
            i = end;
          } else {
            ev = parseStdin(Buffer.from(s.slice(i, 2)));
            i += 2;
          }
        } else {
          ev = parseStdin(Buffer.from(s[i]));
          i++;
        }
        self.handleEvent(ev);
      }
    } catch (e) {}
  };
  this.stdin.on('data', stdinHandler);
  this._stdinHandler = stdinHandler;

  // Resize
  var resizeHandler = function() {
    self.screen.resize(process.stdout.rows, process.stdout.columns);
    self.render();
  };
  process.stdout.on('resize', resizeHandler);
  this._resizeHandler = resizeHandler;

  this.render();

  this._cleanup = function() {
    self.streamer.stop();
    self.stdout.write(ansi.showCursor);
    self.stdout.write(ansi.pos(self.screen.rows, 1));
    self.stdout.write('\n');
    self.stdout.write('\x1b[?1000l\x1b[?1003l\x1b[?1006l');
    if (self.stdin && self.stdin.setRawMode) self.stdin.setRawMode(false);
    if (self.stdin) self.stdin.pause();
  };
  process.on('exit', this._cleanup);
  process.on('SIGINT', function() { self._cleanup(); process.exit(0); });
  process.on('SIGTERM', function() { self._cleanup(); process.exit(0); });
};

TinyTUI.prototype.quit = function() {
  if (this._cleanup) this._cleanup();
  process.exit(0);
};

// ═══ Helpers ════════════════════════════════════════════════════════════

function plainLen(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

// ═══ Entry point ════════════════════════════════════════════════════════

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Error: TinyTUI requires a real terminal (TTY).');
  process.exit(1);
}

var tui = new TinyTUI();
tui.start();
