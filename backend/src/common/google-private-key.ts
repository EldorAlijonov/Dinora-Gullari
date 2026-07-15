import { createPrivateKey } from 'node:crypto';

export function normalizeGooglePrivateKey(value?: string) {
  if (!value) return '';

  const trimmed = value.trim();
  const keyValue = extractPrivateKeyValue(trimmed);

  return keyValue
    .replace(/^\s*"|"\s*,?\s*$/g, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

export function getGooglePrivateKeyDiagnostics(value?: string) {
  const raw = value || '';
  const normalized = normalizeGooglePrivateKey(raw);
  const diagnostics = {
    rawLength: raw.length,
    normalizedLength: normalized.length,
    hasJsonPrivateKeyField: raw.includes('"private_key"'),
    hasEscapedNewlines: raw.includes('\\n'),
    hasActualNewlines: normalized.includes('\n'),
    startsWithBegin: normalized.startsWith('-----BEGIN PRIVATE KEY-----'),
    endsWithEnd: normalized.endsWith('-----END PRIVATE KEY-----'),
    beginCount: (normalized.match(/-----BEGIN PRIVATE KEY-----/g) || []).length,
    endCount: (normalized.match(/-----END PRIVATE KEY-----/g) || []).length,
    lineCount: normalized ? normalized.split('\n').length : 0,
    opensslReadable: false,
    opensslError: '',
  };

  try {
    createPrivateKey(normalized);
    diagnostics.opensslReadable = true;
  } catch (error) {
    diagnostics.opensslError = error instanceof Error ? error.message : String(error);
  }

  return diagnostics;
}

function extractPrivateKeyValue(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object' && 'private_key' in parsed) {
      return String((parsed as { private_key?: unknown }).private_key || '');
    }
  } catch {
    // The field can also be pasted as a JSON fragment or plain PEM text.
  }

  const jsonFieldMatch = value.match(/"private_key"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (jsonFieldMatch?.[1]) {
    try {
      return JSON.parse(`"${jsonFieldMatch[1]}"`) as string;
    } catch {
      return jsonFieldMatch[1];
    }
  }

  const beginIndex = value.indexOf('-----BEGIN PRIVATE KEY-----');
  const endMarker = '-----END PRIVATE KEY-----';
  const endIndex = value.indexOf(endMarker);
  if (beginIndex >= 0 && endIndex >= beginIndex) {
    return value.slice(beginIndex, endIndex + endMarker.length);
  }

  return value;
}
