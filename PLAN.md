# Plan de corrección de todos los ítems pendientes

Incluye **H-01, H-02, H-03 y H-06**, en ese orden, según [HALLAZGOS.md](./HALLAZGOS.md). Sustituye el plan anterior; H-04 y H-05 ya están resueltos y no se reimplementan. El seguimiento y los futuros cierres se mantienen exclusivamente en la matriz.

Se consultaron [docs/ENDPOINTS.md](./docs/ENDPOINTS.md), [docs/GOOD_PRACTICES.md](./docs/GOOD_PRACTICES.md) y [REGLAS.md](./REGLAS.md), y se contrastaron los pendientes con los componentes y servicios actuales. Las referencias iniciales de la matriz preceden a la extracción: el almacenamiento y las dependencias están ahora en servicios; las validaciones de login ya usan retornos anticipados.

Este documento es una propuesta, no una implementación ni un informe de ejecución. No se modifican código, dependencias, contratos ni estados con esta etapa.

## Límites comunes

- Preservar POST `http://localhost:8080/auth/login`, credenciales sin recortar al enviarlas, `client: 'angular-workshop'`, timeout de 5000 ms y respuesta con token/usuario.
- Preservar GET `http://localhost:8000/api/tasks?owner=<username>`, encabezado de autorización con esquema Bearer y respuesta como arreglo directo. No añadir un timeout al GET, endpoints, cookies o renovación de sesión.
- Mantener navegación, filtrado exacto de ARCHIVED, orden actual de prioridades, etiquetas y estados. No introducir permisos ni redirecciones automáticas ante 401/403.
- Mantener componentes sin HTTP ni almacenamiento directo, servicios de instancia única y configuración centralizada.
- No modificar [docs/ENDPOINTS.md](./docs/ENDPOINTS.md) en esta etapa. Su mapa interno precede a H-05, pero sus contratos HTTP siguen siendo la referencia. Las propuestas de almacenamiento y presentación de H-01/H-02 son cambios deliberados vinculados a esos hallazgos, no cambios HTTP.
- No arreglar dentro de estos apartados bugs ajenos, como el comparador de prioridades o una política nueva de recuperación de respuestas inválidas. Si una corrección exige decidir otro comportamiento, registrarlo y delimitarlo antes de ampliar el alcance.

## Item: H-01 — Token persistido en localStorage

### Problema y alcance propio

[SessionService](./src/app/core/session.service.ts) conserva token y usuario en almacenamiento accesible a JavaScript y persistente entre recargas. La centralización de H-05 no elimina esa exposición.

Alcance: cambiar exclusivamente la política de persistencia de sesión y su integración. No corregir mensajes HTML, dependencias ni tipado global.

### Cambio propuesto

- Mantener token y usuario solo en memoria dentro del servicio de sesión existente. No crear un segundo almacén ni trasladar el token a sessionStorage, que también es accesible a JavaScript.
- Mantener preferencias locales y su combinación actual, sin eliminar todavía Lodash. Separar claramente operaciones de sesión y preferencias dentro del servicio.
- Borrar las claves heredadas de token/usuario al inicializar y al cerrar sesión, sin recuperarlas para autenticar. Conservar preferencias al salir.
- Mantener login → guardar sesión → navegar → GET con token → logout. Si falla una operación necesaria de persistencia de preferencias, propagar el fallo al manejo visible del login, sin presentar éxito ni dejar una sesión parcial. Notificar y registrar fallos de limpieza sin incluir secretos; no bloquear la instancia del servicio con una excepción de constructor sin tratar.
- Cambio intencional de UX que requiere aprobación al implementar: recargar o abrir otra pestaña exige iniciar sesión de nuevo. No prometer revocación del servidor ni protección contra un script que ya se ejecuta en la página. Una cookie HttpOnly requeriría cambios externos y queda fuera.

### Archivos que se van a tocar

- [session.service.ts](./src/app/core/session.service.ts) y [session.service.spec.ts](./src/app/core/session.service.spec.ts): memoria, limpieza de claves antiguas y manejo explícito de fallos.
- [login.component.ts](./src/app/login/login.component.ts) y [dashboard.component.ts](./src/app/dashboard/dashboard.component.ts): solo integración y presentación de fallos si la interfaz del servicio lo requiere.
- [login-flow.spec.ts](./src/app/login/login-flow.spec.ts) y [component-services.spec.ts](./src/app/login/component-services.spec.ts): usar una sesión compartida dentro del flujo y una nueva instancia al simular recarga.
- [docs/TESTING.md](./docs/TESTING.md): pruebas y cambio de UX realmente verificado.

### Prueba previa y prueba de corrección

**Antes de producción:** ampliar la caracterización para fijar escritura de sesión antes de navegar, GET con el token guardado, logout sin HTTP y preferencias conservadas. Registrar que una instancia nueva recupera actualmente el token persistido; identificar ese caso como comportamiento que se reemplazará.

**Después:** misma instancia conserva sesión al navegar; nueva instancia no recupera token/usuario; ninguna escritura persistente contiene token; claves antiguas desaparecen; preferencias permanecen; logout deja sesión ausente. Simular almacenamiento bloqueado y comprobar aviso/registro sin secretos y ausencia de éxito ficticio o sesión parcial. En navegador verificar login, recarga que vuelve a login y segundo login/logout. No borrar la evidencia del comportamiento anterior para hacer pasar la suite.

## Item: H-02 — Mensaje dinámico renderizado como HTML

### Problema y alcance propio

[login.component.ts](./src/app/login/login.component.ts) concatena usuario y error externo con etiquetas y [login.component.html](./src/app/login/login.component.html) lo presenta con innerHTML. Angular sanitiza por defecto; no se ha demostrado XSS ejecutable ni debe afirmarse lo contrario.

Alcance: representación como texto y exposición segura de errores de login/tareas. No cambiar persistencia, transporte ni políticas de sesión.

### Cambio propuesto

- Reemplazar innerHTML por interpolación. El énfasis y los saltos, si se conservan, serán elementos estáticos de plantilla, no HTML construido con datos externos. No usar bypassSecurityTrustHtml ni agregar sanitizadores.
- Mantener textos de campos requeridos y falta de token, eliminando etiquetas de las cadenas. Conservar carga, navegación y errores visibles.
- Definir mensajes públicos por contexto de login/tareas en una pequeña función compartida, sin exponer cuerpos arbitrarios, URLs, trazas o credenciales. No inventar códigos del servidor: mantener recepción de `message` y `detail` según cada contrato, pero no publicarlos indiscriminadamente.
- Registrar solo categoría/contexto necesario mediante el mecanismo de consola existente, sin volcar el objeto Axios completo, token o contraseña.
- Esta sustitución de detalles internos por mensajes públicos es un cambio intencional de presentación solicitado por las convenciones; documentarlo y probarlo. No agregar logout automático ante errores.

### Archivos que se van a tocar

- [login.component.ts](./src/app/login/login.component.ts), [login.component.html](./src/app/login/login.component.html) y [dashboard.component.ts](./src/app/dashboard/dashboard.component.ts).
- Crear `src/app/core/http-error-message.ts` y su prueba, con entradas `unknown`, contexto explícito y salida textual. H-06 reutilizará esta pieza, sin duplicarla.
- [login-flow.spec.ts](./src/app/login/login-flow.spec.ts), [component-services.spec.ts](./src/app/login/component-services.spec.ts) y [vitest.config.ts](./vitest.config.ts), solo para cubrir el nuevo código sin reducir umbrales.
- [docs/TESTING.md](./docs/TESTING.md): expectativas anteriores/nuevas y evidencia de renderizado.

### Prueba previa y prueba de corrección

**Antes de producción:** fijar validaciones, ausencia de token y finalización de carga ante error de red, timeout y rechazos con `message`/`detail`. Registrar los mensajes actuales que deliberadamente dejarán de exponerse; no añadir pruebas que exijan conservar interpretación HTML.

**Después:** tabla de errores conocidos/desconocidos con mensajes públicos no vacíos; fin de carga y navegación intactos; ningún detalle externo ni secreto en UI o logs. En navegador introducir etiquetas inocuas en usuario y respuestas simuladas: el usuario, si se muestra, aparece literalmente, no crea elementos; el detalle interno no aparece. Probar el DOM real, no solo ausencia de etiquetas en una cadena.

## Item: H-03 — Dependencias Axios y Lodash declaradas y utilizadas

### Problema y alcance propio

[package.json](./package.json) declara Axios 0.31.0 y Lodash 4.17.21; los servicios siguen utilizándolos. No hay que equiparar versión declarada con CVE confirmado o explotable.

Alcance: inventario, evidencia y actualización o eliminación de esas dependencias sin cambios de contrato ni rediseño de sesión. No silenciar advertencias o scanners.

### Cambio propuesto

- Verificar árbol realmente resuelto y avisos públicos por paquete/versión, incluyendo dependencias transitivas relevantes. Registrar fecha, fuente, rango afectado y alcance al navegador; no enviar código, credenciales ni información privada a servicios externos.
- Seleccionar una versión de Axios compatible y contrastada con avisos vigentes en la ejecución. Mantenerlo dentro de los servicios y preservar timeout, datos, errores y encabezados. No fijar ahora una versión arbitraria ni prometer ausencia de CVEs sin comprobarla.
- Preferir actualizar Lodash a una versión verificada si está afectado. Eliminarlo solo si operaciones nativas preservan la combinación consumida y caracterizada, incluidos datos anidados/extra, sin escribir un reemplazo casero inseguro de merge profundo.
- Si eliminar Lodash exige recortar las preferencias admitidas, no hacerlo silenciosamente: mantener la dependencia actualizada y proponer aparte la migración del esquema. La actualización es preferible a cambiar el contrato de preferencias para justificar una eliminación.
- Retirar tipos de Lodash solo si no quedan usos. Usar npm para resolver versiones y generar el lockfile cuando corresponda; no editarlo manualmente ni aplicar actualizaciones forzadas indiscriminadas.
- Si la verificación externa no está disponible, dejar el hallazgo pendiente con evidencia del bloqueo. No declarar seguro un árbol solo porque desapareció una dependencia directa.

### Archivos que se van a tocar

- [package.json](./package.json) y lockfile gestionado por npm, si se genera durante la implementación.
- [auth.service.ts](./src/app/core/auth.service.ts), [tasks.service.ts](./src/app/core/tasks.service.ts) y [session.service.ts](./src/app/core/session.service.ts), solo si los cambios de API o eliminación lo exigen.
- [auth.service.spec.ts](./src/app/core/auth.service.spec.ts), [tasks.service.spec.ts](./src/app/core/tasks.service.spec.ts), [session.service.spec.ts](./src/app/core/session.service.spec.ts) y [login-flow.spec.ts](./src/app/login/login-flow.spec.ts).
- [docs/TESTING.md](./docs/TESTING.md): comandos, resultados y límites; evidencia del cierre en la propia fila de la matriz.

### Prueba previa y prueba de corrección

**Antes de modificar manifiesto/producción:** ejecutar el baseline y completar contratos exactos de POST/GET y propagación de error; preferencias ausentes, parciales, completas, anidadas y extra; JSON corrupto y errores de almacenamiento. Reutilizar los casos existentes, no recrearlos.

**Después:** repetir contratos y flujo integrado, cobertura, build y navegador. Comprobar diferencias reales de resolución y avisos; registrar códigos de salida y advertencias pendientes. No agregar allowedCommonJsDependencies ni bajar el nivel de auditoría para ocultar fallos. Las instalaciones se realizan solo después del cambio del manifiesto o ante un fallo real de dependencia ausente.

## Item: H-06 — any y patrones de calidad restantes

### Problema y alcance propio

Persisten any en estado y errores de los componentes y en [legacy-format.ts](./src/app/utils/legacy-format.ts). El [tsconfig.json](./tsconfig.json) todavía desactiva strict y comprobaciones estrictas de Angular.

H-05 ya centralizó claves, URLs y servicios y redujo el anidamiento de login. No hay que volver a extraerlos. H-02 será dueño de la política de errores públicos; este ítem reutiliza esa función sin modificar sus mensajes.

### Cambio propuesto

- Tipar campos de UI como string/boolean; errores como unknown con guardas. Quitar any restante del código de producción alcanzado, sin conversiones dobles ni casts para simular validación.
- Revisar [models.ts](./src/app/core/models.ts): interfaces de request/response propias para login y GET; representar ausencia admitida por los defaults existentes sin inventar enumeraciones cerradas de estado o prioridades.
- Dar a la utilidad un tipo mínimo explícito para campos realmente convertibles y tarea ausente, conservando sus defaults y conversiones caracterizadas.
- Conservar retornos anticipados y nombres por intención; reutilizar configuración, sesión y errores compartidos. No abstraer código que ya es simple ni duplicar normalizadores por componente.
- Activar strict de TypeScript y comprobaciones estrictas de plantillas/inyección. Corregir los diagnósticos dentro de este frontend, sin bajar los quality gates ni excluir archivos.
- No convertir este trabajo de tipos en una política nueva de rechazo de esquemas, recuperación de JSON corrupto o corrección del comparador. Los tipos estáticos no prueban datos externos válidos: cualquier guardia necesaria debe rechazar explícitamente el dato inválido mediante el manejo visible existente, nunca devolver éxito o lista vacía. Si exige un cambio contractual no solicitado, detener esa parte y delimitarla.

### Archivos que se van a tocar

- [login.component.ts](./src/app/login/login.component.ts), [dashboard.component.ts](./src/app/dashboard/dashboard.component.ts), [models.ts](./src/app/core/models.ts), [legacy-format.ts](./src/app/utils/legacy-format.ts) y [tsconfig.json](./tsconfig.json).
- Servicios existentes únicamente para alinear sus firmas con los modelos, sin cambiar HTTP.
- Función de errores creada en H-02 únicamente si requiere ajuste de tipado, sin alterar su política pública.
- [login-flow.spec.ts](./src/app/login/login-flow.spec.ts), [component-services.spec.ts](./src/app/login/component-services.spec.ts), [legacy-format.spec.ts](./src/app/utils/legacy-format.spec.ts) y pruebas de servicios afectadas.
- [docs/TESTING.md](./docs/TESTING.md): comandos de tipos, build y resultados reales.

### Prueba previa y prueba de corrección

**Antes de producción:** fijar entradas de formularios, validación de blancos, valores nulos/indefinidos observables, estados desconocidos, etiqueta con valores presentes/ausentes y mensajes públicos de H-02. Los casos de entradas inválidas desde pruebas deberán alcanzar el límite apropiado sin forzar asignaciones incompatibles con nuevos tipos ni usar any.

**Después:** suite sin castings evasivos, errores desconocidos manejados, comportamiento preservado y Angular compilando con los flags estrictos. Buscar any explícito en producción alcanzada y comprobar tipos del compilador; una búsqueda textual sola no detecta any implícito ni valida el flujo. Repetir navegador para comprobar que plantillas y actualización tras navegación siguen funcionando.

## Ejecución futura y criterios comunes de cierre

Implementar cada apartado por separado y en el orden indicado, con caracterización verde antes y prueba de corrección después. La propuesta de sesión de H-01 requiere confirmar su impacto de UX antes de codificarla. H-02 es dueño de presentación segura; H-03 de versiones/merge; H-06 de tipos restantes: compartir archivos no autoriza mezclar los cierres.

Desde la raíz de este componente: pruebas relevantes con el runner existente, `npm run test:coverage` y `npm run build`. Mantener >=85% por archivo en líneas, ramas, funciones y sentencias, incluyendo todo código ejecutable nuevo y conservando los componentes en el denominador. No ocultar advertencias, tests omitidos o fallos de auditoría.

Repetir el flujo en navegador con endpoints simulados. Distinguirlo de integración real, CORS y verificación del servidor, que no se presuponen ni requieren inspeccionar otros repositorios. Documentar resultados realmente ejecutados, cambios intencionales de UX y limitaciones en [docs/TESTING.md](./docs/TESTING.md).

Actualizar cada fila de [HALLAZGOS.md](./HALLAZGOS.md) solo al verificar su alcance, con prueba y diff local propios. No cerrar los cuatro por una única ejecución global. En esta etapa solo se actualiza este plan; no se ejecutaron pruebas, auditorías ni instalaciones.
