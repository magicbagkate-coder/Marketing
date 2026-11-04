import { parseIds } from '@/config/parse-ids';

describe('parseIds', () => {
  it('parses a comma separated list with spaces', () => {
    expect(parseIds('123, 456 ,789')).toEqual([123, 456, 789]);
  });

  it('drops empty, negative and non numeric parts', () => {
    expect(parseIds(',abc,-5,0,42,')).toEqual([42]);
  });

  it('returns an empty list for an empty value', () => {
    expect(parseIds('')).toEqual([]);
  });
});
