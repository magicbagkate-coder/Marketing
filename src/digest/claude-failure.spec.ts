import { describeClaudeFailure } from '@/digest/claude-failure';
import { NOTICE_GENERIC, NOTICE_INVALID_KEY, NOTICE_LOW_BALANCE } from '@/digest/digest.texts';

describe('describeClaudeFailure', () => {
  it('explains an empty balance', () => {
    const error = new Error('400 {"error":{"message":"Your credit balance is too low to access the Anthropic API"}}');
    expect(describeClaudeFailure(error)).toBe(NOTICE_LOW_BALANCE);
  });

  it('explains a rejected key or a missing key', () => {
    expect(describeClaudeFailure(new Error('401 authentication_error invalid x-api-key'))).toBe(NOTICE_INVALID_KEY);
    expect(describeClaudeFailure(new Error('ANTHROPIC_API_KEY is not set'))).toBe(NOTICE_INVALID_KEY);
  });

  it('falls back to a generic notice for anything else', () => {
    expect(describeClaudeFailure(new Error('529 overloaded'))).toBe(NOTICE_GENERIC);
  });
});
