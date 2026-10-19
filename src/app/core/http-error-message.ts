export function httpErrorMessage(error: unknown, context: 'login' | 'tasks'): string {
  const timeout = typeof error === 'object' && error !== null &&
    'code' in error && error.code === 'ECONNABORTED';
  console.error(context + ': ' + (timeout ? 'timeout' : 'request-failed'));
  if (timeout) {
    return 'La solicitud tardó demasiado. Inténtalo de nuevo.';
  }
  return context === 'login'
    ? 'No se pudo iniciar sesión. Verifica tus datos e inténtalo de nuevo.'
    : 'No se pudieron cargar las tareas. Inténtalo de nuevo.';
}
