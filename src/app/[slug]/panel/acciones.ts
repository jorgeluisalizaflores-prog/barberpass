"use server";
// Acciones del panel del dueño. TODAS empiezan verificando la sesión del dueño
// para ESTA barbería y que la suscripción no esté bloqueada.
import { revalidatePath } from "next/cache";
import { aEstado, texto, type EstadoForm } from "@/lib/acciones";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { cambiarEstadoBarbero, cambiarPinBarbero, crearBarbero } from "@/lib/servicios/barberos";
import { actualizarMarca, actualizarPrograma, actualizarTextos, guardarLogo, guardarPinDueno, LOGO_MAX_BYTES } from "@/lib/servicios/marca";

function refrescar(slug: string) {
  revalidatePath(`/${slug}`, "layout");
}

// ── Barberos ──
export async function crearBarberoAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    const b = await crearBarbero(barberia.id, { nombre: texto(fd, "nombre"), pin: texto(fd, "pin") }, actor);
    refrescar(slug);
    return { ok: `${b.name} ya puede ingresar con su PIN.` };
  } catch (e) { return aEstado(e); }
}

export async function estadoBarberoAccion(slug: string, barberId: string, activo: boolean, _p: EstadoForm, _fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    await cambiarEstadoBarbero(barberia.id, barberId, activo, actor);
    refrescar(slug);
    return {};
  } catch (e) { return aEstado(e); }
}

export async function pinBarberoAccion(slug: string, barberId: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    await cambiarPinBarbero(barberia.id, barberId, texto(fd, "pin"), actor);
    return { ok: "PIN actualizado." };
  } catch (e) { return aEstado(e); }
}

// ── Marca y programa ──
export async function marcaAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    await actualizarMarca(barberia.id, {
      name: texto(fd, "name"), phone: texto(fd, "phone"), address: texto(fd, "address"), city: texto(fd, "city"),
      colorPrimary: texto(fd, "colorPrimary"), colorAccent: texto(fd, "colorAccent"), stampIcon: texto(fd, "stampIcon"), tagline: texto(fd, "tagline"),
    }, actor);
    refrescar(slug);
    return { ok: "Marca guardada." };
  } catch (e) { return aEstado(e); }
}

export async function programaAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    await actualizarPrograma(barberia.id, {
      stampsRequired: texto(fd, "stampsRequired"), rewardText: texto(fd, "rewardText"),
      welcomeStampEnabled: fd.get("welcomeStampEnabled") === "on", welcomeStamps: texto(fd, "welcomeStamps") || "1",
      inactivityDays: texto(fd, "inactivityDays") || String(barberia.inactivityDays),
    }, actor);
    refrescar(slug);
    return { ok: "Programa de fidelidad guardado." };
  } catch (e) { return aEstado(e); }
}

/** Sube (o quita) el logo. La imagen llega ya reducida desde el navegador. */
export async function logoAccion(slug: string, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    const archivo = fd.get("logo");
    if (archivo instanceof File && archivo.size > 0) {
      if (archivo.size > LOGO_MAX_BYTES) return { error: "El logo debe pesar menos de 400 KB." };
      await guardarLogo(barberia.id, new Uint8Array(await archivo.arrayBuffer()), actor);
    } else {
      await guardarLogo(barberia.id, null, actor);
    }
    refrescar(slug);
    return { ok: "Logo actualizado." };
  } catch (e) { return aEstado(e); }
}

export async function pinDuenoAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    await guardarPinDueno(barberia.id, texto(fd, "pin"), actor);
    return { ok: "PIN de autorización guardado." };
  } catch (e) { return aEstado(e); }
}

export async function textosAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, actor } = await requerirDuenoActivo(slug);
  try {
    const datos: Record<string, string> = {};
    for (const campo of ["winbackTemplate", "birthdayTemplate", "privacyPolicy"]) if (fd.has(campo)) datos[campo] = texto(fd, campo);
    await actualizarTextos(barberia.id, datos, actor);
    if (fd.has("inactivityDays")) {
      await actualizarPrograma(barberia.id, {
        stampsRequired: barberia.stampsRequired, rewardText: barberia.rewardText, welcomeStampEnabled: barberia.welcomeStampEnabled,
        welcomeStamps: barberia.welcomeStamps, inactivityDays: texto(fd, "inactivityDays"),
      }, actor);
    }
    refrescar(slug);
    return { ok: "Guardado." };
  } catch (e) { return aEstado(e); }
}
