# BarberPass — tarjetas de fidelidad digitales para barberías

Plataforma SaaS multi-barbería: una sola instalación atiende a muchas barberías, cada una con su marca, sus clientes y sus datos totalmente separados. Pensada para Perú (español, soles, celulares de 9 dígitos, Ley N.° 29733).

> El nombre comercial se cambia con la variable `NEXT_PUBLIC_PLATFORM_NAME`, sin tocar el código.

## Contenido

1. [Qué incluye](#qué-incluye)
2. [Tecnología y arquitectura](#tecnología-y-arquitectura)
3. [Instalación local](#instalación-local)
4. [Crear el super administrador](#crear-el-super-administrador)
5. [Dar de alta una barbería manualmente](#dar-de-alta-una-barbería-manualmente)
6. [Registrar un pago](#registrar-un-pago)
7. [Barbería demo](#barbería-demo)
8. [Pruebas](#pruebas)
9. [Despliegue en producción](#despliegue-en-producción-vercel--neon)
10. [Seguridad](#seguridad)
11. [Fase 2: qué falta y qué se necesita](#fase-2-qué-falta-y-qué-se-necesita)
12. [Estructura del proyecto](#estructura-del-proyecto)

## Qué incluye

| Rol | Dónde entra | Qué puede hacer |
|---|---|---|
| **Super administrador** | `/admin` | Barberías (crear, editar, suspender, reactivar), pagos manuales, planes, métricas globales (MRR, por vencer, clientes, sellos), auditoría, «entrar como» una barbería, barbería demo. |
| **Dueño de barbería** | `/ingresar` → `/<slug>/panel` | Marca y recompensa, barberos, clientes (búsqueda y CSV), métricas, clientes para recuperar y cumpleaños con botón de WhatsApp, cartel con QR, estado de la suscripción. |
| **Barbero** | `/<slug>/barbero` (PIN) | Escanear el QR del cliente o buscarlo, sumar sello, canjear recompensa. |
| **Cliente final** | `/<slug>/registro` (QR del mostrador) | Se registra y recibe su tarjeta en `/<slug>/tarjeta/<token>`, instalable como app (PWA). |

Páginas públicas: landing (`/`), registro de barberías con prueba gratis (`/registro`), demo (`/demo`), recuperación de contraseña (`/recuperar-clave`), términos y privacidad.

**Reglas de negocio principales**

- Cada corte suma 1 sello. Con N sellos (5 por defecto, configurable) hay una recompensa; canjearla descuenta N sellos.
- Máximo 1 sello por cliente por día (hora de Lima). Un segundo sello requiere el PIN de autorización del dueño.
- El mismo celular puede registrarse en varias barberías (tarjetas separadas), pero no dos veces en la misma.
- Suscripción: prueba de 14 días → aviso 7 días antes de vencer → 5 días de gracia → bloqueo del panel del dueño y de los barberos. **Nunca se borran datos** y las tarjetas de los clientes siguen visibles. Todos esos plazos se editan en `/admin/configuracion`.

## Tecnología y arquitectura

- **Next.js 16** (App Router, Server Actions) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL** + **Prisma 6**
- Autenticación propia: sesiones en base de datos (cookie `httpOnly`), contraseñas y PINs con **argon2id**
- Validación con **Zod**, compartida entre navegador y servidor
- Pruebas: **Vitest** contra PostgreSQL real + flujo de extremo a extremo con **Playwright**

### Aislamiento entre barberías (lo más importante)

Tres capas independientes; un descuido en una no filtra datos:

1. **Acceso con ámbito obligatorio** (`src/lib/db/tenant.ts`). El código nunca usa Prisma directamente: usa `conBarberia(id, fn)`, que inyecta el filtro de barbería en cada consulta y cada alta, o `conPlataforma(fn)` (solo super administrador e infraestructura). ESLint prohíbe importar el cliente crudo fuera de `src/lib/db`.
2. **Row Level Security en PostgreSQL** (`prisma/migrations/*_rls`). La aplicación se conecta con el rol `barberpass_app`, que no es dueño de las tablas. Cada transacción declara su barbería (`set_config('app.barbershop_id', …)`) y PostgreSQL rechaza cualquier fila de otra, aunque el código olvide un filtro.
3. **Claves foráneas compuestas** (`barbershopId` + `id`): un sello o canje no puede apuntar a un cliente o barbero de otra barbería.

Además: los pagos solo los escribe la plataforma, y la auditoría es de solo inserción (la aplicación no tiene permiso de `UPDATE`/`DELETE` sobre esa tabla).

**Si agregas un modelo nuevo con datos de una barbería**: ponle `barbershopId`, regístralo en `MODELOS_POR_BARBERIA`, créale su política RLS en una migración y añádelo a `tests/aislamiento`. Una prueba falla automáticamente si una tabla con `barbershopId` no tiene RLS.

## Instalación local

Requisitos: Node.js 20 o superior y PostgreSQL 14 o superior.

**1. Crea los roles y la base de datos** (como superusuario de PostgreSQL, por ejemplo con `psql -U postgres`):

```sql
CREATE ROLE barberpass_owner LOGIN PASSWORD 'owner_dev' CREATEDB;
CREATE ROLE barberpass_app   LOGIN PASSWORD 'app_dev';
CREATE DATABASE barberpass      OWNER barberpass_owner;
CREATE DATABASE barberpass_test OWNER barberpass_owner;  -- solo para las pruebas
```

`barberpass_owner` es dueño de las tablas y ejecuta las migraciones. `barberpass_app` es el rol restringido con el que corre la aplicación.

**2. Configura el entorno**

```bash
cp .env.example .env
```

Edita `.env` con las contraseñas que elegiste.

**3. Instala, migra y carga los datos iniciales** (planes y configuración)

```bash
npm install
```

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

**4. Arranca**

```bash
npm run dev
```

Abre http://localhost:3000. Para probar la cámara y la tarjeta desde tu celular en la misma red wifi, define `APP_URL` con la IP de tu computadora (los navegadores solo permiten la cámara en `https` o en `localhost`; para el celular usa un túnel como `ngrok` o `cloudflared`).

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en modo producción |
| `npm run db:migrate` | Aplicar migraciones (usa `DIRECT_URL`) |
| `npm run db:migrate:dev` | Crear una migración nueva tras cambiar `schema.prisma` |
| `npm run db:seed` | Planes y configuración inicial |
| `npm run crear-superadmin` | Crear o actualizar un super administrador |
| `npm run crear-barberia` | Alta manual de una barbería |
| `npm run demo` | Crear o regenerar la barbería demo |
| `npm test` | Pruebas unitarias, de integración y de aislamiento |
| `npm run test:e2e` | Flujo completo en navegador |
| `npm run lint` / `npm run typecheck` | Calidad de código |

## Crear el super administrador

```bash
npm run crear-superadmin -- tu@correo.com "Tu Nombre" "una-contraseña-larga"
```

Luego ingresa en `/admin/ingresar`. El mismo comando sirve para cambiar la contraseña de un super administrador existente. No hay registro público de super administradores: solo se crean desde la consola.

## Dar de alta una barbería manualmente

Hay tres caminos; todos crean la barbería en prueba gratis y a su usuario dueño.

**A. Desde el panel** (recomendado): `/admin/barberias` → **Nueva barbería**. Completa nombre, dirección web (slug), plan y los datos del dueño con una contraseña inicial. Compártele al dueño su correo y contraseña; al ingresar por primera vez verá el asistente de configuración.

**B. Desde la consola**:

```bash
npm run crear-barberia -- --nombre "Barbería El Bigote" --slug el-bigote --dueno "Juan Pérez" --email juan@correo.com --password "clave-segura-123" --plan "Pro"
```

`--slug` y `--plan` son opcionales (por defecto: slug generado del nombre y el plan más económico).

**C. La propia barbería** se registra en `/registro` desde la landing.

Después del alta, el dueño: (1) completa el asistente (datos, logo y colores, recompensa, barberos, QR), (2) imprime el cartel desde **Cartel QR**, y (3) les da a sus barberos el enlace `/<slug>/barbero` y su PIN.

## Registrar un pago

1. Recibe el pago por Yape, Plin o transferencia.
2. Entra a `/admin/barberias` y abre la barbería.
3. En **Registrar pago** indica fecha, monto, método y período cubierto (1, 2, 3, 6 o 12 meses) y, si quieres, una nota (número de operación).
4. Pulsa **Registrar pago**.

El sistema calcula el período y la nueva fecha de vencimiento:

- Si la barbería aún tiene días vigentes (de prueba o pagados), el nuevo período empieza cuando terminan: no pierde días.
- Si ya venció, el período empieza el día del pago y el panel se desbloquea al instante.
- Una barbería **suspendida** sigue suspendida hasta que pulses **Reactivar**.

Cada pago queda en `/admin/pagos`, en el historial que ve el dueño (**Suscripción**) y en la auditoría con tu usuario, fecha y hora.

Otras acciones en la ficha de la barbería: cambiar de plan, extender la prueba (campo «Fin de la prueba»), suspender con un motivo, restablecer la contraseña del dueño y **Entrar como esta barbería** (sesión de soporte de 1 hora, con aviso visible y todo registrado en auditoría).

## Barbería demo

```bash
npm run demo
```

Crea «Barbería Don Bigote» (`/barberia-demo`) con 60 clientes y unos 5 meses de cortes ficticios. No vence, no admite pagos y no cuenta en las métricas globales. También se puede crear o regenerar desde `/admin` (sección **Barbería demo**).

- Página pública para enseñar a posibles clientes: `/demo` (tarjeta de ejemplo, registro y panel del barbero con PIN `1234`).
- Panel del dueño de la demo: botón **Entrar al panel de la demo** en `/admin`, o con el correo `demo@barberpass.app`. En desarrollo la contraseña es `demo12345`; en producción define `DEMO_PASSWORD` (si no, se genera una al azar y se muestra al crear la demo).

Como el PIN de los barberos demo es público, cualquiera puede sumar sellos en la demo. Regenérala cuando quieras dejarla limpia.

## Pruebas

```bash
npm test
```

115 pruebas contra una base PostgreSQL real (`barberpass_test`), usando el mismo rol restringido que la aplicación. Las migraciones se aplican solas. Si tu base de pruebas tiene otras credenciales, define `TEST_DATABASE_URL` y `TEST_DIRECT_URL`.

- `tests/aislamiento/` — una barbería no puede leer, crear, modificar ni borrar datos de otra, en las tres capas (Prisma, RLS con SQL crudo, claves compuestas). Incluye que toda tabla con `barbershopId` tenga RLS y que la aplicación no corra con un rol capaz de saltárselo.
- `tests/integracion/` — autenticación y límite de intentos, registro de clientes, sellos y canjes (incluido doble clic y canjes simultáneos), panel del dueño, pagos y suscripciones, registro público, recuperación de contraseña y demo.
- `tests/unit/` — estados de suscripción, períodos de pago, tarjeta, validaciones, fechas de Lima.

Flujo completo en navegador (registro de barbería → onboarding → cliente → sellos → canje → aislamiento por HTTP):

```bash
npm i -D playwright && npx playwright install chromium
```

```bash
npm run test:e2e
```

Necesita la aplicación corriendo. Cada ejecución crea 2 barberías de prueba y el límite anti-abuso permite 3 altas por IP cada 15 minutos.

## Despliegue en producción (Vercel + Neon)

### Costos aproximados

Precios referenciales en dólares; **verifícalos en la web de cada proveedor** porque cambian.

| Concepto | Costo aproximado | Notas |
|---|---|---|
| Vercel Pro | ~US$ 20 al mes | El plan gratuito (Hobby) no permite uso comercial. |
| PostgreSQL en Neon | US$ 0 al inicio; ~US$ 5–20 al mes al crecer | El plan gratuito alcanza para las primeras barberías. |
| Dominio | ~US$ 12 al año (`.com`) o ~US$ 35 al año (`.pe`) | |
| Correos (Resend) | US$ 0 hasta ~3 000 correos al mes | Opcional: solo recuperación de contraseña. |
| **Total inicial** | **~US$ 20–25 al mes** | |

Alternativa más barata: un servidor propio (VPS de ~US$ 5–6 al mes) con Node.js y PostgreSQL, o Railway/Render. La aplicación es Next.js estándar (`npm run build && npm start`) y solo necesita las variables de entorno de abajo; a cambio, los respaldos y las actualizaciones corren por tu cuenta.

### Paso a paso

**1. Sube el código a GitHub** (repositorio privado).

**2. Crea la base de datos en [Neon](https://neon.tech)**. Elige una región cercana a Perú y anota cuál es. Neon te da un rol dueño (por ejemplo `neondb_owner`).

**3. Crea el rol restringido de la aplicación.** En el editor SQL de Neon:

```sql
CREATE ROLE barberpass_app LOGIN PASSWORD 'una-clave-larga-y-aleatoria';
```

Es importante crearlo **por SQL**: los roles creados desde la consola de Neon pueden saltarse RLS; los creados por SQL no. Las pruebas verifican esta condición y puedes comprobarla tú con:

```sql
SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'barberpass_app';  -- deben ser false, false
```

**4. Arma las dos cadenas de conexión**

- `DIRECT_URL`: conexión **directa** con el rol dueño (para migraciones).
- `DATABASE_URL`: conexión **con pool** (host que contiene `-pooler`) con el rol `barberpass_app`, añadiendo `?sslmode=require&pgbouncer=true`.

**5. Aplica las migraciones y los datos iniciales** desde tu computadora, apuntando a producción:

```bash
DIRECT_URL="postgresql://neondb_owner:...@ep-xxx.neon.tech/neondb?sslmode=require" DATABASE_URL="postgresql://barberpass_app:...@ep-xxx-pooler.neon.tech/neondb?sslmode=require&pgbouncer=true" npm run db:migrate
```

Con las mismas dos variables, ejecuta también `npm run db:seed`, `npm run crear-superadmin -- …` y, si quieres, `npm run demo`.

**6. Crea el proyecto en [Vercel](https://vercel.com)** importando el repositorio. En *Settings → Environment Variables* define:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Conexión con pool del rol `barberpass_app` |
| `DIRECT_URL` | Conexión directa del rol dueño |
| `APP_URL` | `https://tudominio.pe` |
| `NEXT_PUBLIC_PLATFORM_NAME` | Tu marca |
| `AUTH_PEPPER` | Cadena aleatoria larga (defínela antes de crear usuarios y no la cambies) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Opcionales, para recuperación de contraseña |
| `DEMO_PASSWORD` | Opcional |

En *Settings → Functions* elige la **misma región** que la base de datos (reduce mucho la latencia).

**7. Despliega.** El comando de compilación por defecto (`npm run build`) ya genera el cliente de Prisma. Para futuras versiones con cambios de base de datos, ejecuta `npm run db:migrate` (paso 5) antes de desplegar, o cambia el *Build Command* a `npm run db:migrate && npm run build`.

**8. Conecta tu dominio** en *Settings → Domains* y actualiza `APP_URL`. Los QR impresos contienen esa URL: defínela antes de imprimir carteles.

**9. Configura la plataforma** en `/admin/configuracion`: tu WhatsApp de contacto (aparece en la landing y en «Renovar por WhatsApp»), días de prueba y de gracia. Revisa los planes en `/admin/planes`.

**10. Antes de vender**: haz revisar por un abogado los textos de `/terminos`, `/privacidad` y la política base de las barberías (son plantillas de partida), y activa los respaldos automáticos de la base de datos.

## Seguridad

- **Contraseñas y PINs**: hash argon2id, con *pepper* opcional (`AUTH_PEPPER`). Nunca en texto plano.
- **Sesiones**: token aleatorio en cookie `httpOnly`, `Secure` y `SameSite=Lax`; en la base solo se guarda su hash. Una cookie distinta por rol. Se cierran al desactivar un barbero, cambiar un PIN, restablecer una contraseña o suspender una barbería.
- **Fuerza bruta**: 5 intentos fallidos por cuenta o PIN y 20 por IP cada 15 minutos; también hay límites en registros de clientes, altas de barberías y recuperación de contraseña. La IP se toma de `x-forwarded-for` (correcto en Vercel; detrás de otro proxy asegúrate de que la cabecera sea confiable).
- **Tarjetas**: URL con token aleatorio de 128 bits, sin IDs secuenciales y sin indexación. El QR personal del cliente usa otro token que solo sirve con sesión de barbero de esa barbería.
- **Auditoría**: cada sello, canje, pago, exportación, cambio de configuración y acción del super administrador queda con fecha, hora, usuario e IP, y no se puede editar ni borrar desde la aplicación.
- **Validación** en navegador y servidor; el servidor siempre revalida. El CSV neutraliza fórmulas y el logo se valida por su contenido real.

## Fase 2: qué falta y qué se necesita

El código ya tiene los puntos de extensión; esto es lo que requiere cada función.

**Cobro automático (Culqi, Mercado Pago, Niubiz…)**
- Punto de extensión: `src/lib/pagos/index.ts` (interfaz `ProveedorDePago`) y `registrarPago()` en `src/lib/servicios/admin.ts`, que ya acepta `provider` y `externalRef`; la tabla `Payment` tiene esas columnas.
- Falta: cuenta comercial en la pasarela (RUC y cuenta bancaria), un botón «Pagar» en **Suscripción** que cree el cobro, y una ruta `api/pagos/webhook` que valide la firma y llame a `registrarPago()`. Para cobro recurrente, guardar el identificador de suscripción de la pasarela en `Barbershop`. Considera emitir comprobantes electrónicos (SUNAT) con un proveedor de facturación.

**Dominio o subdominio por barbería**
- Punto de extensión: `src/proxy.ts` ya reescribe `<slug>.tudominio.pe/…` a `/<slug>/…` cuando defines `ROOT_DOMAIN`; todas las páginas resuelven la barbería en `src/lib/tenancy/resolver.ts`.
- Falta: dominio comodín (`*.tudominio.pe`) en el DNS y en Vercel, generar los enlaces y QR con el subdominio, y definir el ámbito de las cookies. Para dominios propios de cada barbería: una columna `customDomain`, consultarla en el proxy y registrar el dominio con la API de Vercel.

**Apple Wallet y Google Wallet**
- Falta: cuenta Apple Developer (US$ 99 al año) con certificado *Pass Type ID*, y una cuenta emisora de Google Wallet. Una ruta `/<slug>/tarjeta/<token>/wallet` generaría el pase (`.pkpass` firmado o el JWT de Google) con los datos de `obtenerTarjeta()`, y tras cada sello o canje (`src/lib/servicios/sellos.ts`) se notificaría la actualización del pase.

**Envío automático por WhatsApp (API de WhatsApp Business)**
- Punto de extensión: `src/lib/whatsapp/index.ts` (hoy genera enlaces `wa.me`) y las listas `clientesParaRecuperar()` y `cumpleanosDelMes()`. El consentimiento ya se guarda por cliente (`whatsappOptIn`, con fecha).
- Falta: cuenta de WhatsApp Business Platform (Meta o un proveedor como Twilio o 360dialog), plantillas de mensaje aprobadas, una tarea programada (Vercel Cron) que envíe a quienes corresponda, una tabla de mensajes enviados para no repetir, y un enlace de baja. El costo es por conversación.

**Reserva de citas**
- Falta: modelos nuevos por barbería (`Service`, `Schedule`, `Appointment`, con `barbershopId` y RLS como indica la sección de aislamiento), una página pública de reserva en `/<slug>/reservar`, agenda en el panel del barbero y recordatorios (idealmente junto con la API de WhatsApp).

**Otras mejoras razonables**: varios usuarios dueño por barbería (el modelo ya lo permite), cadenas con varias sedes, verificación del correo al registrarse, y Redis para el límite de intentos si el tráfico crece mucho.

## Estructura del proyecto

```
prisma/
  schema.prisma            Modelo de datos
  migrations/              Incluye la migración de Row Level Security
  seed.ts                  Planes y configuración inicial
scripts/                   crear-superadmin, crear-barberia, demo
src/
  proxy.ts                 Subdominios por barbería (fase 2; inactivo sin ROOT_DOMAIN)
  app/
    (plataforma)/          Landing, registro, ingresar, demo, recuperación, legales
    admin/                 Panel del super administrador
    [slug]/                Todo lo de UNA barbería
      registro/            Formulario del cliente (destino del QR del mostrador)
      tarjeta/[token]/     Tarjeta del cliente (PWA) y su manifest
      q/[qrToken]/         Destino del QR personal del cliente
      barbero/             Ingreso por PIN, escáner, ficha del cliente
      panel/               Panel del dueño
      onboarding/          Asistente de alta
  components/              Interfaz compartida
  lib/
    db/                    conBarberia() / conPlataforma()  ← aislamiento
    auth/                  Hash, sesiones, guardas por rol, límite de intentos
    tenancy/               Resolución de la barbería por slug
    servicios/             Lógica de negocio (sin dependencia de Next.js)
    suscripcion/           Estados y vencimientos (lógica pura)
    fidelidad/             Tarjeta de sellos (lógica pura)
    auditoria/ validacion/ whatsapp/ qr/ pagos/ correo/
tests/
  aislamiento/ integracion/ unit/ e2e/
```
