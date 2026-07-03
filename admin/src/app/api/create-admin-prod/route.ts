import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "admin@moveisunghero.com.br";
  const password = searchParams.get("password") || "admin@unghero";

  console.log(`Iniciando criação de usuário Administrador em produção para email: ${email}...`);

  try {
    // 1. Garante a empresa de demonstração
    const company = await prisma.company.upsert({
      where: { id: "mock-company-id" },
      update: {},
      create: {
        id: "mock-company-id",
        nome: "Móveis Unghero",
        cnpj: "13.415.510/0001-71",
        telefone: "(54) 9 9997-1050",
        email: "moveisunghero@gmail.com"
      }
    });

    // 2. Limpa qualquer usuário anterior com o mesmo e-mail para evitar duplicidade
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      await prisma.account.deleteMany({ where: { userId: existingUser.id } });
      await prisma.session.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // Limpa também qualquer credencial órfã ou residual associada a este e-mail na tabela Account
    await prisma.account.deleteMany({
      where: { accountId: email }
    });

    // 3. Cadastra o novo usuário Administrador via better-auth api
    const newUser = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Administrador Unghero",
        company_id: company.id,
        cargo: "ADMIN"
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Administrador com email "${email}" criado com sucesso em produção!`, 
      user: {
        email: newUser.user.email,
        cargo: newUser.user.cargo,
        id: newUser.user.id
      }
    });
  } catch (error) {
    console.error("Erro ao criar o usuário administrador em produção:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }, { status: 500 });
  }
}
