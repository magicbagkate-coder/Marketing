import { parseProbe } from '@/media/ffmpeg';

describe('parseProbe', () => {
  it('reads duration, size and audio presence', () => {
    const info = parseProbe({
      streams: [
        { codec_type: 'video', width: 1080, height: 1920 },
        { codec_type: 'audio' },
      ],
      format: { duration: '27.48' },
    });
    expect(info).toEqual({ durationSec: 27.48, width: 1080, height: 1920, hasAudio: true });
  });

  it('copes with a video without sound or metadata', () => {
    expect(parseProbe({ streams: [{ codec_type: 'video', width: 720, height: 1280 }] })).toEqual({
      durationSec: 0,
      width: 720,
      height: 1280,
      hasAudio: false,
    });
    expect(parseProbe({})).toEqual({ durationSec: 0, width: 0, height: 0, hasAudio: false });
  });
});
