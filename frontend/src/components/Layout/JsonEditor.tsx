import { useMemo, useRef, useState, useCallback } from 'react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

type Token =
  | { type: 'key'; text: string }
  | { type: 'string'; text: string }
  | { type: 'number'; text: string }
  | { type: 'bool'; text: string }
  | { type: 'null'; text: string }
  | { type: 'bracket'; text: string }
  | { type: 'colon'; text: string }
  | { type: 'comma'; text: string }
  | { type: 'whitespace'; text: string };

const COLORS: Record<Token['type'], string> = {
  key: '#881391',
  string: '#0a6e3a',
  number: '#1750eb',
  bool: '#1750eb',
  null: '#808080',
  bracket: '#000',
  colon: '#000',
  comma: '#000',
  whitespace: 'transparent',
};

function tokenize(json: string): { tokens: Token[]; valid: boolean } {
  const tokens: Token[] = [];
  let i = 0;

  try {
    JSON.parse(json);

    while (i < json.length) {
      const ch = json[i];

      if (/\s/.test(ch)) {
        let ws = '';
        while (i < json.length && /\s/.test(json[i])) ws += json[i++];
        tokens.push({ type: 'whitespace', text: ws });
        continue;
      }

      if ('{}[]'.includes(ch)) { tokens.push({ type: 'bracket', text: ch }); i++; continue; }
      if (ch === ':' || ch === ',') { tokens.push({ type: ch === ':' ? 'colon' : 'comma', text: ch }); i++; continue; }

      if (ch === '"') {
        let str = '"'; i++;
        while (i < json.length && json[i] !== '"') {
          if (json[i] === '\\') { str += json[i++]; if (i < json.length) str += json[i++]; }
          else str += json[i++];
        }
        if (i < json.length) str += json[i++];
        let j = i; while (j < json.length && /\s/.test(json[j])) j++;
        tokens.push({ type: j < json.length && json[j] === ':' ? 'key' : 'string', text: str });
        continue;
      }

      if (/[-\d]/.test(ch)) {
        let num = '';
        while (i < json.length && /[-\d.eE+]/.test(json[i])) num += json[i++];
        tokens.push({ type: 'number', text: num });
        continue;
      }

      if ('tfn'.includes(ch)) {
        let word = '';
        while (i < json.length && /[a-z]/.test(json[i])) word += json[i++];
        tokens.push({ type: word === 'true' || word === 'false' ? 'bool' : word === 'null' ? 'null' : 'key', text: word });
        continue;
      }

      tokens.push({ type: 'key', text: ch });
      i++;
    }

    return { tokens, valid: true };
  } catch {
    return { tokens: [{ type: 'key', text: json }], valid: false };
  }
}

const LINE_HEIGHT = 20;
const PADDING = 12;

export default function JsonEditor({ value, onChange, rows = 20, readOnly, style }: JsonEditorProps) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const { tokens, valid } = useMemo(() => tokenize(value), [value]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Ensure newline at end for proper display
  const displayValue = value.endsWith('\n') ? value : value + '\n';

  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${valid ? (focused ? '#1677ff' : '#d9d9d9') : '#ff4d4f'}`,
        borderRadius: 6,
        transition: 'border-color 0.2s',
        height: rows * LINE_HEIGHT + PADDING * 2,
        minHeight: 120,
        ...style,
      }}
    >
      {/* 编辑层 */}
      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          fontFamily: 'Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: `${LINE_HEIGHT}px`,
          color: 'transparent',
          caretColor: '#000',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          padding: `${PADDING}px`,
          borderRadius: 0,
          overflow: 'auto',
          whiteSpace: 'pre',
          zIndex: 2,
        }}
      />

      {/* 高亮层 */}
      <pre
        ref={preRef}
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          padding: `${PADDING}px`,
          fontFamily: 'Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: `${LINE_HEIGHT}px`,
          whiteSpace: 'pre',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <code>
          {tokens.map((t, i) => (
            <span key={i} style={{ color: COLORS[t.type] }}>{t.text}</span>
          ))}
          {/* Ensure trailing newline matches */}
          {'\n'}
        </code>
      </pre>

      {!valid && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, padding: '4px 12px', fontSize: 12, color: '#ff4d4f', borderTop: '1px solid #ffccc7', background: '#fff2f0' }}>
          JSON 格式错误
        </div>
      )}
    </div>
  );
}
