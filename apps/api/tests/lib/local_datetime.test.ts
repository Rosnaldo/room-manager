import { describe, expect, it } from 'vitest';

import { formatInTimeZone, isLocalDateTime, minutesBetween } from '../../src/lib/local_datetime';

describe('local date-time helpers', () => {
  it.each(['2030-01-20T10:00:00', '2028-02-29T23:59:59', '2030-12-31T00:00:00'])('accepts %s', (v) => {
    expect(isLocalDateTime(v)).toBe(true);
  });

  it.each([
    ['date only', '2030-01-20'],
    ['no seconds', '2030-01-20T10:00'],
    ['timezone suffix', '2030-01-20T10:00:00Z'],
    ['offset suffix', '2030-01-20T10:00:00-03:00'],
    ['milliseconds', '2030-01-20T10:00:00.000'],
    ['space separator', '2030-01-20 10:00:00'],
    ['Feb 30', '2030-02-30T10:00:00'],
    ['Feb 29 on a non-leap year', '2029-02-29T10:00:00'],
    ['hour 24', '2030-01-20T24:00:00'],
    ['minute 60', '2030-01-20T10:60:00'],
    ['month 13', '2030-13-01T10:00:00'],
  ])('rejects %s', (_case, v) => {
    expect(isLocalDateTime(v)).toBe(false);
  });

  it('counts minutes between two wall-clock times, across days', () => {
    expect(minutesBetween('2030-01-20T10:00:00', '2030-01-20T10:15:00')).toBe(15);
    expect(minutesBetween('2030-01-20T23:00:00', '2030-01-21T01:30:00')).toBe(150);
    expect(minutesBetween('2030-01-20T11:00:00', '2030-01-20T10:00:00')).toBe(-60);
  });

  it('formats an instant as wall-clock time in a timezone', () => {
    const instant = new Date('2030-01-15T12:00:00Z');
    expect(formatInTimeZone(instant, 'America/Sao_Paulo')).toBe('2030-01-15T09:00:00');
    expect(formatInTimeZone(instant, 'UTC')).toBe('2030-01-15T12:00:00');
    expect(formatInTimeZone(new Date('2030-01-15T00:30:00Z'), 'UTC')).toBe('2030-01-15T00:30:00');
  });
});
