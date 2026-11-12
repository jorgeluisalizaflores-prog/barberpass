import { Cartel } from "@/components/cartel";
import { Titulo } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { qrPngDataUrl } from "@/lib/qr";
import { urlLogo } from "@/lib/tenancy/resolver";
import { urlBasePublica } from "@/lib/url";

export default async function PaginaCartel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirDuenoActivo(slug);
  const urlRegistro = `${await urlBasePublica()}/${slug}/registro`;
  return (
    <>
      <div className="no-imprimir">
        <Titulo descripcion="Imprímelo y ponlo en el mostrador o frente al espejo. Tus clientes lo escanean y se registran solos.">Cartel con QR</Titulo>
      </div>
      <Cartel
        nombre={barberia.name} texto={barberia.tagline} recompensa={barberia.rewardText} sellos={barberia.stampsRequired}
        urlRegistro={urlRegistro} qrDataUrl={await qrPngDataUrl(urlRegistro, 800)} logoUrl={urlLogo(barberia)} slug={slug}
      />
    </>
  );
}
