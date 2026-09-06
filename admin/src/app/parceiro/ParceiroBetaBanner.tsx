const NOTICE = "Portal em testes — alguns dados ainda podem mudar.";

export default function ParceiroBetaBanner() {
  return (
    <div className="parceiro-portal-beta-banner" role="status">
      <div className="parceiro-portal-beta-banner-inner">
        <span className="parceiro-portal-beta-banner-chip">Beta</span>
        <p className="parceiro-portal-beta-banner-copy">{NOTICE}</p>
      </div>
    </div>
  );
}
