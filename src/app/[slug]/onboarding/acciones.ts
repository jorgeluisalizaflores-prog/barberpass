"use server";
// Acciones del asistente de alta. Reutilizan los mismos servicios que el panel.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aEstado, texto, type EstadoForm } from "@/lib/acciones";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { actualizarMarca, actualizarPrograma } from "@/lib/servicios/marca";
import { completarOnboarding } from "@/lib/servicios/registro";

export async function pasoDatosAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia: b, actor } = await requerirDuenoActivo(slug);
  try {
    await actualizarMarca(b.id, {
      name: texto(fd, "name"), phone: texto(fd, "phone"), address: texto(fd, "address"), city: texto(fd, "city"),
      colorPrimary: b.colorPrimary, colorAccent: b.colorAccent, stampIcon: b.stampIcon, tagline: b.tagline,
    }, actor);
  } catch (e) { return aEstado(e); }
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/onboarding?paso=2`);
}

export async function pasoColoresAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia: b, actor } = await requerirDuenoActivo(slug);
  try {
    await actualizarMarca(b.id, {
      name: b.name, phone: b.phone, address: b.address, city: b.city,
      colorPrimary: texto(fd, "colorPrimary"), colorAccent: texto(fd, "colorAccent"), stampIcon: texto(fd, "stampIcon"), tagline: texto(fd, "tagline"),
    }, actor);
  } catch (e) { return aEstado(e); }
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/onboarding?paso=3`);
}

export async function pasoProgramaAccion(slug: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia: b, actor } = await requerirDuenoActivo(slug);
  try {
    await actualizarPrograma(b.id, {
      stampsRequired: texto(fd, "stampsRequired"), rewardText: texto(fd, "rewardText"),
      welcomeStampEnabled: fd.get("welcomeStampEnabled") === "on", welcomeStamps: texto(fd, "welcomeStamps") || "1", inactivityDays: b.inactivityDays,
    }, actor);
  } catch (e) { return aEstado(e); }
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/onboarding?paso=4`);
}

export async function finalizarOnboardingAccion(slug: string): Promise<void> {
  const { barberia } = await requerirDuenoActivo(slug);
  await completarOnboarding(barberia.id);
  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/panel`);
}
