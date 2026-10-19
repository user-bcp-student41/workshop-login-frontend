import '@angular/compiler';
import axios from 'axios';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the exact login contract and returns the unwrapped data', async () => {
    const data = { token: 'unit-token', user: { username: 'student' } };
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data });
    expect(await new AuthService().login({ username: ' student ', password: ' pass ' })).toBe(data);
    expect(post).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8080/auth/login',
      { username: ' student ', password: ' pass ', client: 'angular-workshop' },
      { timeout: 5000 }
    );
  });

  it('propagates the original error without navigation or a success fallback', async () => {
    const error = new Error('Network Error');
    vi.spyOn(axios, 'post').mockRejectedValue(error);
    await expect(new AuthService().login({ username: 'student', password: 'pass' })).rejects.toBe(error);
  });
});
