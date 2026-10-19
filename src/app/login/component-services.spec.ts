import '@angular/compiler';
import 'zone.js';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../core/auth.service';
import { SessionService } from '../core/session.service';
import { TasksService } from '../core/tasks.service';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { LoginComponent } from './login.component';

vi.mock('@angular/router', () => ({
  Router: class { navigate = vi.fn(async () => true); }
}));

describe('component service boundaries', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { removeItem: vi.fn() });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('lets login orchestrate mocked services and navigation without storage access', async () => {
    const session = new SessionService();
    const preferences = { theme: 'light', showTips: true, compact: false };
    vi.spyOn(session, 'getPreferences').mockReturnValue(preferences);
    const save = vi.spyOn(session, 'save').mockImplementation(() => {});
    const auth = new AuthService();
    const user = { username: 'student' };
    const login = vi.spyOn(auth, 'login').mockResolvedValue({ token: 'unit-token', user });
    const router = new Router();
    const cdr: ChangeDetectorRef = {
      detectChanges: vi.fn(), markForCheck: vi.fn(), detach: vi.fn(),
      checkNoChanges: vi.fn(), reattach: vi.fn()
    };
    const component = new LoginComponent(router, auth, session, new NgZone({}), cdr);
    component.username = 'student';
    component.password = 'test';
    await component.login();
    expect(login).toHaveBeenCalledExactlyOnceWith({ username: 'student', password: 'test' });
    expect(save).toHaveBeenCalledExactlyOnceWith('unit-token', user, preferences);
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/dashboard']);
    expect(component.busy).toBe(false);
    expect(cdr.detectChanges).toHaveBeenCalledOnce();
  });

  it('lets dashboard use mocked services while owning visible state and navigation', async () => {
    const session = new SessionService();
    vi.spyOn(session, 'getToken').mockReturnValue('unit-token');
    vi.spyOn(session, 'getUser').mockReturnValue({ username: 'student' });
    const clear = vi.spyOn(session, 'clear').mockImplementation(() => {});
    const tasks = new TasksService();
    const load = vi.spyOn(tasks, 'load').mockResolvedValue([{ priority: 'A', status: 'TODO' }]);
    const router = new Router();
    const cdr: ChangeDetectorRef = {
      detectChanges: vi.fn(), markForCheck: vi.fn(), detach: vi.fn(),
      checkNoChanges: vi.fn(), reattach: vi.fn()
    };
    const component = new DashboardComponent(
      router, cdr, new NgZone({}), session, tasks
    );
    await component.ngOnInit();
    expect(load).toHaveBeenCalledExactlyOnceWith('student', 'unit-token');
    expect(component.visibleTasks[0].label).toBe('A · SIN-ASIGNAR');
    expect(component.loading).toBe(false);
    await component.logout();
    expect(clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/login']);
  });
});
