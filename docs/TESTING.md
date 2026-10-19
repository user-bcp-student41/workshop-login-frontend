# Pruebas de login y consulta de tareas

## Alcance real

Ejecución: 2026-10-19, rama `day1/prompting`, exclusivamente en este repositorio.

El código inspeccionado sigue teniendo HTTP y sesión dentro de los componentes; no se presupone que el refactor del plan esté implementado. Se agregaron pruebas del flujo actual, sin modificar código de producción, contratos HTTP ni dependencias.

Se usa Vitest en Node, Axios simulado, almacenamiento en memoria por caso, router simulado, un doble completo de `ChangeDetectorRef` y `NgZone` real. No se hacen peticiones a servicios externos. El camino feliz conecta las dos clases mediante la sesión guardada: no es una prueba E2E de navegador ni demuestra renderizado o accesibilidad.

## Matriz de casos implementados

Todas las filas de esta tabla están cubiertas por la ejecución final aprobada. Las variantes parametrizadas cuentan como pruebas individuales.

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login → tareas → logout | Login válido y arreglo con tareas visibles/archivadas | Camino feliz | POST exacto con timeout 5000 ms; guardar token/usuario/preferencias; navegar; GET con owner y Bearer guardado; filtrar ARCHIVED, etiquetar y ordenar; salir elimina sesión y conserva preferencias |
| Login | Usuario vacío, blanco, null o undefined | Borde | Mensaje de usuario requerido; sin HTTP ni navegación |
| Login | Contraseña vacía, blanca, null o undefined | Borde | Mensaje de contraseña requerida; sin HTTP ni navegación |
| Login | Respuesta sin token o con token vacío | Borde | Mensaje de falta de token; sin sesión ni navegación; finaliza busy |
| Login | Promesa aún pendiente y credenciales con espacios | Borde | busy permanece activo hasta resolver; credenciales enviadas sin recortar |
| Login | Backend caído: rechazo con Network Error | Error | Mostrar error según el contrato actual, registrar fallo, terminar busy, no guardar sesión ni navegar |
| Login | Timeout: rechazo ECONNABORTED | Error | Mostrar mensaje de timeout, terminar busy, no crear sesión; el request incluye timeout 5000 |
| Login | Rechazo del backend con message | Error | Mostrar mensaje, registrar fallo, terminar busy, no crear sesión |
| Login | Error sin message ni respuesta | Error | Mensaje por defecto Error desconocido; terminar busy |
| Tareas | Sin token | Borde | Navegar a login y no llamar GET |
| Tareas | Arreglo vacío y usuario ausente | Borde | Consultar owner vacío; lista visible vacía, sin error, carga terminada |
| Tareas | Backend caído: rechazo con Network Error | Error | error contiene mensaje, loading false, solicita actualización de vista |
| Tareas | Token inválido: rechazo HTTP 401 con detail | Error | Mostrar detail y finalizar carga; no redirigir automáticamente, según el contrato actual |
| Tareas | Rechazo HTTP 403 con detail | Error | Mostrar detail y finalizar carga; no navegar |
| Tareas | Rechazo de timeout simulado | Error | Mostrar mensaje de la excepción y finalizar carga |
| Tareas | Error sin detail ni message | Error | Mensaje por defecto de dashboard, carga terminada |
| Tareas | Estados TODO, IN_PROGRESS, DONE, RESUELTO, COMPLETED, minúsculas, desconocido y vacío | Borde | Traducción documentada o estado original cuando no hay equivalencia |
| Preferencias | Valor parcial guardado | Borde | Combinar compact con los defaults existentes |
| Preferencias | JSON corrupto | Error | Registrar el error y conservar preferencias por defecto |
| Etiqueta | Prioridad y responsable presentes | Camino feliz | Texto en mayúsculas |
| Etiqueta | Tarea null/undefined, campos ausentes o valores numéricos | Borde | Defaults documentados o conversión a texto |

### Precisión sobre errores HTTP

[ENDPOINTS.md](./ENDPOINTS.md) documenta un timeout configurado de 5000 ms para login, errores genéricos para ambas llamadas y ausencia de tratamiento especial de 401/403 en tareas. No define códigos propios para caída de red ni promete un timeout del GET.

Los rechazos Network Error, ECONNABORTED y HTTP 401/403 son entradas simuladas al manejo de errores ya documentado, no respuestas reales verificadas de los servidores. El test de timeout de tareas demuestra únicamente el tratamiento de una excepción rechazada: **el GET actual no configura timeout**. No demuestra cancelación de una conexión colgada, temporización real ni validez criptográfica de un token.

## Código de las pruebas

Código completo ejecutado:

- [login-flow.spec.ts](../src/app/login/login-flow.spec.ts): 33 pruebas de clases y flujo integrado por almacenamiento.
- [legacy-format.spec.ts](../src/app/utils/legacy-format.spec.ts): 5 pruebas de la utilidad.
- [vitest.config.ts](../vitest.config.ts): medición explícita de ambos componentes y la utilidad, con mínimo 85% por archivo en líneas, sentencias, funciones y ramas.

Extractos del código ejecutado, sin duplicar los fixtures completos:

```typescript
// Camino feliz: el GET usa la sesión creada por login.
await login.login();
expect(storage.getItem('workshop_token')).toBe('test-token');
const dashboard = new DashboardComponent(router, cdr, zone);
await dashboard.ngOnInit();
expect(axios.get).toHaveBeenCalledExactlyOnceWith(
  'http://localhost:8000/api/tasks?owner=student',
  { headers: { Authorization: 'Bearer test-token' } }
);
expect(dashboard.visibleTasks.map(task => task.title)).toEqual(['Second', 'First']);
```

```typescript
// Borde: token ausente.
vi.mocked(axios.post).mockResolvedValue({ data });
await login.login();
expect(login.message).toContain('El backend respondió sin token.');
expect(storage.getItem('workshop_token')).toBeNull();
expect(login.busy).toBe(false);
expect(navigate).not.toHaveBeenCalled();
```

```typescript
// Errores parametrizados de tareas: caída, 401, 403, timeout y desconocido.
vi.mocked(axios.get).mockRejectedValue(error);
await dashboard.ngOnInit();
expect(dashboard.error).toBe(message);
expect(dashboard.loading).toBe(false);
expect(detectChanges).toHaveBeenCalledOnce();
expect(navigate).not.toHaveBeenCalled();
```

Los casos de mensajes actuales caracterizan lo descrito en el contrato; no certifican que exponer mensajes internos o usar HTML sea seguro. H-01/H-02/H-06 siguen abiertos. No se añadieron pruebas que exijan que se mantengan defectos como el fallo ante JSON de usuario corrupto.

## Comandos y resultados realmente ejecutados

Directorio para todos los comandos:

```powershell
Set-Location 'C:\Users\Usuario\Documents\T56628-junior-cabrera\reqflow-workspace\workshop-login-frontend'
```

| ejecución | comando o herramienta | código de salida | resultado real |
|---|---|---|---|
| Descubrimiento del editor | Herramienta runTests con ambos archivos y coverage | No proporcionado por la herramienta | No encontró tests; no se interpreta como suite aprobada |
| Primera cobertura | npm run test:coverage | 1 | 33 tests aprobados, 1 suite falló por error de sintaxis en la prueba de utilidad |
| Segunda cobertura | npm run test:coverage | 0 | 38 tests aprobados tras corregir sintaxis |
| Primera comprobación estricta | Comando tsc indicado debajo | 2 | Dos conversiones de dobles parciales a Router y ChangeDetectorRef rechazadas; se sustituyeron por router simulado construible y doble completo |
| Comprobación estricta final | Comando tsc indicado debajo | 0 | Sin errores |
| Cobertura final tras corregir los dobles | npm run test:coverage | 0 | 2 archivos y 38 tests aprobados, sin omitidos ni fallos esperados |

Comandos reproducibles:

```powershell
npm run test:coverage
$LASTEXITCODE
npx --no-install tsc --noEmit --strict --experimentalDecorators --moduleResolution bundler --module ES2022 --target ES2022 --skipLibCheck src\app\login\login-flow.spec.ts src\app\utils\legacy-format.spec.ts vitest.config.ts
$LASTEXITCODE
```

### Cobertura final medida con V8

| código de producción medido | sentencias | ramas | funciones | líneas |
|---|---|---|---|---|
| login.component.ts | 100% | 100% | 100% | 100% |
| dashboard.component.ts | 100% | 95.45% | 100% | 100% |
| legacy-format.ts | 100% | 100% | 100% | 100% |
| Total | 100% | 97.91% | 100% | 100% |

Cada archivo supera el 85% en las cuatro métricas. La rama no cubierta reportada pertenece al comparador de prioridades de dashboard, línea 54. El denominador incluye los tres archivos explícitamente, aunque alguno dejara de importarse desde los tests. No representa cobertura de toda la aplicación ni de plantillas: rutas, arranque y HTML no están en esa medición. No hubo modificaciones de producción; se mide el código al que se agregaron pruebas.

El informe se regeneró en `coverage/`; no se reutilizaron números de ejecuciones antiguas. El editor también informó ausencia de diagnósticos en los tres archivos editados al consultarlo; la comprobación estricta posterior es la evidencia final de tipado.

## Fallos, bugs y pendientes separados

### Fallos de herramientas corregidos

El error de sintaxis de la prueba y las conversiones incompletas de los dobles se corrigieron en tests, sin tocar producción ni debilitar el compilador. La ejecución final tiene cero pruebas fallidas, omitidas o marcadas como fallo esperado. El descubrimiento del editor sigue sin estar configurado; se validó con el runner del repositorio.

### Bug preexistente observado por inspección

En [dashboard.component.ts:37](../src/app/dashboard/dashboard.component.ts#L37), `JSON.parse(workshop_user)` está fuera del `try` y antes del control de token. Si contiene JSON corrupto, la inicialización puede rechazar su promesa antes de mostrar error o redirigir. **No se corrigió ni se escribió un test que espere ese rechazo como resultado correcto.**

Prueba de regresión propuesta, aún no implementada: con JSON corrupto, la inicialización debe recuperar una sesión coherente o mostrar un error controlado, sin una promesa rechazada sin tratar; primero debe acordarse la política de recuperación. No afirmar que ese caso ya pasa por tener cobertura alta.

### Pendientes y pruebas propuestas

- Verificación real de plantilla, teclado, anuncios de errores, botón deshabilitado y actualización después de navegar: requiere navegador; no está cubierta por los dobles.
- Disponibilidad real, CORS, validación del token del servidor y temporización de red: no ejecutados; sin acceso a otros componentes.
- Respuestas de tareas con esquema inválido y sesión inválida: definir política explícita antes de añadir expectativas nuevas; el contrato actual no valida esos esquemas.
- La cobertura y los casos de clases mejoran H-04, pero no certifican accesibilidad ni cierre de todos los criterios del plan. El seguimiento permanece en [HALLAZGOS.md](../HALLAZGOS.md).
- No se ejecutó build ni auditoría de dependencias en esta tarea; no hubo cambios de producción o manifiesto. No se instalaron paquetes.

## Documentos consultados

[ENDPOINTS.md](./ENDPOINTS.md), [REGLAS.md](../REGLAS.md), [GOOD_PRACTICES.md](./GOOD_PRACTICES.md), [HALLAZGOS.md](../HALLAZGOS.md) y [PLAN.md](../PLAN.md). Los contratos y estados de los hallazgos no se alteraron.

## Implementación aprobada: H-04 (2026-10-19)

- Antes: `npm run test:coverage`, salida 0, 38 tests verdes.
- Después: mismo comando, salida 0, 39 tests verdes; líneas/sentencias/funciones 100%, ramas 97.87% global y mínimo 95% por archivo.
- Se añadió el caso `persists before navigation, waits for tasks and logs out without additional HTTP`: observa sesión dentro del callback de navegación, token antes del GET, carga pendiente y una sola llamada POST/GET después de logout.
- Navegador integrado en `http://localhost:4200`, sin acceder a otros repositorios: respuestas de ambos endpoints interceptadas mediante `page.route` con JSON y encabezados CORS `Access-Control-Allow-Origin/Headers/Methods: *`.
- Éxito comprobado en DOM: saludo Browser Student, Visible task presente, Archived task ausente y logout vuelve a login. Segundo login con `[]`: texto de lista vacía visible. Tercer login con 401 y `detail`: error visible en dashboard, sin redirección; logout correcto.
- Se observó el botón Ingresando deshabilitado mientras la respuesta estaba pendiente. Dos intentos de añadir demora mediante temporizador dentro del interceptor no completaron a tiempo y el POST fue abortado; esos intentos no se contabilizan como éxito de login. Los escenarios completos anteriores se ejecutaron sin temporizador en el interceptor. No se atribuye esa limitación de la simulación al backend.
- Procedimiento reproducible: interceptar POST con token ficticio y usuario Browser Student, GET con tarea visible/ARCHIVED; introducir credenciales ficticias y comprobar DOM y logout; repetir GET con arreglo vacío y con HTTP 401/detail. Para observar botón pendiente, mantener pendiente la respuesta de POST y comprobar `disabled`, sin afirmar temporización real de red.
- No se modificó producción. Se cerró H-04 antes de iniciar H-05. El patch de H-04 incluye el archivo de flujo completo por ser un archivo previamente no rastreado; sus 33 casos anteriores no se presentan como trabajo nuevo de esta etapa.

## Implementación aprobada: H-05 (2026-10-19)

Esta sección es la evidencia vigente después de la extracción; las secciones anteriores conservan el historial anterior al refactor.

### Caracterización antes y después

Antes de modificar producción se añadieron dos variantes de orden de prioridades (`A,B` y `B,A`) a la suite integrada. `npm run test:coverage` terminó con salida 0: 41 tests verdes y 100% en las cuatro métricas sobre los dos componentes y utilidad. Se preservaron los casos de H-04, incluyendo sesión antes de navegar, carga pendiente y logout sin HTTP.

Después se adaptó esa misma suite para construir AuthService, TasksService y SessionService reales, con Axios y almacenamiento simulados. No se reemplazó por una prueba donde todos los servicios estuvieran simulados. Los tests de componentes con servicios simulados se mantienen separados.

| Prueba de corrección | Archivo | Resultado final |
|---|---|---|
| Contrato POST exacto y propagación del error original | [auth.service.spec.ts](../src/app/core/auth.service.spec.ts) | 2 verdes |
| GET directo, owner normal/vacío, Bearer y rechazo de token | [tasks.service.spec.ts](../src/app/core/tasks.service.spec.ts) | 3 verdes |
| Defaults, orden de escritura, persistencia, logout, merge y fallo de almacenamiento | [session.service.spec.ts](../src/app/core/session.service.spec.ts) | 4 verdes |
| Transformación pura, ambos sentidos del orden, no mutación y ARCHIVED exacto | [task-view.spec.ts](../src/app/core/task-view.spec.ts) | 3 verdes |
| Componentes con dobles de servicios, sin HTTP/almacenamiento directo | [component-services.spec.ts](../src/app/login/component-services.spec.ts) | 2 verdes |
| Contratos y flujo conectado mediante servicios reales | [login-flow.spec.ts](../src/app/login/login-flow.spec.ts) | 36 verdes |
| Etiqueta y defaults | [legacy-format.spec.ts](../src/app/utils/legacy-format.spec.ts) | 5 verdes |

### Ejecuciones reales desde la raíz del componente

Directorio: `C:\Users\Usuario\Documents\T56628-junior-cabrera\reqflow-workspace\workshop-login-frontend`.

| Comando | Salida | Resultado |
|---|---|---|
| `npm run test:coverage` antes de H-05 | 0 | 41 tests verdes, 100% en las cuatro métricas |
| `npm run test:coverage` después de H-05 | 0 | 7 archivos, 55 tests verdes; sin omitidos ni fallos esperados |
| `npm run build` | 0 | Bundle generado; advertencias CommonJS de Axios y lodash/merge conservadas, no silenciadas |
| Comando TypeScript debajo | 0 | Sin errores de tipado estricto en tests, configuración y dependencias de código importadas |

```powershell
npx --no-install tsc --noEmit --strict --experimentalDecorators --moduleResolution bundler --module ES2022 --target ES2022 --skipLibCheck src\app\login\login-flow.spec.ts src\app\login\component-services.spec.ts src\app\core\auth.service.spec.ts src\app\core\tasks.service.spec.ts src\app\core\session.service.spec.ts src\app\core\task-view.spec.ts src\app\utils\legacy-format.spec.ts vitest.config.ts
```

Cobertura final: 100% de líneas, sentencias, funciones y ramas en todos los archivos de producción ejecutables incluidos: componentes login/dashboard, servicios auth/tasks/session, task-view, legacy-format y environment. El denominador se amplió para incluir los archivos extraídos sin reducir los umbrales por archivo del 85%. `models.ts` solo contiene interfaces borradas en compilación: V8 lo lista con ceros sin sentencias/ramas/funciones ejecutables; no se interpreta como lógica sin probar ni se excluye para subir cobertura.

### Navegador después de H-05

Se recargó la aplicación servida en localhost:4200 y se repitieron interceptores sin temporizador. Resultados realmente observados:

- POST simulado válido: navegación, saludo y tarea visibles; ARCHIVED no aparece; logout vuelve a login.
- GET con arreglo vacío: mensaje de lista vacía visible.
- GET con HTTP 401/detail: error visible, permanece en dashboard, logout vuelve a login.

Estos pasos verifican la inyección real de servicios y actualización de Angular después de navegar. Los tests de Node no se presentan como sustituto de esas comprobaciones.

### Diffs y límites conservados

- [H-04.patch](../artifacts/H-04.patch): snapshot de la entrega de pruebas, documentación y cierre de H-04 antes de H-05; incluye el archivo de flujo previamente no rastreado.
- [H-05.patch](../artifacts/H-05.patch): delta respecto al snapshot tomado después de cerrar H-04, no respecto a main. Los prefijos internos `artifacts/baseline-H05` y `artifacts/after-H05` indican los dos lados de la comparación; no son carpetas de producción.
- La función de vista ya no añade label a los objetos originales: produce copias para visibleTasks. La lista original permanece completa; el filtrado, orden y renderizado se mantienen.
- No se cambió docs/ENDPOINTS.md, URLs, cuerpo, timeout, mensajes ni persistencia. No se agregó timeout a GET, recuperación de JSON corrupto ni invalidación remota. No se actualizaron paquetes ni se activó tipado estricto global.
- H-01/H-02/H-03/H-06 continúan pendientes. El bug de JSON de usuario corrupto sigue reportado, no oculto por tests que lo exijan como comportamiento correcto.
- Los errores de navegador con retraso del interceptor descritos en H-04 fueron intentos fallidos de simulación, no tests contabilizados como aprobados. La suite final H-05 y sus escenarios de navegador sin demora no tuvieron fallos.

## H-01: sesión exclusivamente en memoria (2026-10-19)

Política confirmada por el usuario: recargar o abrir otra pestaña requiere login. Preferencias permanecen; no hay renovación ni revocación del servidor.

- Antes: se añadió caracterización de token recuperado por una instancia nueva. `npm run test:coverage`: salida 0, 56 tests y cobertura ejecutable 100%.
- Después: esa expectativa se sustituyó explícitamente por instancia nueva sin sesión, sin escrituras persistentes de token/usuario; se añadieron limpieza heredada y fallo de almacenamiento. Mismo comando: salida 0, 58 tests y 100% de líneas/ramas/funciones/sentencias ejecutables. El snapshot previo en el diff conserva la expectativa anterior.
- El flujo integrado sigue probando sesión disponible antes de navegar y GET pendiente con Bearer correcto. Error de escritura de preferencias no crea sesión parcial. Limpieza bloqueada: aviso público en login y log sin objeto externo ni secretos, sin romper el constructor.
- Navegador: en el servidor de validación propio `http://localhost:4201`, login simulado carga Memory task, localStorage no contiene token/usuario y sí preferencias; recarga redirige a login; segundo login y logout aprobados.
- Intento previo en el servidor ya existente de 4200 falló la comprobación de persistencia. No se atribuyó éxito a ese servidor ni se manipuló su proceso. Se arrancó un servidor desde este componente con `npm start -- --port 4201` y se verificó su respuesta mediante navegador. La herramienta de tareas no admitió crear tarea en esta carpeta; se usó PowerShell. No hubo instalaciones.
- Directorio de los comandos: raíz de workshop-login-frontend. Diff propio: [H-01.patch](../artifacts/H-01.patch). H-01 cerrado antes de iniciar H-02.

## H-02: representación textual y errores públicos

- Baseline: `npm run test:coverage`, salida 0, 58 tests. Conserva el contrato HTTP; reemplaza intencionalmente textos internos y formato HTML por texto público.
- Corrección: mismo comando, salida 0, 67 tests; 100% de las cuatro métricas ejecutables. Nueve casos del helper cubren contextos, timeout y entradas desconocidas, sin cuerpos externos en logs; los casos integrados siguen comprobando carga, ausencia de sesión en fallo y no redirección automática ante 401/403.
- Navegador 4201: usuario `<b>Literal User</b>` y backend 401/message con `<b>private-backend-detail</b>`. Se verificó texto literal del usuario, cero elementos b dentro de la alerta, detalle interno ausente y botón habilitado al terminar.
- Primera comprobación de navegador falló: el log de error existía, pero la UI permanecía Ingresando. Se corrigió el defecto de actualización directamente acoplado a H-02: finally entra en NgZone y solicita detectChanges, como dashboard. Se añadió aserción de detección en el test del componente y se repitió el DOM con éxito. No se ocultó el fallo en tests ni se atribuyó a la sanitización.
- No se usan bypass ni sanitizadores nuevos; no se afirmó XSS explotable previo. Diff propio [H-02.patch](../artifacts/H-02.patch). H-02 cerrado antes de H-03.

## H-03: actualización verificada de dependencias

Fecha: 2026-10-19. Se mantuvo Axios en servicios y el merge profundo de preferencias; no se recortaron datos anidados/extra para poder eliminar Lodash.

### Inventario y fuentes públicas

- `npm ls axios lodash --all`: salida 0, antes Axios 0.31.0/Lodash 4.17.21; después Axios 1.20.0/Lodash 4.18.1.
- `npm view axios version dependencies --json` y `npm view lodash version --json`: salida 0; versiones seleccionadas de acuerdo con el registro público.
- GitHub Advisory API, consultas por nombre y versión, sin subir árbol privado, código ni credenciales. Las respuestas completas se conservan en artifacts/advisories-axios-0.31.0.json, advisories-lodash-4.17.21.json, advisories-axios-1.20.0.json y advisories-lodash-4.18.1.json.
- La API devolvió 24 registros para Axios antiguo y 4 para Lodash antiguo; incluyen entradas duplicadas/retiradas, no equivalen a 28 vulnerabilidades explotables de esta app.
- Ejemplo Axios: [GHSA-3g43-6gmg-66jw](https://github.com/advisories/GHSA-3g43-6gmg-66jw), rangos >=0.19.0 <0.31.1 y >=1.0.0 <1.15.2, requiere contaminación previa del prototipo por otro vector; no se demostró esa precondición en esta app. [GHSA-p92q-9vqr-4j8v](https://github.com/advisories/GHSA-p92q-9vqr-4j8v) afecta al adaptador Node, no al navegador.
- Lodash: [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) afecta a template, corregido en 4.18.0; [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh) a unset/omit, <=4.17.23, corregido en 4.18.0. La app importa merge, no esas funciones: se distingue actualización preventiva del paquete de explotación comprobada.
- Consulta final del subárbol realmente instalado de Axios/Lodash: 27 pares paquete/versión incluidos los transitivos, cero avisos devueltos por esa fuente y fecha. Lista, fuentes y timestamps en [H-03-runtime-advisories.json](../artifacts/H-03-runtime-advisories.json). Se comprobaron enlaces de paginación para no ignorar páginas adicionales.
- No se ejecutó npm audit ni se certificó todo el árbol Angular/dev; no se ocultaron sus posibles avisos o deprecaciones. Cero avisos de esta fuente no garantiza ausencia de vulnerabilidades futuras o desconocidas.

### Instalación: fallos y recuperación reales

Tras modificar el manifiesto, `npm install --ignore-scripts --no-audit --no-fund` y su variante `--package-lock-only` fallaron con salida 1 por error interno de npm leyendo children. Se generó el lockfile con npm en artifacts/npm-resolution usando copia del mismo manifiesto, salida 0; se copió ese archivo generado a la raíz sin editarlo manualmente.

Se detuvo solo el servidor de validación propio antes de restaurar. `npm ci --ignore-scripts --no-audit --no-fund` falló con EPERM (salida -4048) por un ejecutable esbuild bloqueado. No se terminaron procesos ajenos. Un nuevo `npm install --ignore-scripts --no-audit --no-fund` usando el lockfile terminó con salida 0, con advertencias de archivos de limpieza bloqueados y deprecación de uuid/glob. No se elevaron permisos ni se ocultaron avisos. La carpeta temporal de resolución se eliminó al finalizar.

`--no-audit` evita transmitir automáticamente el árbol privado, no reduce el script de auditoría ni sus gates; se realizó la comprobación pública por paquete descrita arriba. `--ignore-scripts` evita ejecutar scripts de instalación innecesarios; build/tests validaron las herramientas instaladas.

### Caracterización y corrección

- Antes y después: `npm run test:coverage`, salida 0, 67 tests verdes y 100% en las cuatro métricas ejecutables; se conservaron contratos POST/GET, errores y merge/defaults con campos extra/anidados y almacenamiento bloqueado.
- `npm run build`: salida 0; advertencia CommonJS de lodash/merge conservada. Axios actualizado ya no produce esa advertencia.
- TypeScript estricto sobre todos los specs y configuración: salida 0 usando el comando anterior y la lista completa de specs.
- Navegador propio 4201 reiniciado con las nuevas dependencias: login y tareas, ARCHIVED oculto, logout; después 401/detail mostrado como error público, detalle privado ausente y logout. Los intentos de click agotaron espera de estabilidad; activación real del botón mediante foco y Enter completó ambos escenarios, sin force ni omitir comprobaciones de estado.
- Diff [H-03.patch](../artifacts/H-03.patch); incluye manifiesto y lockfile. H-03 cerrado antes de iniciar H-06.

## H-06: tipado y comprobaciones estrictas

- Baseline: `npm run test:coverage`, salida 0, 67 tests. Se añadieron caracterizaciones de etiquetas con campos vacíos/null y defaults de vista: 69 tests verdes antes de modificar tipos de producción.
- Después: mismo comando, salida 0, 71 tests verdes; 100% de líneas, sentencias, funciones y ramas ejecutables, manteniendo umbral 85% por archivo. No hay tests omitidos, fallos esperados ni exclusiones nuevas.
- Componentes usan string/boolean y errores unknown; utilidad con campos opcionales convertibles, modelos propios de credenciales/request/response, GET con owner y arreglo directo. Las preferencias analizadas parten de unknown; no se inventó validación de esquemas ni recuperación silenciosa.
- Strict de TypeScript y strictTemplates/strictInjectionParameters/strictInputAccessModifiers activados. `npm run build`: salida 0. TypeScript estricto sobre todos los specs y configuración: salida 0. No se activó ignoreDeprecations ni se deshabilitaron gates.
- El editor detectó opciones obsoletas baseUrl y downlevelIteration. Se retiraron: no hay aliases que dependan de baseUrl y el target ES2022 no necesita downlevelIteration. El build repetido siguió con salida 0; consulta final del editor sin diagnósticos en configuración y archivos cambiados. Se conserva advertencia CommonJS de lodash/merge.
- Análisis con el parser TypeScript de todos los .ts de producción en src: cero nodos AnyKeyword, salida 0. Se complementa con compilación strict para any implícito, no se basa en buscar la palabra any (expect.any en tests no es un tipo).
- Los casos de null/undefined de formularios se inyectan con Reflect.set como entradas runtime adversas en el límite del componente; no se usan any, casts dobles ni asignaciones que el nuevo tipo string prohíbe.
- Prioridad/estado ausentes se reflejan en tipos opcionales. Comparación con prioridad undefined conserva el resultado anterior (1), sin corregir el comparador para prioridades iguales ni inventar jerarquías. Estado ausente se presenta como texto vacío. Casos nuevos verifican esos defaults y ambos sentidos de comparación existentes.
- Navegador 4201: petición simulada con Strict task/CUSTOM, Default task sin campos y Archived task. DOM mostró tarea, estado desconocido y NORMAL/SIN-ASIGNAR, excluyó archivada y volvió a login al salir. Foco/Enter y Space no activaron el flujo en dos intentos; despacho del evento click al botón completó la verificación Angular/DOM. No se presenta esta última ejecución como test de teclado ni de interacción física.
- No se modificó la política de mensajes públicos de H-02 ni los endpoints. Diff propio: [H-06.patch](../artifacts/H-06.patch). H-06 cerrado después de las pruebas verdes.

## Estado final de la ejecución de los cuatro pendientes

| Ítem | Caracterización previa | Corrección | Diff propio |
|---|---|---|---|
| H-01 | 56 verdes | 58 verdes, navegador y memoria/limpieza | [H-01.patch](../artifacts/H-01.patch) |
| H-02 | 58 verdes | 67 verdes, texto literal y UI después del error | [H-02.patch](../artifacts/H-02.patch) |
| H-03 | 67 verdes | 67 verdes, build/tipos, inventario/avisos y navegador | [H-03.patch](../artifacts/H-03.patch) |
| H-06 | 69 verdes | 71 verdes, build/tipos/AST/editor y DOM | [H-06.patch](../artifacts/H-06.patch) |

Los comandos se ejecutaron desde la raíz del frontend; todas las ejecuciones de caracterización y corrección de la tabla terminaron con salida 0. Las secciones de cada ítem conservan fallos intermedios de instalación e interacción y cómo se resolvieron. No se certificó integración con servicios reales ni se inspeccionaron otros componentes.

Cada patch compara snapshots consecutivos del propio componente, con prefijos before/after dentro de artifacts; los snapshots temporales se eliminan al guardar el patch. Los JSON de avisos son evidencia pública generada, no contienen código ni árbol privado enviado.

docs/ENDPOINTS.md se conserva intacto como contrato HTTP aprobado, aunque contiene el mapa histórico previo a H-05. Las políticas intencionales de memoria y presentación más recientes están descritas aquí y en la matriz. No se hicieron commits.
