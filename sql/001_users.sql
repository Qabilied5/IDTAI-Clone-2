-- Jalankan di SSMS (terhubung ke localhost\MSSQLSERVER01)
USE IndotradingAI_Dev;
GO

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id           UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWID(),
    Name         NVARCHAR(100)    NOT NULL,
    Email        NVARCHAR(255)    NOT NULL,
    PasswordHash NVARCHAR(255)    NOT NULL,   -- bcrypt hash, BUKAN password asli
    Role         NVARCHAR(20)     NOT NULL
                 CONSTRAINT CK_Users_Role CHECK (Role IN ('super_admin','admin','agent','viewer')),
    IsActive     BIT              NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    LastLoginAt  DATETIME2        NULL,
    CreatedAt    DATETIME2        NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
  );
  CREATE UNIQUE INDEX UX_Users_Email ON dbo.Users (Email);
END
GO

-- Buat hash dulu:  node scripts/hash-password.mjs "PasswordAnda123"
-- lalu tempel hasilnya di bawah ini.
INSERT INTO dbo.Users (Name, Email, PasswordHash, Role)
VALUES (N'Super Admin', N'admin@indotrading.com', N'<<PASTE_BCRYPT_HASH>>', 'super_admin');
GO
