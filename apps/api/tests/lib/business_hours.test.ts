import { describe, expect, it } from 'vitest';

import { endsWithinHours, isWeekday, startsWithinHours } from '../../src/lib/business_hours';

describe('business hours helpers', () => {
  it.each([
    ['2030-01-21T10:00:00', true], // Monday
    ['2030-01-25T10:00:00', true], // Friday
    ['2030-01-26T10:00:00', false], // Saturday
    ['2030-01-27T10:00:00', false], // Sunday
    ['2028-02-29T10:00:00', true], // Tuesday, leap day
  ])('isWeekday(%s) = %s', (v, expected) => {
    expect(isWeekday(v)).toBe(expected);
  });

  it.each([
    ['2030-01-21T07:59:59', false],
    ['2030-01-21T08:00:00', true],
    ['2030-01-21T19:59:59', true],
    ['2030-01-21T20:00:00', false],
  ])('startsWithinHours(%s) = %s', (v, expected) => {
    expect(startsWithinHours(v)).toBe(expected);
  });

  it.each([
    ['2030-01-21T20:00:00', true],
    ['2030-01-21T20:00:01', false],
    ['2030-01-22T09:00:00', false], // next day
  ])('endsWithinHours(start 10:00, %s) = %s', (end, expected) => {
    expect(endsWithinHours('2030-01-21T10:00:00', end)).toBe(expected);
  });
});
