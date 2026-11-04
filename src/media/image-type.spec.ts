import { detectImageType } from '@/media/image-type';

describe('detectImageType', () => {
  it('recognises PNG, GIF and WebP by their signatures', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe('image/png');
    expect(detectImageType(Buffer.from('GIF89a'))).toBe('image/gif');
    expect(detectImageType(Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]))).toBe('image/webp');
  });

  it('falls back to JPEG, which is what Telegram photos are', () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(detectImageType(Buffer.from('RIFF....WAVE'))).toBe('image/jpeg');
  });
});
