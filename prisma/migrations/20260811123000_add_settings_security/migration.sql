-- Baseline-safe migration: existing installations may already have the No table.
CREATE TABLE IF NOT EXISTS "No" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "conteudo" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "paiId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "No_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "No_paiId_idx" ON "No"("paiId");

CREATE TABLE IF NOT EXISTS "Configuracao" (
    "id" TEXT NOT NULL,
    "totpSecretCriptografado" TEXT,
    "totpConfiguradoEm" TIMESTAMP(3),
    "exigirPinArvore" BOOLEAN NOT NULL DEFAULT false,
    "acessoArquivo" TEXT NOT NULL DEFAULT 'LIVRE',
    "exigirPinCriar" BOOLEAN NOT NULL DEFAULT true,
    "exigirPinEditar" BOOLEAN NOT NULL DEFAULT true,
    "exigirPinRenomear" BOOLEAN NOT NULL DEFAULT true,
    "exigirPinMoverCopiar" BOOLEAN NOT NULL DEFAULT true,
    "exigirPinExcluir" BOOLEAN NOT NULL DEFAULT true,
    "exigirPinExportar" BOOLEAN NOT NULL DEFAULT false,
    "exigirPinBusca" BOOLEAN NOT NULL DEFAULT false,
    "exigirPinCommandBar" BOOLEAN NOT NULL DEFAULT true,
    "exigirPinUploadImagem" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "No" DROP CONSTRAINT IF EXISTS "No_paiId_fkey";
ALTER TABLE "No" ADD CONSTRAINT "No_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "No"("id") ON DELETE CASCADE ON UPDATE CASCADE;
