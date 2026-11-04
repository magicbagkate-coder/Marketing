import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const TOOL_TIMEOUT_MS = 90_000;
const MAX_OUTPUT_BYTES = 5_000_000;
const FRAME_WIDTH = 720;

export type VideoInfo = {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
};

export type FrameRequest = {
  inputPath: string;
  second: number;
  outputPath: string;
};

type ProbeStream = { codec_type?: string; width?: number; height?: number };
type ProbeOutput = { streams?: ProbeStream[]; format?: { duration?: string } };

const isVideoStream = (stream: ProbeStream): boolean => stream.codec_type === 'video';
const isAudioStream = (stream: ProbeStream): boolean => stream.codec_type === 'audio';

function readDuration(output: ProbeOutput): number {
  const seconds = Number(output.format?.duration);
  return Number.isFinite(seconds) ? seconds : 0;
}

function readSize(stream: ProbeStream | undefined): { width: number; height: number } {
  return { width: stream?.width ?? 0, height: stream?.height ?? 0 };
}

/** Turns ffprobe JSON output into the few facts we need. */
export function parseProbe(output: ProbeOutput): VideoInfo {
  const streams = output.streams ?? [];
  return { durationSec: readDuration(output), ...readSize(streams.find(isVideoStream)), hasAudio: streams.some(isAudioStream) };
}

export async function probeVideo(filePath: string): Promise<VideoInfo> {
  const args = ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', filePath];
  const { stdout } = await execFileAsync('ffprobe', args, { timeout: TOOL_TIMEOUT_MS, maxBuffer: MAX_OUTPUT_BYTES });
  return parseProbe(JSON.parse(stdout) as ProbeOutput);
}

export async function extractFrame(request: FrameRequest): Promise<void> {
  const args = ['-y', '-v', 'error', '-ss', String(request.second), '-i', request.inputPath, '-frames:v', '1', '-vf', `scale=${FRAME_WIDTH}:-2`, '-q:v', '4', request.outputPath];
  await execFileAsync('ffmpeg', args, { timeout: TOOL_TIMEOUT_MS });
}

/** Extracts the sound as a small mono mp3, good enough for speech recognition. */
export async function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  const args = ['-y', '-v', 'error', '-i', inputPath, '-vn', '-ac', '1', '-ar', '16000', '-b:a', '48k', outputPath];
  await execFileAsync('ffmpeg', args, { timeout: TOOL_TIMEOUT_MS });
}
