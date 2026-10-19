import { Injectable } from '@angular/core';
import merge from 'lodash/merge';
import { Preferences, SessionUser } from './models';

const KEYS = {
  token: 'workshop_token',
  user: 'workshop_user',
  preferences: 'workshop_preferences'
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  private token: string | null = null;
  private user: SessionUser = {};
  storageWarning = '';

  constructor() {
    this.removeLegacySession();
  }

  private removeLegacySession(): void {
    this.storageWarning = '';
    try {
      localStorage.removeItem(KEYS.token);
      localStorage.removeItem(KEYS.user);
    } catch {
      this.storageWarning = 'No se pudieron eliminar los datos de sesión anteriores del navegador.';
      console.error('Legacy session cleanup failed');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): SessionUser {
    return this.user;
  }

  getPreferences(): Preferences {
    const preferences: Preferences = { theme: 'light', showTips: true, compact: false };
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(KEYS.preferences) || '{}');
      return merge(preferences, saved);
    } catch (error) {
      console.log('Preferences could not be loaded', error);
      return preferences;
    }
  }

  save(token: string, user: SessionUser, preferences: Preferences): void {
    localStorage.setItem(KEYS.preferences, JSON.stringify(preferences));
    this.token = token;
    this.user = user;
  }

  clear(): void {
    this.token = null;
    this.user = {};
    this.removeLegacySession();
  }
}
