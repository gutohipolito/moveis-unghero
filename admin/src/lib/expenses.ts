// Tipos, rótulos e helpers para o módulo de Contas a Pagar / Despesas.

export type ExpenseNature = "FIXA" | "VARIAVEL";
export type ExpenseStatus = "PENDENTE" | "PAGO" | "CANCELADO";
export type ExpenseCategory =
  | "ALUGUEL"
  | "ENERGIA"
  | "AGUA"
  | "INTERNET_TELEFONE"
  | "SALARIOS"
  | "PRO_LABORE"
  | "IMPOSTOS"
  | "MATERIAL"
  | "FERRAGENS"
  | "TERCEIROS"
  | "FRETE_LOGISTICA"
  | "MARKETING"
  | "MANUTENCAO"
  | "EQUIPAMENTOS"
  | "COMBUSTIVEL"
  | "TAXAS_BANCARIAS"
  | "OUTROS";

export interface ExpenseDTO {
  id: string;
  descricao: string;
  categoria: ExpenseCategory;
  natureza: ExpenseNature;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: ExpenseStatus;
  metodo_pagamento: string | null;
  supplier_id: string | null;
  supplier_nome: string | null;
  project_id: string | null;
  project_label: string | null;
  fornecedor_nome: string | null;
  observacoes: string | null;
  grupo_id: string | null;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ALUGUEL: "Aluguel",
  ENERGIA: "Energia elétrica",
  AGUA: "Água",
  INTERNET_TELEFONE: "Internet / Telefone",
  SALARIOS: "Salários",
  PRO_LABORE: "Pró-labore",
  IMPOSTOS: "Impostos e taxas",
  MATERIAL: "Material / Insumos",
  FERRAGENS: "Ferragens",
  TERCEIROS: "Serviços de terceiros",
  FRETE_LOGISTICA: "Frete / Logística",
  MARKETING: "Marketing",
  MANUTENCAO: "Manutenção",
  EQUIPAMENTOS: "Equipamentos",
  COMBUSTIVEL: "Combustível",
  TAXAS_BANCARIAS: "Taxas bancárias",
  OUTROS: "Outros",
};

export const EXPENSE_NATURE_LABELS: Record<ExpenseNature, string> = {
  FIXA: "Fixa",
  VARIAVEL: "Variável",
};

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

// Sugestão de natureza por categoria (o operador pode ajustar).
export const CATEGORY_DEFAULT_NATURE: Record<ExpenseCategory, ExpenseNature> = {
  ALUGUEL: "FIXA",
  ENERGIA: "FIXA",
  AGUA: "FIXA",
  INTERNET_TELEFONE: "FIXA",
  SALARIOS: "FIXA",
  PRO_LABORE: "FIXA",
  IMPOSTOS: "FIXA",
  MATERIAL: "VARIAVEL",
  FERRAGENS: "VARIAVEL",
  TERCEIROS: "VARIAVEL",
  FRETE_LOGISTICA: "VARIAVEL",
  MARKETING: "VARIAVEL",
  MANUTENCAO: "VARIAVEL",
  EQUIPAMENTOS: "VARIAVEL",
  COMBUSTIVEL: "VARIAVEL",
  TAXAS_BANCARIAS: "FIXA",
  OUTROS: "VARIAVEL",
};

export const EXPENSE_CATEGORY_OPTIONS = (
  Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]
).map((key) => ({ value: key, label: EXPENSE_CATEGORY_LABELS[key] }));

/** Uma despesa está vencida se ainda pendente e o vencimento já passou. */
export function isExpenseOverdue(expense: {
  status: ExpenseStatus;
  data_vencimento: string;
}): boolean {
  if (expense.status !== "PENDENTE") return false;
  const due = new Date(expense.data_vencimento);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}
