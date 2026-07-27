import PageHeader from "@/components/PageHeader";
import { TooltipBody } from "@/components/ui/InfoTooltip";
import { guardModule } from "@/lib/moduleAccess";
import { RELEASE_NOTES, SYSTEM_CAPABILITIES } from "@/lib/releaseNotes";

export default async function NotasDaVersaoPage() {
  await guardModule("notas-da-versao");

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        title="Notas da versão"
        description="Histórico da evolução do painel e visão do que o sistema cobre hoje."
        help={
          <TooltipBody
            title="Como usar"
            items={[
              "A primeira seção lista as principais funcionalidades por área.",
              "Em seguida vêm os marcos de evolução, do mais recente ao mais antigo.",
              "Não há datas — o foco é o que foi entregue em cada pacote.",
              "A Diretoria atualiza este conteúdo ao fechar um marco relevante.",
            ]}
          />
        }
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            Funcionalidades principais
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Inventário do que o painel oferece hoje, agrupado por área de operação.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
          {SYSTEM_CAPABILITIES.map((group) => (
            <div key={group.title} className="grid gap-3 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-800 sm:pt-0.5">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="relative pl-3.5 text-sm leading-relaxed text-neutral-700 before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-neutral-400"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            Marcos da evolução
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Pacotes de entrega que moldaram o sistema — do mais recente para o mais antigo.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
          {RELEASE_NOTES.map((note) => (
            <article key={note.title} className="px-5 py-5">
              <h3 className="text-base font-bold tracking-tight text-neutral-950">
                {note.title}
              </h3>
              {note.summary ? (
                <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{note.summary}</p>
              ) : null}
              <ul className="mt-3 space-y-1.5">
                {note.items.map((item) => (
                  <li
                    key={item}
                    className="relative pl-3.5 text-sm leading-relaxed text-neutral-700 before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-neutral-400"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
