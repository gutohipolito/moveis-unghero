type FormLgpdNoticeProps = {
  className?: string;
  /** Texto complementar do propósito do formulário (opcional). */
  purpose?: string;
};

const DEFAULT_PURPOSE =
  "atendimento, elaboração de orçamento, agendamentos, envio de documentos e acompanhamento do projeto";

export default function FormLgpdNotice({
  className = "",
  purpose = DEFAULT_PURPOSE,
}: FormLgpdNoticeProps) {
  return (
    <p
      className={`mt-6 min-w-0 w-full max-w-[min(28rem,100%)] text-[10px] font-medium text-slate-500 leading-relaxed text-center mx-auto break-words ${className}`}
    >
      De acordo com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), as informações
      enviadas neste formulário serão tratadas com confidencialidade e utilizadas apenas para{" "}
      {purpose}.
    </p>
  );
}
