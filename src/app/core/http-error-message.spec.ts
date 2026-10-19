import { afterEach, describe, expect, it, vi } from 'vitest';
import { httpErrorMessage } from './http-error-message';

describe('public error messages', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([null, undefined, 'private detail', {}, new Error('private detail'),
    { response: { data: { message: '<b>private detail</b>', detail: 'private detail' } } },
    { code: 'ERR_NETWORK', config: { password: 'private detail' } }
  ])('does not expose unexpected or backend details for %j', error => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(httpErrorMessage(error, 'login')).toBe(
      'No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.'
    );
    expect(httpErrorMessage(error, 'tasks')).toBe(
      'No se pudieron cargar las tareas. Inténtalo de nuevo.'
    );
    expect(log.mock.calls).toEqual([['login: request-failed'], ['tasks: request-failed']]);
  });

  it.each(['login', 'tasks'] as const)('maps a timeout safely in %s', context => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(httpErrorMessage({ code: 'ECONNABORTED', message: 'private' }, context)).toBe(
      'La solicitud tardó demasiado. Inténtalo de nuevo.'
    );
    expect(log).toHaveBeenCalledExactlyOnceWith(context + ': timeout');
  });
});
