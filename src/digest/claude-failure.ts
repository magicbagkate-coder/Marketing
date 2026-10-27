import { NOTICE_GENERIC, NOTICE_INVALID_KEY, NOTICE_LOW_BALANCE } from '@/digest/digest.texts';

type FailureRule = {
  markers: string[];
  notice: string;
};

const FAILURE_RULES: FailureRule[] = [
  { markers: ['credit balance'], notice: NOTICE_LOW_BALANCE },
  { markers: ['authentication', 'invalid x-api-key', 'is not set'], notice: NOTICE_INVALID_KEY },
];

/** Turns a Claude failure into a short explanation for the owner, without leaking technical details. */
export function describeClaudeFailure(error: unknown): string {
  const message = String(error).toLowerCase();
  const rule = FAILURE_RULES.find((entry) => entry.markers.some((marker) => message.includes(marker)));
  return rule ? rule.notice : NOTICE_GENERIC;
}
