import { getPool, sql } from "@/server/db";

/** Dokumen JSON per perusahaan (tabel dbo.OrganizationData). */
export type OrgDataKey =
  | "knowledgeBase"
  | "picAgents"
  | "escalationSettings"
  | "companyIntro"
  | "pipeline";

export async function getOrgData(orgId: string, key: OrgDataKey): Promise<string | null> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .input("key", sql.NVarChar(50), key)
    .query(`SELECT JsonValue FROM dbo.OrganizationData WHERE OrganizationId = @org AND DataKey = @key`);
  return res.recordset[0]?.JsonValue ?? null;
}

export async function setOrgData(orgId: string, key: OrgDataKey, json: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .input("key", sql.NVarChar(50), key)
    .input("val", sql.NVarChar(sql.MAX), json)
    .query(
      `MERGE dbo.OrganizationData AS t
       USING (SELECT @org AS OrganizationId, @key AS DataKey) AS s
         ON t.OrganizationId = s.OrganizationId AND t.DataKey = s.DataKey
       WHEN MATCHED THEN UPDATE SET JsonValue = @val, UpdatedAt = SYSUTCDATETIME()
       WHEN NOT MATCHED THEN INSERT (OrganizationId, DataKey, JsonValue) VALUES (@org, @key, @val);`
    );
}
