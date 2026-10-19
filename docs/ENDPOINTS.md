# Contrato consumido y flujo funcional del frontend

Documento generado mediante lectura del frontend porque no existía este archivo. Describe lo que el cliente envía y espera; no certifica la implementación, validación de permisos, CORS ni respuestas reales de servicios externos. No se inspeccionaron otros componentes del workspace ni se hicieron peticiones HTTP.

## Componentes y dependencias

| Pieza | Responsabilidad y conexiones | Evidencia |
|---|---|---|
| Arranque y contenedor | `bootstrapApplication` registra el router; `AppComponent` aloja el `RouterOutlet`. | [src/main.ts](../src/main.ts), [src/app/app.component.ts](../src/app/app.component.ts) |
| Rutas | `/login` y `/dashboard` cargan componentes de forma diferida. La ruta vacía y las desconocidas redirigen a `/login`. No se declaran guards; dashboard comprueba la presencia del token al inicializarse. | [src/app/app.routes.ts:3](../src/app/app.routes.ts#L3), [src/app/dashboard/dashboard.component.ts:35](../src/app/dashboard/dashboard.component.ts#L35) |
| Login | Usa `CommonModule`, `FormsModule`, `Router`, Axios y `lodash/merge`. Maneja credenciales, preferencias, mensajes, HTTP, almacenamiento y navegación. | [src/app/login/login.component.ts:1](../src/app/login/login.component.ts#L1), [src/app/login/login.component.html](../src/app/login/login.component.html) |
| Dashboard | Usa `CommonModule`, `Router`, Axios, `NgZone`, `ChangeDetectorRef` y `formatTaskLabel`. Recupera sesión, consulta tareas, prepara la vista y cierra sesión. | [src/app/dashboard/dashboard.component.ts:1](../src/app/dashboard/dashboard.component.ts#L1), [src/app/dashboard/dashboard.component.html](../src/app/dashboard/dashboard.component.html) |
| Utilidad | `formatTaskLabel` produce prioridad y responsable en mayúsculas, con valores por defecto `NORMAL`, `SIN-ASIGNAR` o `SIN-DATOS` para tarea ausente. | [src/app/utils/legacy-format.ts:1](../src/app/utils/legacy-format.ts#L1) |
| Dependencias declaradas | Angular 21.2.19; Axios 0.31.0; Lodash 4.17.21; RxJS 7.8.2; tslib 2.8.1; zone.js 0.15.1. Herramientas: Angular CLI/build/compiler-cli 21.2.19, TypeScript 5.9.3, Vitest y coverage-v8 3.2.4, tipos de Lodash 4.17.20. Son versiones declaradas, no una auditoría del árbol instalado. | [package.json:12](../package.json#L12), [package.json:25](../package.json#L25) |

## Endpoints

### Autenticación

- **Método y URL:** `POST http://localhost:8080/auth/login`.
- **Cuerpo:** `{ username, password, client: 'angular-workshop' }`. Las credenciales se envían tal como están en el estado del componente; `trim()` solo interviene en la comprobación de campos vacíos.
- **Configuración:** timeout de 5000 ms; la llamada no agrega un encabezado Bearer.
- **Respuesta esperada por el cliente:** objeto con `token` y `user`. Solo se comprueba que `token` sea verdadero; no se validan el tipo de token ni la estructura de usuario antes de guardarlos.
- **Usuario consumido posteriormente:** `username` para consultar tareas y `displayName` o `username` para el saludo.
- **Errores:** si falta token, se muestra el mensaje correspondiente y no se navega. Ante una excepción se usa `error.response.data.message`, luego `error.message` y finalmente un texto por defecto. Se restablece `busy` en `finally`.
- **Evidencia:** [src/app/login/login.component.ts:33](../src/app/login/login.component.ts#L33), [src/app/login/login.component.ts:41](../src/app/login/login.component.ts#L41), [src/app/login/login.component.ts:46](../src/app/login/login.component.ts#L46), [src/app/login/login.component.ts:54](../src/app/login/login.component.ts#L54), [src/app/dashboard/dashboard.component.html:6](../src/app/dashboard/dashboard.component.html#L6).

### Consulta de tareas

- **Método y URL:** `GET http://localhost:8000/api/tasks?owner=<username>`.
- **Construcción actual:** concatena `user.username` o una cadena vacía; no codifica expresamente el valor del parámetro.
- **Encabezado:** `Authorization: Bearer <token>`, tomado de `workshop_token`.
- **Respuesta esperada por el cliente:** arreglo directo en `response.data`, no un objeto envolvente. La vista consume `title`, `description`, `status`, `priority` y `owner`; no se comprueba el esquema.
- **Transformación:** conserva todas las tareas en `tasks`, excluye de `visibleTasks` las que tienen exactamente `status === 'ARCHIVED'`, añade `label` con la utilidad y ordena con el comparador actual `a.priority > b.priority ? -1 : 1`. No se presupone una jerarquía semántica de prioridades.
- **Presentación:** el texto de estado contempla `TODO`, `IN_PROGRESS`, `DONE`, `RESUELTO` y `COMPLETED`; si no hay equivalencia conserva el valor recibido. La clase CSS usa el estado en minúsculas.
- **Errores:** se usa `error.response.data.detail`, luego `error.message` y finalmente un texto por defecto. Se termina la carga y se muestra el error; no hay tratamiento particular de 401/403, borrado de sesión ni redirección en ese `catch`.
- **Evidencia:** [src/app/dashboard/dashboard.component.ts:7](../src/app/dashboard/dashboard.component.ts#L7), [src/app/dashboard/dashboard.component.ts:43](../src/app/dashboard/dashboard.component.ts#L43), [src/app/dashboard/dashboard.component.ts:46](../src/app/dashboard/dashboard.component.ts#L46), [src/app/dashboard/dashboard.component.ts:65](../src/app/dashboard/dashboard.component.ts#L65), [src/app/dashboard/dashboard.component.html](../src/app/dashboard/dashboard.component.html).

## Flujo que debe preservarse

1. **Entrar a login.** El constructor intenta leer `workshop_preferences`, analizar su JSON y combinarlo con `{ theme: 'light', showTips: true, compact: false }` mediante `merge`. Si falla, registra el error en consola. Evidencia: [src/app/login/login.component.ts:20](../src/app/login/login.component.ts#L20).
2. **Validar y autenticar.** El botón llama a `login()`. Se rechaza usuario o contraseña nulos, indefinidos o vacíos tras `trim()`. Durante la petición `busy` deshabilita el botón; los mensajes se muestran mediante `[innerHTML]`. Evidencia: [src/app/login/login.component.ts:31](../src/app/login/login.component.ts#L31), [src/app/login/login.component.html:34](../src/app/login/login.component.html#L34), [src/app/login/login.component.html:39](../src/app/login/login.component.html#L39).
3. **Guardar sesión y navegar.** Con token verdadero se guarda `workshop_token`, `workshop_user` como JSON y `workshop_preferences` como JSON, en ese orden; después se navega a `/dashboard`. Evidencia: [src/app/login/login.component.ts:46](../src/app/login/login.component.ts#L46).
4. **Recuperar sesión.** Dashboard lee el token y analiza el JSON de `workshop_user` (o `{}`). Luego, si falta token, navega a `/login` y no consulta tareas. El análisis de usuario ocurre antes del control de token y fuera del `try`; JSON corrupto puede interrumpir la inicialización. Evidencia: [src/app/dashboard/dashboard.component.ts:35](../src/app/dashboard/dashboard.component.ts#L35).
5. **Consultar y mostrar tareas.** Con token presente se hace el GET indicado, se filtra y ordena la lista visible, y se actualiza la vista dentro de `zone.run` con `detectChanges`. En error se actualiza el mensaje y se finaliza la carga de la misma forma. La plantilla distingue carga, error, lista y lista vacía. Evidencia: [src/app/dashboard/dashboard.component.ts:43](../src/app/dashboard/dashboard.component.ts#L43), [src/app/dashboard/dashboard.component.ts:59](../src/app/dashboard/dashboard.component.ts#L59), [src/app/dashboard/dashboard.component.html](../src/app/dashboard/dashboard.component.html).
6. **Cerrar sesión.** El botón elimina `workshop_token` y `workshop_user`, conserva `workshop_preferences` y navega a `/login`. No se realiza ninguna petición de logout o revocación; no se infiere que el servidor invalide el token. Evidencia: [src/app/dashboard/dashboard.component.html:9](../src/app/dashboard/dashboard.component.html#L9), [src/app/dashboard/dashboard.component.ts:74](../src/app/dashboard/dashboard.component.ts#L74).

## Límites de verificación y riesgos al refactorizar

Conservar métodos, URLs `/auth/login` y `/api/tasks`, cuerpo del login, encabezado Bearer, formas de respuesta consumidas, mensajes de error específicos de cada API, navegación, persistencia de preferencias y reglas actuales de presentación. Un cambio intencional en almacenamiento, sanitización, validación o manejo de sesión requiere pruebas explícitas del comportamiento nuevo.

La existencia y autorización efectiva de los servicios, expiración o revocación del token y compatibilidad CORS requieren coordinación externa sin inspeccionar ni modificar otros repositorios. Este mapa no demuestra que los servicios estén disponibles ni que acepten el contrato.
