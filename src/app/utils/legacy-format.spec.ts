import { describe, expect, it } from 'vitest';
import { formatTaskLabel } from './legacy-format';

describe('formatTaskLabel', () => {
  it('formats priority and owner', () => {
    expect(formatTaskLabel({ priority: 'high', owner: 'student' })).toBe('HIGH · STUDENT');
  });

  it.each([null, undefined])('handles absent task %s', task => {
    expect(formatTaskLabel(task)).toBe('SIN-DATOS');
  });

  it('uses defaults when priority and owner are absent', () => {
    expect(formatTaskLabel({})).toBe('NORMAL · SIN-ASIGNAR');
  });

  it('converts populated values to text', () => {
    expect(formatTaskLabel({ priority: 2, owner: 42 })).toBe('2 · 42');
  });

  it('preserves defaults for empty and null fields', () => {
    expect(formatTaskLabel({ priority: '', owner: null })).toBe('NORMAL · SIN-ASIGNAR');
    expect(formatTaskLabel({ priority: null, owner: '' })).toBe('NORMAL · SIN-ASIGNAR');
  });
});
