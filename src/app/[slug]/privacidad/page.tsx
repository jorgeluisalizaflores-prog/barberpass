import type { Metadata } from "next";
import { requerirBarberia } from "@/lib/auth/guardas";

export const metadata: Metadata = { title: "Política de privacidad" };

export default async function PaginaPrivacidad({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirBarberia(slug);
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">{barberia.name}</h1>
      <article className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700">
        {barberia.privacyPolicy || "La barbería aún no publicó su política de privacidad."}
      </article>
    </main>
  );
}
