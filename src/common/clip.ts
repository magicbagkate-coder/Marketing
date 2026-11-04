/** Shortens a text to `limit` characters, adding an ellipsis when something was cut. */
export function clip(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}
