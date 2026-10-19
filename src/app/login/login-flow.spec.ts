import '@angular/compiler';
import 'zone.js';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { LoginComponent } from './login.component';
import { AuthService } from '../core/auth.service';
import { SessionService } from '../core/session.service';
import { TasksService } from '../core/tasks.service';

vi.mock('axios', () => ({
  default: { post: vi.fn(), get: vi.fn() }
}));

vi.mock('@angular/router', () => ({
  Router: class {
    navigate = vi.fn(async () => true);
  }
}));

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
}

describe('login and tasks contract', () => {
  const user = { username: 'student', displayName: 'Student' };
  const router = new Router();
  const navigate = vi.mocked(router.navigate);
  const detectChanges = vi.fn();
  const cdr: ChangeDetectorRef = {
    detectChanges,
    markForCheck: vi.fn(),
    detach: vi.fn(),
    checkNoChanges: vi.fn(),
    reattach: vi.fn()
  };
  const zone = new NgZone({ enableLongStackTrace: false });
  let storage: MemoryStorage;
  const auth = new AuthService();
  let session: SessionService;
  const tasksService = new TasksService();

  function createDashboard(): DashboardComponent {
    return new DashboardComponent(router, cdr, zone, session, tasksService);
  }

  function authenticatedDashboard(): DashboardComponent {
    session.save('test-token', user, session.getPreferences());
    return createDashboard();
  }

  function validLogin(): LoginComponent {
    const login = new LoginComponent(router, auth, session, zone, cdr);
    login.username = user.username;
    login.password = 'test-password';
    return login;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    storage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    session = new SessionService();
    navigate.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('logs in, loads tasks with the saved token and logs out preserving preferences', async () => {
    const login = validLogin();
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user } });
    await login.login();
    expect(axios.post).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'test-password', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(session.getToken()).toBe('test-token');
    expect(session.getUser()).toEqual(user);
    expect(storage.getItem('workshop_token')).toBeNull();
    expect(storage.getItem('workshop_user')).toBeNull();
    expect(navigate).toHaveBeenLastCalledWith(['/dashboard']);
    expect(login.busy).toBe(false);
    const preferences = storage.getItem('workshop_preferences');
    expect(preferences).not.toBeNull();

    const tasks = [
      { title: 'First', priority: 'A', owner: 'student', status: 'TODO' },
      { title: 'Hidden', priority: 'Z', owner: 'student', status: 'ARCHIVED' },
      { title: 'Second', priority: 'B', owner: 'trainer', status: 'DONE' }
    ];
    detectChanges.mockClear();
    vi.mocked(axios.get).mockResolvedValue({ data: tasks });
    const dashboard = createDashboard();
    await dashboard.ngOnInit();
    expect(axios.get).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8000/api/tasks?owner=student',
      { headers: { Authorization: 'Bearer test-token' } }
    );
    expect(dashboard.tasks).toHaveLength(3);
    expect(dashboard.visibleTasks.map(task => task.title)).toEqual(['Second', 'First']);
    expect(dashboard.visibleTasks.map(task => task.label)).toEqual(['B · TRAINER', 'A · STUDENT']);
    expect(dashboard.loading).toBe(false);
    expect(dashboard.error).toBe('');
    expect(detectChanges).toHaveBeenCalledOnce();
    await dashboard.logout();
    expect(session.getToken()).toBeNull();
    expect(storage.getItem('workshop_token')).toBeNull();
    expect(storage.getItem('workshop_user')).toBeNull();
    expect(storage.getItem('workshop_preferences')).toBe(preferences);
    expect(navigate).toHaveBeenLastCalledWith(['/login']);
  });

  it('persists before navigation, waits for tasks and logs out without additional HTTP', async () => {
    navigate.mockImplementation(async commands => {
      if (commands[0] === '/dashboard') {
        expect(session.getToken()).toBe('test-token');
        expect(session.getUser()).toEqual(user);
        expect(storage.getItem('workshop_preferences')).not.toBeNull();
        expect(axios.get).not.toHaveBeenCalled();
      }
      return true;
    });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user } });
    await validLogin().login();
    let complete!: (response: { data: [] }) => void;
    vi.mocked(axios.get).mockImplementation(() => {
      expect(session.getToken()).toBe('test-token');
      return new Promise(resolve => { complete = resolve; });
    });
    const dashboard = createDashboard();
    const pending = dashboard.ngOnInit();
    expect(dashboard.loading).toBe(true);
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks?owner=student',
      { headers: { Authorization: 'Bearer test-token' } }
    );
    complete({ data: [] });
    await pending;
    expect(dashboard.loading).toBe(false);
    await dashboard.logout();
    expect(axios.post).toHaveBeenCalledOnce();
    expect(axios.get).toHaveBeenCalledOnce();
  });

  it.each(['', '   ', null, undefined])('rejects empty username %s without HTTP', async username => {
    const login = validLogin();
    Reflect.set(login, 'username', username);
    await login.login();
    expect(login.message).toContain('Ingrese un usuario.');
    expect(login.busy).toBe(false);
    expect(axios.post).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each(['', '   ', null, undefined])('rejects empty password %s without HTTP', async password => {
    const login = validLogin();
    Reflect.set(login, 'password', password);
    await login.login();
    expect(login.message).toContain('Ingrese una contraseña.');
    expect(axios.post).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([{}, { token: '' }])('does not save or navigate when token is missing: %j', async data => {
    const login = validLogin();
    vi.mocked(axios.post).mockResolvedValue({ data });
    await login.login();
    expect(login.message).toContain('El backend respondió sin token.');
    expect(storage.getItem('workshop_token')).toBeNull();
    expect(login.busy).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps loading active until login settles and sends untrimmed credentials', async () => {
    let complete = (_response: { data: { token: string; user: typeof user } }): void => {};
    vi.mocked(axios.post).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const login = validLogin();
    login.username = ' student ';
    login.password = ' password ';
    const pending = login.login();
    expect(login.busy).toBe(true);
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      { username: ' student ', password: ' password ', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    complete({ data: { token: 'test-token', user } });
    await pending;
    expect(login.busy).toBe(false);
  });

  it.each([
    ['backend down', { message: 'Network Error' }, 'No se pudo iniciar sesión.'],
    ['timeout', { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' }, 'La solicitud tardó demasiado.'],
    ['backend rejection', { response: { data: { message: 'Credenciales inválidas' } } }, 'No se pudo iniciar sesión.'],
    ['unknown error', {}, 'No se pudo iniciar sesión.']
  ])('finishes login and reports %s without creating a session', async (_name, error, message) => {
    vi.mocked(axios.post).mockRejectedValue(error);
    const login = validLogin();
    await login.login();
    expect(login.message).toContain(message);
    expect(login.busy).toBe(false);
    expect(storage.getItem('workshop_token')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/^login: (timeout|request-failed)$/));
    expect(session.getToken()).toBeNull();
  });

  it('returns to login without requesting tasks when there is no token', async () => {
    const dashboard = createDashboard();
    await dashboard.ngOnInit();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it.each([['A', 'B'], ['B', 'A']])('preserves descending comparison for %s then %s', async (first, second) => {
    const dashboard = authenticatedDashboard();
    vi.mocked(axios.get).mockResolvedValue({
      data: [first, second].map(priority => ({ priority, status: 'TODO' }))
    });
    await dashboard.ngOnInit();
    expect(dashboard.visibleTasks.map(task => task.priority)).toEqual(['B', 'A']);
  });

  it('handles an empty task list and absent username', async () => {
    session.save('test-token', {}, session.getPreferences());
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const dashboard = createDashboard();
    await dashboard.ngOnInit();
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/tasks?owner=',
      { headers: { Authorization: 'Bearer test-token' } }
    );
    expect(dashboard.visibleTasks).toEqual([]);
    expect(dashboard.loading).toBe(false);
    expect(dashboard.error).toBe('');
  });

  it.each([
    ['backend down', { message: 'Network Error' }, 'No se pudieron cargar las tareas. Inténtalo de nuevo.'],
    ['invalid token', { response: { status: 401, data: { detail: 'Token inválido' } } }, 'No se pudieron cargar las tareas. Inténtalo de nuevo.'],
    ['forbidden', { response: { status: 403, data: { detail: 'Acceso denegado' } } }, 'No se pudieron cargar las tareas. Inténtalo de nuevo.'],
    ['timeout rejection', { code: 'ECONNABORTED', message: 'timeout exceeded' }, 'La solicitud tardó demasiado. Inténtalo de nuevo.'],
    ['unknown error', {}, 'No se pudieron cargar las tareas. Inténtalo de nuevo.']
  ])('finishes task loading and reports %s', async (_name, error, message) => {
    const dashboard = authenticatedDashboard();
    vi.mocked(axios.get).mockRejectedValue(error);
    await dashboard.ngOnInit();
    expect(dashboard.error).toBe(message);
    expect(dashboard.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['TODO', 'Por hacer'], ['IN_PROGRESS', 'En progreso'], ['DONE', 'Completado'],
    ['RESUELTO', 'Resuelto'], ['COMPLETED', 'Completado'], ['todo', 'Por hacer'],
    ['CUSTOM', 'CUSTOM'], ['', '']
  ])('labels status %s as %s', (status, label) => {
    expect(authenticatedDashboard().statusLabel(status)).toBe(label);
  });

  it('renders an absent status as empty text', () => {
    expect(authenticatedDashboard().statusLabel(undefined)).toBe('');
  });

  it('merges saved preferences with defaults', () => {
    storage.setItem('workshop_preferences', JSON.stringify({ compact: true }));
    expect(validLogin().preferences).toEqual({ theme: 'light', showTips: true, compact: true });
  });

  it('reports corrupt preferences while retaining defaults', () => {
    storage.setItem('workshop_preferences', '{');
    expect(validLogin().preferences).toEqual({ theme: 'light', showTips: true, compact: false });
    expect(console.log).toHaveBeenCalledWith('Preferences could not be loaded', expect.any(SyntaxError));
  });
});
