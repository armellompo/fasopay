-- CreateEnum
CREATE TYPE "TaxAuthority" AS ENUM ('DGI', 'CNSS', 'FSP');

-- CreateTable
CREATE TABLE "TaxFiling" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "authority" "TaxAuthority" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxFiling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxFiling_runId_authority_key" ON "TaxFiling"("runId", "authority");

-- AddForeignKey
ALTER TABLE "TaxFiling" ADD CONSTRAINT "TaxFiling_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
