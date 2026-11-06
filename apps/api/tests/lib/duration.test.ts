import { describe, expect, it } from 'vitest';

import { durationToMinutes, formatMinutes } from '../../src/lib/duration';

describe('HH:mm durations', () => {
  it.each([
    ['00:15', 15],
    ['01:30', 90],
    ['04:00', 240],
    ['23:59', 1439],
  ])('%s is %i minutes', (value, minutes) => {
    expect(durationToMinutes(value)).toBe(minutes);
  });

  it.each(['4:00', '24:00', '01:60', '04:00:00', '240:00', '', 'abc'])('rejects %j', (value) => {
    expect(durationToMinutes(value)).toBeUndefined();
  });

  it.each([
    [240, '4h'],
    [90, '1h30min'],
    [65, '1h05min'],
    [45, '45min'],
  ])('labels %i minutes as %s', (minutes, label) => {
    expect(formatMinutes(minutes)).toBe(label);
  });
});
