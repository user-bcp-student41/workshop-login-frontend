import { describe, expect, it } from 'vitest';
import { prepareTaskView } from './task-view';

describe('prepareTaskView', () => {
  it.each([['A', 'B'], ['B', 'A']])('sorts %s and %s without mutating source tasks', (first, second) => {
    const tasks = [
      Object.freeze({ priority: first, status: 'TODO', owner: 'student' }),
      Object.freeze({ priority: 'Z', status: 'ARCHIVED' }),
      Object.freeze({ priority: second, status: 'DONE', owner: 'student' })
    ];
    expect(prepareTaskView(tasks).map(task => task.label)).toEqual(['B · STUDENT', 'A · STUDENT']);
    expect(tasks[0].priority).toBe(first);
    expect(tasks[0]).not.toHaveProperty('label');
  });

  it('preserves case-sensitive archived filtering and empty lists', () => {
    expect(prepareTaskView([])).toEqual([]);
    expect(prepareTaskView([{ priority: 'A', status: 'archived' }])).toEqual([
      { priority: 'A', status: 'archived', label: 'A · SIN-ASIGNAR' }
    ]);
  });

  it('keeps label defaults for a task without optional display fields', () => {
    expect(prepareTaskView([{ priority: '', status: '' }])).toEqual([
      { priority: '', status: '', label: 'NORMAL · SIN-ASIGNAR' }
    ]);
  });

  it('preserves labels and comparison fallback for missing priority', () => {
    expect(prepareTaskView([{}, { priority: 'A' }]).map(task => task.label)).toEqual([
      'NORMAL · SIN-ASIGNAR', 'A · SIN-ASIGNAR'
    ]);
    expect(prepareTaskView([{ priority: 'A' }, {}]).map(task => task.label)).toEqual([
      'A · SIN-ASIGNAR', 'NORMAL · SIN-ASIGNAR'
    ]);
  });
});
