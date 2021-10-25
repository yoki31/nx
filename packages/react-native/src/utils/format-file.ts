import { format } from 'prettier';

export function formatFile(content) {
  return format(
    String.raw(content)
      .split('\n')
      .map((line) => line.trim())
      .join('')
      .trim(),
    {
      singleQuote: true,
      parser: 'typescript',
    }
  );
}
