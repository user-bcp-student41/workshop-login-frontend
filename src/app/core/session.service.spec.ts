import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let values: Map<string, string>;
  let session: SessionService;

  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => { values.set(key, value); }),
      removeItem: vi.fn((key: string) => { values.delete(key); })
    });
    session = new SessionService();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns absent session and default preferences', () => {
    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toEqual({});
    expect(session.getPreferences()).toEqual({ theme: 'light', showTips: true, compact: false });
  });

  it('replaces legacy persistence with memory scoped to the service instance', () => {
    session.save('memory-token', { username: 'student' }, session.getPreferences());
    expect(session.getToken()).toBe('memory-token');
    expect(new SessionService().getToken()).toBeNull();
    expect(new SessionService().getUser()).toEqual({});
    expect(values.has('workshop_token')).toBe(false);
    expect(values.has('workshop_user')).toBe(false);
  });

  it('persists only preferences and clears the memory session', () => {
    const user = { username: 'student' };
    const preferences = { theme: 'light', showTips: false, compact: true };
    session.save('unit-token', user, preferences);
    expect(vi.mocked(localStorage.setItem).mock.calls).toEqual([
      ['workshop_preferences', JSON.stringify(preferences)]
    ]);
    expect(session.getToken()).toBe('unit-token');
    expect(session.getUser()).toEqual(user);
    expect(session.getPreferences()).toEqual(preferences);
    session.clear();
    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toEqual({});
    expect(values.get('workshop_preferences')).toBe(JSON.stringify(preferences));
  });

  it('preserves merging preferences and reports corrupt JSON', () => {
    values.set('workshop_preferences', JSON.stringify({ compact: true, extra: { tips: false } }));
    expect(session.getPreferences()).toEqual({
      theme: 'light', showTips: true, compact: true, extra: { tips: false }
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    values.set('workshop_preferences', '{');
    expect(session.getPreferences().compact).toBe(false);
    expect(log).toHaveBeenCalledWith('Preferences could not be loaded', expect.any(SyntaxError));
  });

  it('does not hide a failed session write as success', () => {
    const error = new Error('Storage unavailable');
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw error; });
    expect(() => session.save('token', {}, session.getPreferences())).toThrow(error);
    expect(session.getToken()).toBeNull();
    expect(session.getUser()).toEqual({});
  });

  it('removes legacy session keys without touching preferences', () => {
    values.set('workshop_token', 'legacy-token');
    values.set('workshop_user', '{corrupt');
    values.set('workshop_preferences', '{"compact":true}');
    const fresh = new SessionService();
    expect(fresh.getToken()).toBeNull();
    expect(fresh.getUser()).toEqual({});
    expect(values.has('workshop_token')).toBe(false);
    expect(values.has('workshop_user')).toBe(false);
    expect(fresh.getPreferences().compact).toBe(true);
  });

  it('reports blocked cleanup without leaking data or retaining an active session', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(localStorage.removeItem).mockImplementation(() => { throw new Error('secret'); });
    const fresh = new SessionService();
    expect(fresh.storageWarning).not.toBe('');
    expect(log).toHaveBeenCalledWith('Legacy session cleanup failed');
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    fresh.save('private-token', {}, fresh.getPreferences());
    fresh.clear();
    expect(fresh.getToken()).toBeNull();
    expect(fresh.storageWarning).not.toBe('');
  });
});
