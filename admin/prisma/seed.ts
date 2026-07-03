import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando a semeadura (seed) do banco de dados...");

  // 1. Limpa dados antigos para evitar duplicidade de chaves únicas
  await prisma.timeline.deleteMany();
  await prisma.file.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log("Banco de dados limpo com sucesso!");

  // 2. Criar a empresa
  const company = await prisma.company.create({
    data: {
      id: "mock-company-id",
      nome: "Móveis Unghero",
      cnpj: "12.345.678/0001-90",
      telefone: "(54) 3451-2299",
      email: "contato@moveisunghero.com.br",
    },
  });
  console.log(`Empresa cadastrada: ${company.nome}`);

  // 3. Criar usuários por cargos
  const userAdmin = await prisma.user.create({
    data: {
      id: "system-admin-mock-id",
      name: "Gustavo Hipólito",
      email: "gustavo@moveisunghero.com.br",
      emailVerified: true,
      cargo: "ADMIN",
      company_id: company.id,
    },
  });

  const userComercial = await prisma.user.create({
    data: {
      name: "João da Silva",
      email: "joao.vendedor@moveisunghero.com.br",
      emailVerified: true,
      cargo: "COMERCIAL",
      company_id: company.id,
    },
  });

  const userProducao = await prisma.user.create({
    data: {
      name: "Carlos Marceneiro",
      email: "carlos.fabrica@moveisunghero.com.br",
      emailVerified: true,
      cargo: "PRODUCAO",
      company_id: company.id,
    },
  });

  console.log("Usuários criados com sucesso!");

  // 4. Criar Clientes e Projetos
  const client1 = await prisma.client.create({
    data: {
      id: "cli-1",
      company_id: company.id,
      nome: "Renato Silveira",
      cidade: "Caxias do Sul",
      origem: "INSTAGRAM",
      telefone: "(54) 99876-5432",
      email: "renato@email.com",
      observacoes: "Cliente em negociação para cozinha integrada em MDF amadeirado.",
      status: "LEAD",
    },
  });

  const project1 = await prisma.project.create({
    data: {
      client_id: client1.id,
      valor_previsto: 45000.0,
      status_geral: "LEAD",
    },
  });

  await prisma.environment.createMany({
    data: [
      { project_id: project1.id, nome: "Cozinha Americana", tipo: "COZINHA", status: "AGUARDANDO_MEDICAO" },
      { project_id: project1.id, nome: "Painel TV Sala", tipo: "OUTROS", status: "AGUARDANDO_MEDICAO" },
    ],
  });

  await prisma.timeline.create({
    data: {
      project_id: project1.id,
      user_id: userComercial.id,
      acao: "Primeiro contato efetuado. Cliente solicitou orçamento para sala e cozinha.",
      interno_sotamente: false,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      id: "cli-2",
      company_id: company.id,
      nome: "Mariana Rezende",
      cidade: "Farroupilha",
      origem: "INDICACAO",
      telefone: "(54) 99123-4567",
      email: "mariana@email.com",
      observacoes: "Indicada pelo arquiteto Felipe. Alto padrão.",
      status: "ORCAMENTO",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      client_id: client2.id,
      valor_previsto: 78000.0,
      status_geral: "ORCAMENTO",
    },
  });

  await prisma.environment.createMany({
    data: [
      { project_id: project2.id, nome: "Closet Suíte", tipo: "CLOSET", status: "EM_DETALHAMENTO" },
      { project_id: project2.id, nome: "Gabinete Banheiro", tipo: "BANHEIRO", status: "AGUARDANDO_MEDICAO" },
    ],
  });

  await prisma.timeline.create({
    data: {
      project_id: project2.id,
      user_id: userComercial.id,
      acao: "Briefing do projeto 3D alinhado com o arquiteto Felipe.",
      interno_sotamente: true,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      id: "cli-3",
      company_id: company.id,
      nome: "Juliana Castro",
      cidade: "Farroupilha",
      origem: "INSTAGRAM",
      telefone: "(54) 99555-4433",
      email: "juliana@email.com",
      observacoes: "Fechamento realizado. Prioridade alta no corte.",
      status: "PRODUCAO",
    },
  });

  const project3 = await prisma.project.create({
    data: {
      client_id: client3.id,
      valor_previsto: 89000.0,
      status_geral: "PRODUCAO",
    },
  });

  await prisma.environment.createMany({
    data: [
      { project_id: project3.id, nome: "Cozinha com Ilha", tipo: "COZINHA", status: "PRONTO_PRODUCAO" },
      { project_id: project3.id, nome: "Dormitório Infantil", tipo: "DORMITORIO", status: "EM_CORTE" },
    ],
  });

  // Criar arquivos técnicos simulados
  await prisma.file.createMany({
    data: [
      { project_id: project3.id, tipo: "PROJETO_TECNICO", url: "#", versao: 2, aprovado_producao: true },
      { project_id: project3.id, tipo: "RENDER", url: "#", versao: 1, aprovado_producao: false },
    ],
  });

  await prisma.timeline.createMany({
    data: [
      { project_id: project3.id, user_id: userComercial.id, acao: "Contrato comercial assinado e primeira parcela paga.", data: new Date("2026-06-15T18:00:00Z"), interno_sotamente: false },
      { project_id: project3.id, user_id: userProducao.id, acao: "Projeto técnico de cozinha liberado para usinagem/corte.", data: new Date("2026-06-20T10:00:00Z"), interno_sotamente: true },
    ],
  });

  console.log("Clientes, projetos, ambientes e timeline populados!");
  console.log("Semeadura (seed) finalizada com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro durante a semeadura:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
