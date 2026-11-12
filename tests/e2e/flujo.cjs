// Prueba de extremo a extremo en un navegador real (Playwright).
// Recorre el flujo completo con DOS barberías y verifica el aislamiento por HTTP.
//
// Requisitos: la app corriendo (npm run dev  o  npm run build && npm start),
// `npm run db:seed` ejecutado, y Playwright instalado:
//     npm i -D playwright && npx playwright install chromium
// Uso:  npm run test:e2e            (BASE_URL=http://localhost:3000 por defecto)
// Nota: crea 2 barberías de prueba por ejecución; el límite anti-abuso permite
// 3 altas por IP cada 15 minutos.
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const id = String(Date.now()).slice(-7);
let pasos = 0;

function ok(condicion, mensaje) {
  if (!condicion) throw new Error(`✖ ${mensaje}`);
  pasos++;
  console.log(`  ✔ ${mensaje}`);
}

async function altaBarberia(navegador, nombre) {
  const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on("console", (m) => m.type() === "error" && !/favicon|404|403/.test(m.text()) && errores.push(m.text().slice(0, 300)));
  p.on("pageerror", (e) => errores.push(e.message.slice(0, 300)));
  const email = `${nombre.toLowerCase().replace(/\W+/g, "")}${id}@e2e.test`;
  await p.goto(`${BASE}/registro`, { waitUntil: "networkidle" });
  await p.fill("[name=nombreBarberia]", `${nombre} ${id}`);
  await p.fill("[name=nombreDueno]", "Dueño E2E");
  await p.fill("[name=email]", email);
  await p.fill("[name=password]", "clave-e2e-123");
  await p.check("[name=aceptaTerminos]");
  await p.click("button[type=submit]");
  await p.waitForURL("**/onboarding");
  const slug = new URL(p.url()).pathname.split("/")[1];
  return { ctx, p, slug, email, errores };
}

(async () => {
  const navegador = await chromium.launch();
  try {
    console.log("1. Una barbería nueva se registra y completa el onboarding");
    const A = await altaBarberia(navegador, "Barberia Alfa");
    const { p: dueno, slug } = A;
    ok(slug.startsWith("barberia-alfa"), `cuenta creada con prueba gratis en /${slug}`);
    await dueno.goto(`${BASE}/${slug}/onboarding?paso=4`, { waitUntil: "networkidle" });
    await dueno.fill("[name=nombre]", "Carlos");
    await dueno.fill("form:has([name=nombre]) [name=pin]", "1357");
    await dueno.click("text=Agregar barbero");
    await dueno.waitForSelector('li:has-text("✓ Carlos")');
    await dueno.fill('form:has-text("Guardar PIN") [name=pin]', "8642");
    await dueno.click("text=Guardar PIN");
    await dueno.waitForSelector("text=PIN de autorización guardado");
    await dueno.goto(`${BASE}/${slug}/onboarding?paso=5`, { waitUntil: "networkidle" });
    ok(await dueno.locator('img[alt^="Código QR"]').isVisible(), "se genera el cartel con el QR del mostrador");
    await dueno.click("text=Ir a mi panel");
    await dueno.waitForURL(`**/${slug}/panel`);
    ok((await dueno.textContent("h1")).includes("Resumen"), "el dueño llega a su panel");

    console.log("2. Un cliente escanea el QR y obtiene su tarjeta");
    const ctxCliente = await navegador.newContext({ ...devices["Pixel 7"] });
    const cliente = await ctxCliente.newPage();
    await cliente.goto(`${BASE}/${slug}/registro`, { waitUntil: "networkidle" });
    await cliente.fill("[name=nombre]", "Luis Cliente");
    await cliente.fill("[name=celular]", "812345678");
    await cliente.check("[name=aceptaPrivacidad]");
    await cliente.click("button[type=submit]");
    ok((await cliente.textContent("form [role=alert]")).includes("9 dígitos"), "rechaza un celular que no es peruano");
    const celular = `9${id}0`.padEnd(9, "1").slice(0, 9);
    await cliente.fill("[name=celular]", celular);
    await cliente.check("[name=aceptaWhatsapp]");
    await cliente.click("button[type=submit]");
    await cliente.waitForURL("**/tarjeta/**");
    const urlTarjeta = cliente.url().split("?")[0];
    const token = urlTarjeta.split("/tarjeta/")[1];
    ok(/^[A-Za-z0-9_-]{22}$/.test(token), "la tarjeta tiene una URL con token aleatorio (no secuencial)");
    ok((await cliente.textContent("main")).includes("1 de 5 sellos"), "empieza con el sello de bienvenida");
    const manifest = await ctxCliente.request.get(`${urlTarjeta}/manifest.webmanifest`);
    ok(manifest.ok() && (await manifest.json()).display === "standalone", "la tarjeta es instalable (manifest PWA con la marca)");

    console.log("3. El barbero ingresa con su PIN, suma sellos y canjea la recompensa");
    const ctxBarbero = await navegador.newContext({ ...devices["Pixel 7"] });
    const barbero = await ctxBarbero.newPage();
    await barbero.goto(`${BASE}/${slug}/barbero`, { waitUntil: "networkidle" });
    for (const d of "0000") await barbero.click(`button:text-is("${d}")`);
    await barbero.click("button[type=submit]");
    await barbero.waitForSelector("[role=alert]:has-text('PIN incorrecto')");
    ok(true, "rechaza un PIN incorrecto");
    await barbero.click("text=Borrar");
    for (const d of "1357") await barbero.click(`button:text-is("${d}")`);
    await barbero.click("button[type=submit]");
    await barbero.waitForURL(`**/${slug}/barbero`);
    await barbero.goto(`${BASE}/${slug}/barbero?q=${celular}`, { waitUntil: "networkidle" });
    await barbero.click("text=Luis Cliente");
    await barbero.waitForURL("**/barbero/cliente/**");
    await barbero.waitForLoadState("networkidle");
    await barbero.click("text=Sumar sello");
    await barbero.click("text=Sí, sumar");
    await barbero.waitForSelector("text=Sello sumado");
    ok(true, "suma un sello con confirmación (2 de 5)");
    await barbero.waitForSelector("text=ya recibió su sello de hoy");
    ok(true, "bloquea un segundo sello el mismo día");
    for (let i = 3; i <= 5; i++) {
      if (await barbero.locator("text=Sello extra con autorización del dueño").isVisible()) await barbero.click("text=Sello extra con autorización del dueño");
      await barbero.fill("[name=pinDueno]", "8642");
      await barbero.click("text=Autorizar y sumar sello");
      await barbero.waitForSelector(`text=${i} de 5 sellos`);
    }
    ok(true, "con el PIN del dueño se autorizan sellos extra hasta completar la tarjeta");
    await barbero.waitForSelector("text=Canjear corte gratis");
    ok(true, "avisa claramente que el cliente tiene un corte gratis");
    await barbero.click("text=Canjear corte gratis");
    await barbero.click("text=Sí, canjear");
    await barbero.waitForSelector("text=Recompensa canjeada");
    await barbero.waitForSelector("text=0 de 5 sellos");
    ok(true, "al canjear, el contador se reinicia");
    await cliente.goto(urlTarjeta, { waitUntil: "networkidle" });
    const historial = await cliente.textContent("main");
    ok(historial.includes("Recompensa canjeada") && historial.includes("con Carlos"), "el cliente ve su historial con fecha y barbero");

    console.log("4. Aislamiento: otra barbería no puede ver ni tocar nada de la primera");
    const B = await altaBarberia(navegador, "Barberia Beta");
    const estado = async (ctx, ruta) => (await ctx.request.get(`${BASE}${ruta}`, { maxRedirects: 0 })).status();
    ok((await estado(B.ctx, `/${slug}/panel`)) === 404, "el dueño de B recibe 404 en el panel de A");
    ok((await estado(B.ctx, `/${slug}/panel/clientes`)) === 404, "…y en su lista de clientes");
    ok((await estado(B.ctx, `/${slug}/panel/clientes/exportar`)) === 404, "…y en su exportación CSV");
    ok((await estado(B.ctx, `/${B.slug}/tarjeta/${token}`)) === 404, "la tarjeta de A no existe bajo la barbería B");
    ok([307, 303].includes(await estado(ctxBarbero, `/${B.slug}/barbero`)), "el barbero de A no tiene sesión en B");
    const csv = await A.ctx.request.get(`${BASE}/${slug}/panel/clientes/exportar`);
    ok(csv.ok() && (await csv.text()).includes("Luis Cliente"), "el dueño de A sí exporta su propio CSV");
    const csvB = await B.ctx.request.get(`${BASE}/${B.slug}/panel/clientes/exportar`);
    ok(csvB.ok() && !(await csvB.text()).includes("Luis Cliente"), "el CSV de B no contiene clientes de A");
    // El mismo celular puede registrarse en B con una tarjeta distinta.
    await cliente.goto(`${BASE}/${B.slug}/registro`, { waitUntil: "networkidle" });
    await cliente.fill("[name=nombre]", "Luis Cliente");
    await cliente.fill("[name=celular]", celular);
    await cliente.check("[name=aceptaPrivacidad]");
    await cliente.click("button[type=submit]");
    await cliente.waitForURL(`**/${B.slug}/tarjeta/**`);
    ok(!cliente.url().includes(token), "el mismo celular obtiene una tarjeta separada en la otra barbería");

    console.log("5. Sin sesión no se entra a ningún panel");
    const anonimo = await navegador.newContext();
    ok([307, 303].includes(await estado(anonimo, `/${slug}/panel`)), "panel del dueño → redirige a ingresar");
    ok([307, 303].includes(await estado(anonimo, "/admin")), "panel de administración → redirige a ingresar");
    ok([307, 303].includes(await estado(anonimo, "/admin/barberias")), "lista de barberías → redirige a ingresar");

    const errores = [...A.errores, ...B.errores];
    ok(errores.length === 0, `sin errores de JavaScript en el navegador${errores.length ? `: ${errores.join(" | ")}` : ""}`);
    console.log(`\n✔ Flujo completo correcto (${pasos} comprobaciones).`);
  } finally {
    await navegador.close();
  }
})().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
