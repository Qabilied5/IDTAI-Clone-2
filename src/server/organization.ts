import { getPool, sql } from "@/server/db";
import { runWithOrg } from "@/server/org-context";
import { state } from "@/server/state";
import { agentIdentitySave } from "@/server/store";
import { HttpError } from "@/server/users";

/* =============================================================
   Nama perusahaan = dbo.Organizations.Name (SATU sumber kebenaran).
   Nama ini dipakai di: sidebar/profil (lewat login), dan AI saat memperkenalkan diri
   ("asisten sales AI bernama {botName} dari {Organizations.Name}").
   Mengubah nama TIDAK mengubah Slug — slug dipakai kode untuk mengenali perusahaan (mis. "indotrading").
   ============================================================= */

export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

export const ORG_NAME_MIN = 2;
export const ORG_NAME_MAX = 150; // = panjang kolom Organizations.Name

export async function getOrganization(orgId: string): Promise<OrgInfo | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .query(`SELECT Id, Name, Slug FROM dbo.Organizations WHERE Id = @org`);
  const row = res.recordset[0];
  return row ? { id: String(row.Id).toLowerCase(), name: row.Name, slug: row.Slug } : null;
}

/** Ganti nama perusahaan: database + memori + identitas agent (AgentIdentity.CompanyName ikut sinkron). */
export async function renameOrganization(orgId: string, rawName: unknown): Promise<OrgInfo> {
  if (typeof rawName !== "string") throw new HttpError(400, "Nama perusahaan harus berupa teks.");
  const name = rawName.replace(/\s+/g, " ").trim();
  if (name.length < ORG_NAME_MIN || name.length > ORG_NAME_MAX) {
    throw new HttpError(400, `Nama perusahaan harus ${ORG_NAME_MIN}–${ORG_NAME_MAX} karakter.`);
  }

  const pool = await getPool();
  const res = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .input("name", sql.NVarChar(ORG_NAME_MAX), name)
    .query(`UPDATE dbo.Organizations SET Name = @name WHERE Id = @org`);
  if (!res.rowsAffected?.[0]) throw new HttpError(404, "Perusahaan tidak ditemukan.");

  // Balasan AI berikutnya langsung memakai nama baru; simpan juga ke AgentIdentity agar konsisten.
  runWithOrg(orgId, () => {
    state.companyIntro.companyName = name;
    agentIdentitySave();
  });

  const org = await getOrganization(orgId);
  if (!org) throw new HttpError(404, "Perusahaan tidak ditemukan.");
  return org;
}
