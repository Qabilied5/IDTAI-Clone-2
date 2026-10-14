import crypto from "node:crypto";

import { getPool, sql } from "@/server/db";

/**
 * Penyimpanan konfigurasi channel/platform di SQL Server.
 * Nilai rahasia (token, dll.) dienkripsi AES-256-GCM sebelum masuk database.
 *
 * Env wajib: INTEGRATION_ENC_KEY = 32 byte dalam base64. Buat dengan:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * JANGAN hilangkan/ganti key ini setelah ada data, kalau tidak token lama tidak bisa dibuka.
 */

export type IntegrationStatus = "connected" | "pending" | "disconnected";

export interface IntegrationRecord {
  key: string;
  status: IntegrationStatus;
  accountLabel: string | null;
  lastStatus: string | null;
  connectedAt: Date | null;
  settings: Record<string, string>;
}

/** Field yang selalu dianggap rahasia (dienkripsi). */
const DEFAULT_SECRET_KEYS = new Set([
  "token",
  "accessToken",
  "verifyToken",
  "apiKey",
  "clientSecret",
  "secret",
]);

const PREFIX = "enc:v1:";

function encKey(): Buffer {
  const b64 = process.env.INTEGRATION_ENC_KEY;
  if (!b64) throw new Error("INTEGRATION_ENC_KEY belum di-set di .env");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("INTEGRATION_ENC_KEY harus 32 byte (base64)");
  return key;
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, data].map((b) => b.toString("base64")).join(":");
}

function decrypt(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export interface OrganizationRow { id: string; name: string; slug: string }

/** Semua perusahaan AKTIF (id sudah huruf kecil). */
export async function listOrganizations(): Promise<OrganizationRow[]> {
  const pool = await getPool();
  const res = await pool.request().query(
    `SELECT Id, Name, Slug FROM dbo.Organizations WHERE IsActive = 1 ORDER BY CreatedAt`
  );
  return res.recordset.map((r) => ({ id: String(r.Id).toLowerCase(), name: r.Name, slug: r.Slug }));
}

/** Ambil status + semua setting satu channel milik satu perusahaan (rahasia sudah didekripsi). */
export async function getIntegration(orgId: string, key: string): Promise<IntegrationRecord | null> {
  const pool = await getPool();
  const head = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .input("key", sql.NVarChar(50), key)
    .query(
      `SELECT IntegrationKey, Status, AccountLabel, LastStatus, ConnectedAt
       FROM dbo.Integrations WHERE OrganizationId = @org AND IntegrationKey = @key`
    );
  const row = head.recordset[0];
  if (!row) return null;

  const rows = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .input("key", sql.NVarChar(50), key)
    .query(
      `SELECT SettingKey, SettingValue, IsSecret
       FROM dbo.IntegrationSettings WHERE OrganizationId = @org AND IntegrationKey = @key`
    );

  const settings: Record<string, string> = {};
  for (const r of rows.recordset) {
    const v: string = r.SettingValue ?? "";
    settings[r.SettingKey] = r.IsSecret ? decrypt(v) : v;
  }

  return {
    key: row.IntegrationKey,
    status: row.Status,
    accountLabel: row.AccountLabel,
    lastStatus: row.LastStatus,
    connectedAt: row.ConnectedAt,
    settings,
  };
}

/** Semua channel satu perusahaan (tanpa setting). */
export async function listIntegrations(orgId: string): Promise<Omit<IntegrationRecord, "settings">[]> {
  const pool = await getPool();
  const res = await pool
    .request()
    .input("org", sql.UniqueIdentifier, orgId)
    .query(
      `SELECT IntegrationKey, Status, AccountLabel, LastStatus, ConnectedAt
       FROM dbo.Integrations WHERE OrganizationId = @org`
    );
  return res.recordset.map((r) => ({
    key: r.IntegrationKey,
    status: r.Status,
    accountLabel: r.AccountLabel,
    lastStatus: r.LastStatus,
    connectedAt: r.ConnectedAt,
  }));
}

/** Simpan/ganti konfigurasi channel satu perusahaan dan tandai terhubung. Atomik. */
export async function saveIntegration(
  orgId: string,
  key: string,
  values: Record<string, string>,
  opts: {
    status?: IntegrationStatus;
    accountLabel?: string | null;
    lastStatus?: string | null;
    secretKeys?: string[];
  } = {}
): Promise<void> {
  const secrets = new Set([...DEFAULT_SECRET_KEYS, ...(opts.secretKeys ?? [])]);
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx)
      .input("org", sql.UniqueIdentifier, orgId)
      .input("key", sql.NVarChar(50), key)
      .input("status", sql.NVarChar(20), opts.status ?? "connected")
      .input("label", sql.NVarChar(255), opts.accountLabel ?? null)
      .input("last", sql.NVarChar(255), opts.lastStatus ?? null)
      .query(
        `MERGE dbo.Integrations AS t
         USING (SELECT @org AS OrganizationId, @key AS IntegrationKey) AS s
           ON t.OrganizationId = s.OrganizationId AND t.IntegrationKey = s.IntegrationKey
         WHEN MATCHED THEN UPDATE SET Status = @status, AccountLabel = @label, LastStatus = @last,
              ConnectedAt = CASE WHEN @status = 'connected' AND t.ConnectedAt IS NULL
                                 THEN SYSUTCDATETIME() ELSE t.ConnectedAt END,
              UpdatedAt = SYSUTCDATETIME()
         WHEN NOT MATCHED THEN INSERT (OrganizationId, IntegrationKey, Status, AccountLabel, LastStatus, ConnectedAt)
              VALUES (@org, @key, @status, @label, @last,
                      CASE WHEN @status = 'connected' THEN SYSUTCDATETIME() END);`
      );

    for (const [k, raw] of Object.entries(values)) {
      const v = (raw ?? "").trim();
      const isSecret = secrets.has(k);
      await new sql.Request(tx)
        .input("org", sql.UniqueIdentifier, orgId)
        .input("key", sql.NVarChar(50), key)
        .input("sk", sql.NVarChar(100), k)
        .input("val", sql.NVarChar(sql.MAX), isSecret && v ? encrypt(v) : v)
        .input("sec", sql.Bit, isSecret)
        .query(
          `MERGE dbo.IntegrationSettings AS t
           USING (SELECT @org AS OrganizationId, @key AS IntegrationKey, @sk AS SettingKey) AS s
             ON t.OrganizationId = s.OrganizationId AND t.IntegrationKey = s.IntegrationKey
            AND t.SettingKey = s.SettingKey
           WHEN MATCHED THEN UPDATE SET SettingValue = @val, IsSecret = @sec, UpdatedAt = SYSUTCDATETIME()
           WHEN NOT MATCHED THEN INSERT (OrganizationId, IntegrationKey, SettingKey, SettingValue, IsSecret)
                VALUES (@org, @key, @sk, @val, @sec);`
        );
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

/** Putuskan channel satu perusahaan: hapus semua setting, status jadi disconnected. */
export async function clearIntegration(orgId: string, key: string): Promise<void> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await new sql.Request(tx)
      .input("org", sql.UniqueIdentifier, orgId)
      .input("key", sql.NVarChar(50), key)
      .query(`DELETE FROM dbo.IntegrationSettings WHERE OrganizationId = @org AND IntegrationKey = @key`);
    await new sql.Request(tx)
      .input("org", sql.UniqueIdentifier, orgId)
      .input("key", sql.NVarChar(50), key)
      .query(
        `UPDATE dbo.Integrations
         SET Status = 'disconnected', AccountLabel = NULL, LastStatus = NULL,
             ConnectedAt = NULL, UpdatedAt = SYSUTCDATETIME()
         WHERE OrganizationId = @org AND IntegrationKey = @key`
      );
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}
