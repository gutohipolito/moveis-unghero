"use server";

import { prisma, isDatabaseOffline } from "@/lib/prisma";

export interface Supplier {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  principalMaterial: string;
}

export interface InventoryItem {
  id: string;
  nome: string;
  categoria: "CHAPAS_MDF" | "FERRAGENS" | "ILUMINACAO" | "TINTAS_QUIMICOS" | "OUTROS";
  quantidade: number;
  minima: number;
  precoCusto: number;
  supplierId?: string;
  supplierName?: string;
}

const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    nome: "Blum Brasil",
    cnpj: "12.345.678/0001-01",
    telefone: "(11) 98765-4321",
    email: "vendas@blum.com",
    principalMaterial: "Ferragens e Sistemas de Gavetas"
  },
  {
    id: "sup-2",
    nome: "Guararapes MDF",
    cnpj: "23.456.789/0001-02",
    telefone: "(41) 99123-4567",
    email: "contato@guararapes.com.br",
    principalMaterial: "Chapas de MDF e Compensados"
  },
  {
    id: "sup-3",
    nome: "FGV Ferragens",
    cnpj: "34.567.890/0001-03",
    telefone: "(11) 99234-5678",
    email: "comercial@fgv.com.br",
    principalMaterial: "Dobradiças e Corrediças Telescópicas"
  },
  {
    id: "sup-4",
    nome: "Leo Madeiras",
    cnpj: "45.678.901/0001-04",
    telefone: "(54) 3211-1234",
    email: "caxias@leomadeiras.com.br",
    principalMaterial: "Insumos, Chapas, Colas e Iluminação"
  }
];

const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1",
    nome: "Chapa MDF Guararapes Freijó Puro 18mm",
    categoria: "CHAPAS_MDF",
    quantidade: 15,
    minima: 10,
    precoCusto: 280.0,
    supplierId: "sup-2",
    supplierName: "Guararapes MDF"
  },
  {
    id: "inv-2",
    nome: "Dobradiça Blum 110º Clip Top com Amortecedor",
    categoria: "FERRAGENS",
    quantidade: 120,
    minima: 200,
    precoCusto: 18.5,
    supplierId: "sup-1",
    supplierName: "Blum Brasil"
  },
  {
    id: "inv-3",
    nome: "Corrediça Telescópica FGV H45 45cm",
    categoria: "FERRAGENS",
    quantidade: 80,
    minima: 50,
    precoCusto: 24.0,
    supplierId: "sup-3",
    supplierName: "FGV Ferragens"
  },
  {
    id: "inv-4",
    nome: "Fita de LED COB 240 Leds/m 3000K Warm 5m",
    categoria: "ILUMINACAO",
    quantidade: 8,
    minima: 15,
    precoCusto: 85.0,
    supplierId: "sup-4",
    supplierName: "Leo Madeiras"
  },
  {
    id: "inv-5",
    nome: "Cola de Contato Cascola Tradicional 1L",
    categoria: "TINTAS_QUIMICOS",
    quantidade: 12,
    minima: 5,
    precoCusto: 42.0,
    supplierId: "sup-4",
    supplierName: "Leo Madeiras"
  }
];

export async function getInventoryAndSuppliers(companyId: string) {
  if (isDatabaseOffline()) {
    return {
      success: true,
      suppliers: MOCK_SUPPLIERS,
      inventory: MOCK_INVENTORY
    };
  }

  try {
    return {
      success: true,
      suppliers: MOCK_SUPPLIERS,
      inventory: MOCK_INVENTORY
    };
  } catch (error) {
    return {
      success: true,
      suppliers: MOCK_SUPPLIERS,
      inventory: MOCK_INVENTORY
    };
  }
}

export async function createSupplierAction(data: Omit<Supplier, "id"> & { company_id: string }) {
  const newSupplier: Supplier = {
    id: `sup-${Date.now()}`,
    nome: data.nome,
    cnpj: data.cnpj,
    telefone: data.telefone,
    email: data.email,
    principalMaterial: data.principalMaterial
  };

  return {
    success: true,
    supplier: newSupplier
  };
}

export async function updateSupplierAction(id: string, data: Partial<Supplier>) {
  return {
    success: true,
    supplier: { id, ...data }
  };
}

export async function deleteSupplierAction(id: string) {
  return {
    success: true
  };
}

export async function createInventoryItemAction(data: Omit<InventoryItem, "id" | "supplierName"> & { company_id: string }) {
  const supplier = MOCK_SUPPLIERS.find(s => s.id === data.supplierId);
  const newItem: InventoryItem = {
    id: `inv-${Date.now()}`,
    nome: data.nome,
    categoria: data.categoria,
    quantidade: Number(data.quantidade),
    minima: Number(data.minima),
    precoCusto: Number(data.precoCusto),
    supplierId: data.supplierId,
    supplierName: supplier ? supplier.nome : "Sem Vínculo"
  };

  return {
    success: true,
    item: newItem
  };
}

export async function updateInventoryItemAction(id: string, data: Partial<InventoryItem>) {
  const supplier = MOCK_SUPPLIERS.find(s => s.id === data.supplierId);
  return {
    success: true,
    item: { 
      id, 
      ...data,
      supplierName: supplier ? supplier.nome : undefined 
    }
  };
}

export async function deleteInventoryItemAction(id: string) {
  return {
    success: true
  };
}
