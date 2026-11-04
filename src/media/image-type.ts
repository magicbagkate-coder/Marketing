export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

const startsWith = (buffer: Buffer, bytes: number[], offset: number = 0): boolean => bytes.every((byte, index) => buffer[offset + index] === byte);

const SIGNATURES: { type: ImageMediaType; matches: (buffer: Buffer) => boolean }[] = [
  { type: 'image/png', matches: (buffer) => startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) },
  { type: 'image/gif', matches: (buffer) => startsWith(buffer, [0x47, 0x49, 0x46, 0x38]) },
  { type: 'image/webp', matches: (buffer) => startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8) },
];

/** Recognises the picture format by its first bytes: Telegram photos are JPEG, but pictures sent as files may be PNG or WebP. */
export function detectImageType(buffer: Buffer): ImageMediaType {
  return SIGNATURES.find((signature) => signature.matches(buffer))?.type ?? 'image/jpeg';
}
