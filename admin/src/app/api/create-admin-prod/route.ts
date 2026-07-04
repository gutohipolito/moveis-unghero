import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { success: false, error: "ADMIN_SETUP_SECRET não configurado." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const providedSecret = searchParams.get("secret");
  if (providedSecret !== setupSecret) {
    return NextResponse.json(
      { success: false, error: "Secret inválido." },
      { status: 403 }
    );
  }

  const email = searchParams.get("email") || "admin@moveisunghero.com.br";
  const password = searchParams.get("password");
  if (!password) {
    return NextResponse.json(
      { success: false, error: "Parâmetro password é obrigatório." },
      { status: 400 }
    );
  }

  try {
    const company = await prisma.company.upsert({
      where: { id: "mock-company-id" },
      update: {},
      create: {
        id: "mock-company-id",
        nome: "Móveis Unghero",
        cnpj: "13.415.510/0001-71",
        telefone: "(54) 9 9997-1050",
        email: "moveisunghero@gmail.com",
      },
    });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      await prisma.account.deleteMany({ where: { userId: existingUser.id } });
      await prisma.session.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    await prisma.account.deleteMany({ where: { accountId: email } });

    const newUser = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Administrador Unghero",
        company_id: company.id,
        cargo: "ADMIN",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Administrador com email "${email}" criado com sucesso.`,
      user: {
        email: newUser.user.email,
        cargo: newUser.user.cargo,
        id: newUser.user.id,
      },
    });
  } catch (error) {
    console.error("Erro ao criar administrador:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
