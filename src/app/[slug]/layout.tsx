// Todo lo que cuelga de /<slug> pertenece a UNA barbería. Aquí se aplica su
// marca (colores desde la base de datos) mediante variables CSS.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { estiloMarca } from "@/lib/marca";
import { obtenerBarberiaPorSlug } from "@/lib/tenancy/resolver";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const barberia = await obtenerBarberiaPorSlug(slug);
  return barberia ? { title: { default: barberia.name, template: `%s · ${barberia.name}` } } : {};
}

export default async function LayoutBarberia({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barberia = await obtenerBarberiaPorSlug(slug);
  if (!barberia) notFound();
  return (
    <div style={estiloMarca(barberia)} className="flex min-h-screen flex-1 flex-col">
      {children}
    </div>
  );
}
