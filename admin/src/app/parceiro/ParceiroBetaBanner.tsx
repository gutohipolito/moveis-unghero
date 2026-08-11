const NOTICE =
  "Ambiente de testes. Valores, ambientes e etapas podem estar incompletos ou incorretos.";

export default function ParceiroBetaBanner() {
  return (
    <div className="parceiro-portal-beta-banner" role="status">
      <div className="parceiro-portal-beta-banner-inner">
        <span className="parceiro-portal-beta-banner-chip">Testes</span>
        <p className="parceiro-portal-beta-banner-copy">{NOTICE}</p>
      </div>
    </div>
  );
}
