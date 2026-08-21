-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN IF NOT EXISTS "tema" TEXT NOT NULL DEFAULT 'discord';
