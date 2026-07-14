/**
 * Snapshot diário do banco via branch Neon.
 * Cada backup é uma cópia pontual da branch production e é apagado após N dias.
 */

const NEON_API = "https://console.neon.tech/api/v2";
export const BACKUP_RETENTION_DAYS = 30;
export const BACKUP_PREFIX = "backup/";

type NeonBranch = {
  id: string;
  name: string;
  created_at: string;
  default?: boolean;
  protected?: boolean;
};

type NeonListBranchesResponse = {
  branches: NeonBranch[];
};

type NeonCreateBranchResponse = {
  branch: NeonBranch;
};

function requireConfig() {
  const apiKey = process.env.NEON_API_KEY?.trim();
  const projectId = process.env.NEON_PROJECT_ID?.trim();
  if (!apiKey || !projectId) {
    throw new Error(
      "Configure NEON_API_KEY e NEON_PROJECT_ID para backups automáticos."
    );
  }
  return { apiKey, projectId };
}

async function neonFetch<T>(
  path: string,
  apiKey: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${NEON_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Neon API ${response.status}: ${body.slice(0, 400)}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function todayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function backupBranchName(date = new Date()): string {
  return `${BACKUP_PREFIX}${todayStamp(date)}`;
}

/** Lista branches do projeto. */
export async function listNeonBranches(): Promise<NeonBranch[]> {
  const { apiKey, projectId } = requireConfig();
  const data = await neonFetch<NeonListBranchesResponse>(
    `/projects/${projectId}/branches`,
    apiKey
  );
  return data.branches ?? [];
}

/**
 * Cria (ou reaproveita) a branch diária de backup a partir da production.
 * Se já existir backup/YYYY-MM-DD, não cria de novo.
 */
export async function createDailyNeonBackup(): Promise<{
  created: boolean;
  branchName: string;
  branchId: string;
}> {
  const { apiKey, projectId } = requireConfig();
  const branches = await listNeonBranches();
  const parent =
    branches.find((b) => b.name === "production") ||
    branches.find((b) => b.default) ||
    branches[0];

  if (!parent) {
    throw new Error("Nenhuma branch Neon encontrada para usar como origem.");
  }

  const name = backupBranchName();
  const existing = branches.find((b) => b.name === name);
  if (existing) {
    return { created: false, branchName: existing.name, branchId: existing.id };
  }

  const created = await neonFetch<NeonCreateBranchResponse>(
    `/projects/${projectId}/branches`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        branch: {
          name,
          parent_id: parent.id,
        },
      }),
    }
  );

  return {
    created: true,
    branchName: created.branch.name,
    branchId: created.branch.id,
  };
}

/** Remove branches backup/* mais antigas que BACKUP_RETENTION_DAYS. */
export async function pruneOldNeonBackups(): Promise<{
  deleted: string[];
  kept: string[];
}> {
  const { apiKey, projectId } = requireConfig();
  const branches = await listNeonBranches();
  const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const deleted: string[] = [];
  const kept: string[] = [];

  for (const branch of branches) {
    if (!branch.name.startsWith(BACKUP_PREFIX)) continue;
    if (branch.default || branch.protected) {
      kept.push(branch.name);
      continue;
    }

    const createdAt = new Date(branch.created_at).getTime();
    if (Number.isNaN(createdAt) || createdAt >= cutoff) {
      kept.push(branch.name);
      continue;
    }

    await neonFetch<void>(
      `/projects/${projectId}/branches/${branch.id}`,
      apiKey,
      { method: "DELETE" }
    );
    deleted.push(branch.name);
  }

  return { deleted, kept };
}

export async function runDailyDatabaseBackup() {
  const snapshot = await createDailyNeonBackup();
  const prune = await pruneOldNeonBackups();
  return {
    snapshot,
    prune,
    retentionDays: BACKUP_RETENTION_DAYS,
  };
}
