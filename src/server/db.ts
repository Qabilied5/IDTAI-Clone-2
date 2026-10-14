import sql from "mssql";

/**
 * Koneksi SQL Server (singleton). Hanya boleh diimpor dari kode server
 * (route handler / server action), jangan dari komponen "use client".
 */
const config: sql.config = {
  server: process.env.DB_SERVER ?? "localhost",
  // Jika DB_PORT diisi (port TCP tetap), instanceName diabaikan.
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    // Named instance (mis. SQLEXPRESS) -> pakai instanceName, JANGAN set port.
    // Butuh layanan "SQL Server Browser" berjalan.
    instanceName: process.env.DB_PORT ? undefined : process.env.DB_INSTANCE || undefined,
    encrypt: false, // set true jika DB di Azure / pakai TLS
    trustServerCertificate: true, // aman untuk dev lokal
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
};

// Simpan di globalThis supaya hot-reload `next dev` tidak membuat pool baru terus.
const g = globalThis as unknown as { __mssqlPool?: Promise<sql.ConnectionPool> };

export function getPool(): Promise<sql.ConnectionPool> {
  if (!g.__mssqlPool) {
    g.__mssqlPool = new sql.ConnectionPool(config).connect().catch((err) => {
      g.__mssqlPool = undefined; // izinkan retry di request berikutnya
      throw err;
    });
  }
  return g.__mssqlPool;
}

export { sql };
