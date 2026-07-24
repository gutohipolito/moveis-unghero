import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/constants";

/**
 * Bootstrap de admin — desabilitado por padrão.
 * Só funciona com ALLOW_ADMIN_BOOTSTRAP=true + ADMIN_SETUP_SECRET.
 * Em produção (VERCEL_ENV=production) exige também ALLOW_ADMIN_BOOTSTRAP_PROD=true
 * para evitar reativação acidental só com o flag de bootstrap.
 */
async function handleCreateAdmin(request: NextRequest) {
  if (process.env.ALLOW_ADMIN_BOOTSTRAP !== "true") {
    return NextResponse.json(
      { success: false, error: "Bootstrap de admin desativado." },
      { status: 404 }
    );
  }

  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.ALLOW_ADMIN_BOOTSTRAP_PROD !== "true"
  ) {
    return NextResponse.json(
      { success: false, error: "Bootstrap de admin desativado em produção." },
      { status: 404 }
    );
  }

  const setupSecret = process.env.ADMIN_SETUP_SECRET;
  if (!setupSecret) {
    return NextResponse.json(
      { success: false, error: "ADMIN_SETUP_SECRET não configurado." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const providedSecret = body?.secret;
  const email = body?.email || ADMIN_EMAIL;
  const password = body?.password;

  if (providedSecret !== setupSecret) {
    return NextResponse.json(
      { success: false, error: "Secret inválido." },
      { status: 403 }
    );
  }

  if (!password || typeof password !== "string" || password.length < 12) {
    return NextResponse.json(
      { success: false, error: "Campo password é obrigatório (mín. 12 caracteres)." },
      { status: 400 }
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { cargo: "ADMIN" },
    select: { id: true, email: true },
  });

  if (existingAdmin && process.env.ALLOW_ADMIN_RECREATE !== "true") {
    return NextResponse.json(
      {
        success: false,
        error:
          "Já existe um administrador no sistema. Remova ALLOW_ADMIN_BOOTSTRAP após o bootstrap.",
      },
      { status: 403 }
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

export async function POST(request: NextRequest) {
  return handleCreateAdmin(request);
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Use POST com JSON { secret, email, password }. GET desativado por segurança.",
    },
    { status: 405 }
  );
}
