import { readFileSync, writeFileSync } from 'node:fs';

type EnvValues = { [key: string]: string };

/** Returns the .env text with the given keys replaced (or appended when missing). */
export function applyEnvValues(content: string, values: EnvValues): string {
  const lines = content.split(/\r?\n/);
  const pending = new Set(Object.keys(values));
  const updated = lines.map((line) => {
    const key = line.split('=')[0];
    if (!pending.has(key)) return line;
    pending.delete(key);
    return `${key}=${values[key]}`;
  });
  const appended = [...pending].map((key) => `${key}=${values[key]}`);
  return [...updated.filter((line, index) => line !== '' || index < updated.length - 1), ...appended, ''].join('\n');
}

export function updateEnvFile(filePath: string, values: EnvValues): void {
  writeFileSync(filePath, applyEnvValues(readFileSync(filePath, 'utf8'), values), 'utf8');
}
