import { useMemo, useState } from 'react';
import { Input } from 'antd';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

const { TextArea } = Input;

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
    const valid = true;

    while (i < json.length) {
      const ch = json[i];

      // whitespace
      if (/\s/.test(ch)) {
        let ws = '';
        while (i < json.length && /\s/.test(json[i])) {
          ws += json[i++];
        }
        tokens.push({ type: 'whitespace', text: ws });
        continue;
      }

      // brackets
      if ('{}[]'.includes(ch)) {
        tokens.push({ type: 'bracket', text: ch });
        i++;
        continue;
      }

      // colon / comma
      if (ch === ':' || ch === ',') {
        tokens.push({ type: ch === ':' ? 'colon' : 'comma', text: ch });
        i++;
        continue;
      }

      // strings
      if (ch === '"') {
        let str = '"';
        i++;
        while (i < json.length && json[i] !== '"') {
          if (json[i] === '\\') {
            str += json[i++];
            if (i < json.length) str += json[i++];
          } else {
            str += json[i++];
          }
        }
        if (i < json.length) str += json[i++];

        // check if this string is a key (followed by colon)
        let j = i;
        while (j < json.length && /\s/.test(json[j])) j++;
        if (j < json.length && json[j] === ':') {
          tokens.push({ type: 'key', text: str });
        } else {
          tokens.push({ type: 'string', text: str });
        }
        continue;
      }

      // numbers
      if (/[-\d]/.test(ch)) {
        let num = '';
        while (i < json.length && /[-\d.eE+]/.test(json[i])) {
          num += json[i++];
        }
        tokens.push({ type: 'number', text: num });
        continue;
      }

      // true/false/null
      if ('tfn'.includes(ch)) {
        let word = '';
        while (i < json.length && /[a-z]/.test(json[i])) {
          word += json[i++];
        }
        if (word === 'true' || word === 'false') {
          tokens.push({ type: 'bool', text: word });
        } else if (word === 'null') {
          tokens.push({ type: 'null', text: word });
        } else {
          tokens.push({ type: 'key', text: word });
        }
        continue;
      }

      tokens.push({ type: 'key', text: ch });
      i++;
    }

    return { tokens, valid };
  } catch {
    return { tokens: [{ type: 'key', text: json }], valid: false };
  }
}

/**
 * JSON 编辑器，支持语法高亮和实时校验。
 * 通过叠加 textarea（透明）和 pre 层实现语法着色。
 */
export default function JsonEditor({ value, onChange, rows = 20, readOnly, style }: JsonEditorProps) {
  const [focused, setFocused] = useState(false);
  const { tokens, valid } = useMemo(() => tokenize(value), [value]);

  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${valid ? (focused ? '#1677ff' : '#d9d9d9') : '#ff4d4f'}`,
        borderRadius: 6,
        transition: 'border-color 0.2s',
        ...style,
      }}
    >
      {/* 语法高亮层 */}
      <pre
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          margin: 0,
          padding: '8px 12px',
          fontFamily: 'Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: '20px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          overflow: 'hidden',
          pointerEvents: 'none',
          color: 'transparent',
        }}
      >
        <code>
          {tokens.map((t, i) => (
            <span key={i} style={{ color: COLORS[t.type] }}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>

      {/* 透明编辑层 */}
      <TextArea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        readOnly={readOnly}
        rows={rows}
        spellCheck={false}
        style={{
          position: 'relative',
          fontFamily: 'Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: '20px',
          color: 'transparent',
          caretColor: '#000',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          resize: 'vertical',
          padding: '8px 12px',
          borderRadius: 0,
        }}
      />

      {!valid && (
        <div style={{ padding: '4px 12px', fontSize: 12, color: '#ff4d4f', borderTop: '1px solid #ffccc7', background: '#fff2f0' }}>
          JSON 格式错误
        </div>
      )}
    </div>
  );
}
