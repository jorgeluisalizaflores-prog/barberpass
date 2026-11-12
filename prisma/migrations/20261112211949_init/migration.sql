-- CreateEnum
CREATE TYPE "BarbershopStatus" AS ENUM ('PRUEBA', 'ACTIVA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "StampType" AS ENUM ('CORTE', 'BIENVENIDA', 'EXTRA_AUTORIZADO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('YAPE', 'PLIN', 'TRANSFERENCIA', 'EFECTIVO', 'OTRO');

-- CreateEnum
CREATE TYPE "SessionRole" AS ENUM ('SUPER_ADMIN', 'DUENO', 'BARBERO');

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('SUPER_ADMIN', 'DUENO', 'BARBERO', 'CLIENTE', 'SISTEMA');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceMonthly" DECIMAL(10,2) NOT NULL,
    "maxBarbers" INTEGER,
    "maxCustomers" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "graceDays" INTEGER NOT NULL DEFAULT 5,
    "expiringNoticeDays" INTEGER NOT NULL DEFAULT 7,
    "contactWhatsapp" TEXT NOT NULL DEFAULT '',
    "basePrivacyPolicy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "SessionRole" NOT NULL,
    "superAdminId" TEXT,
    "ownerUserId" TEXT,
    "barberId" TEXT,
    "barbershopId" TEXT,
    "impersonatorId" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barbershop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "logoData" BYTEA,
    "logoMime" TEXT,
    "logoVersion" INTEGER NOT NULL DEFAULT 0,
    "colorPrimary" TEXT NOT NULL DEFAULT '#111827',
    "colorAccent" TEXT NOT NULL DEFAULT '#f59e0b',
    "stampIcon" TEXT NOT NULL DEFAULT 'TIJERA',
    "tagline" TEXT NOT NULL DEFAULT 'Escanea y gana un corte gratis',
    "stampsRequired" INTEGER NOT NULL DEFAULT 5,
    "rewardText" TEXT NOT NULL DEFAULT 'Corte gratis',
    "welcomeStampEnabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeStamps" INTEGER NOT NULL DEFAULT 1,
    "inactivityDays" INTEGER NOT NULL DEFAULT 30,
    "winbackTemplate" TEXT NOT NULL DEFAULT '',
    "birthdayTemplate" TEXT NOT NULL DEFAULT '',
    "privacyPolicy" TEXT NOT NULL DEFAULT '',
    "ownerPinHash" TEXT,
    "planId" TEXT NOT NULL,
    "status" "BarbershopStatus" NOT NULL DEFAULT 'PRUEBA',
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "paidUntil" TIMESTAMP(3),
    "suspendedNote" TEXT NOT NULL DEFAULT '',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barbershop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerUser" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barber" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Barber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDay" INTEGER,
    "birthMonth" INTEGER,
    "cardToken" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "privacyAcceptedAt" TIMESTAMP(3) NOT NULL,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "whatsappOptInAt" TIMESTAMP(3),
    "stampsCount" INTEGER NOT NULL DEFAULT 0,
    "totalStamps" INTEGER NOT NULL DEFAULT 0,
    "totalRedemptions" INTEGER NOT NULL DEFAULT 0,
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stamp" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "barberId" TEXT,
    "type" "StampType" NOT NULL DEFAULT 'CORTE',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "localDate" CHAR(10) NOT NULL,
    "dailyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "barberId" TEXT,
    "stampsUsed" INTEGER NOT NULL,
    "rewardText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT NOT NULL,
    "planId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "months" INTEGER NOT NULL DEFAULT 1,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "externalRef" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "barbershopId" TEXT,
    "actorRole" "ActorRole" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL DEFAULT '',
    "impersonatorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_barbershopId_idx" ON "Session"("barbershopId");

-- CreateIndex
CREATE INDEX "LoginAttempt_key_createdAt_idx" ON "LoginAttempt"("key", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Barbershop_slug_key" ON "Barbershop"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerUser_email_key" ON "OwnerUser"("email");

-- CreateIndex
CREATE INDEX "OwnerUser_barbershopId_idx" ON "OwnerUser"("barbershopId");

-- CreateIndex
CREATE UNIQUE INDEX "Barber_barbershopId_id_key" ON "Barber"("barbershopId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_cardToken_key" ON "Customer"("cardToken");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_qrToken_key" ON "Customer"("qrToken");

-- CreateIndex
CREATE INDEX "Customer_barbershopId_name_idx" ON "Customer"("barbershopId", "name");

-- CreateIndex
CREATE INDEX "Customer_barbershopId_lastVisitAt_idx" ON "Customer"("barbershopId", "lastVisitAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_barbershopId_phone_key" ON "Customer"("barbershopId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_barbershopId_id_key" ON "Customer"("barbershopId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Stamp_dailyKey_key" ON "Stamp"("dailyKey");

-- CreateIndex
CREATE INDEX "Stamp_barbershopId_createdAt_idx" ON "Stamp"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "Stamp_barbershopId_customerId_createdAt_idx" ON "Stamp"("barbershopId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Stamp_barbershopId_barberId_idx" ON "Stamp"("barbershopId", "barberId");

-- CreateIndex
CREATE INDEX "Redemption_barbershopId_createdAt_idx" ON "Redemption"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "Redemption_barbershopId_customerId_idx" ON "Redemption"("barbershopId", "customerId");

-- CreateIndex
CREATE INDEX "Payment_barbershopId_paidAt_idx" ON "Payment"("barbershopId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "AuditLog_barbershopId_createdAt_idx" ON "AuditLog"("barbershopId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "Barbershop" ADD CONSTRAINT "Barbershop_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerUser" ADD CONSTRAINT "OwnerUser_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barber" ADD CONSTRAINT "Barber_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_barbershopId_customerId_fkey" FOREIGN KEY ("barbershopId", "customerId") REFERENCES "Customer"("barbershopId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stamp" ADD CONSTRAINT "Stamp_barbershopId_barberId_fkey" FOREIGN KEY ("barbershopId", "barberId") REFERENCES "Barber"("barbershopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_barbershopId_customerId_fkey" FOREIGN KEY ("barbershopId", "customerId") REFERENCES "Customer"("barbershopId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_barbershopId_barberId_fkey" FOREIGN KEY ("barbershopId", "barberId") REFERENCES "Barber"("barbershopId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
