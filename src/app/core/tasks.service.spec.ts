import '@angular/compiler';
import axios from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['student', ''])('preserves owner %s, Bearer and the direct array', async owner => {
    const data = [{ priority: 'HIGH', status: 'TODO' }];
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data });
    expect(await new TasksService().load(owner, 'unit-token')).toBe(data);
    expect(get).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8000/api/tasks?owner=' + owner,
      { headers: { Authorization: 'Bearer unit-token' } }
    );
  });

  it('propagates token rejection without changing the contract', async () => {
    const error = { response: { status: 401, data: { detail: 'Invalid token' } } };
    vi.spyOn(axios, 'get').mockRejectedValue(error);
    await expect(new TasksService().load('student', 'invalid')).rejects.toBe(error);
  });
});
