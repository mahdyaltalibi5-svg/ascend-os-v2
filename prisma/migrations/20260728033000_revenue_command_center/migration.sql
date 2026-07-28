-- CreateTable
CREATE TABLE "RevenueGoal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "name" TEXT NOT NULL,
    "goalPeriod" TEXT NOT NULL,
    "goalType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetAmountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'prospect',
    "source" TEXT,
    "notes" TEXT,
    "externalProvider" TEXT,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOffering" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "revenueCategory" TEXT NOT NULL DEFAULT 'other',
    "defaultPriceCents" INTEGER,
    "billingType" TEXT NOT NULL DEFAULT 'one_time',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "externalProvider" TEXT,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceOfferingId" TEXT,
    "name" TEXT NOT NULL,
    "contractedAmountCents" INTEGER NOT NULL,
    "billingType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "expectedCloseDate" TIMESTAMP(3),
    "signedDate" TIMESTAMP(3),
    "cancellationDate" TIMESTAMP(3),
    "mrrAmountCents" INTEGER,
    "depositAmountCents" INTEGER,
    "notes" TEXT,
    "externalProvider" TEXT,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "RevenueContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "revenueContractId" TEXT,
    "externalProvider" TEXT,
    "externalInvoiceId" TEXT,
    "invoiceNumber" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "amountOutstandingCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "revenueContractId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "externalProvider" TEXT,
    "externalPaymentId" TEXT,
    "idempotencyKey" TEXT,
    "isRefunded" BOOLEAN NOT NULL DEFAULT false,
    "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRevenueSchedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "revenueContractId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextExpectedDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "externalProvider" TEXT,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRevenueSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueForecastSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "worstCaseAmountCents" INTEGER NOT NULL,
    "expectedAmountCents" INTEGER NOT NULL,
    "bestCaseAmountCents" INTEGER NOT NULL,
    "contractedAmountCents" INTEGER NOT NULL,
    "expectedCashAmountCents" INTEGER NOT NULL,
    "overdueAmountCents" INTEGER NOT NULL,
    "mrrCents" INTEGER NOT NULL,
    "assumptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueForecastSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueAdjustment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "revenueContractId" TEXT,
    "adjustmentType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueGoal_organizationId_goalType_startDate_endDate_idx" ON "RevenueGoal"("organizationId", "goalType", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "RevenueGoal_organizationId_status_primary_idx" ON "RevenueGoal"("organizationId", "status", "primary");

-- CreateIndex
CREATE INDEX "RevenueGoal_ownerUserId_idx" ON "RevenueGoal"("ownerUserId");

-- CreateIndex
CREATE INDEX "Client_organizationId_businessName_idx" ON "Client"("organizationId", "businessName");

-- CreateIndex
CREATE INDEX "Client_organizationId_status_idx" ON "Client"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Client_organizationId_archivedAt_idx" ON "Client"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "Client_organizationId_externalProvider_externalId_idx" ON "Client"("organizationId", "externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "ServiceOffering_organizationId_active_idx" ON "ServiceOffering"("organizationId", "active");

-- CreateIndex
CREATE INDEX "ServiceOffering_organizationId_revenueCategory_idx" ON "ServiceOffering"("organizationId", "revenueCategory");

-- CreateIndex
CREATE INDEX "ServiceOffering_organizationId_externalProvider_externalId_idx" ON "ServiceOffering"("organizationId", "externalProvider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOffering_organizationId_name_key" ON "ServiceOffering"("organizationId", "name");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_status_idx" ON "RevenueContract"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_clientId_idx" ON "RevenueContract"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_serviceOfferingId_idx" ON "RevenueContract"("organizationId", "serviceOfferingId");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_signedDate_idx" ON "RevenueContract"("organizationId", "signedDate");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_startDate_endDate_idx" ON "RevenueContract"("organizationId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_archivedAt_idx" ON "RevenueContract"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "RevenueContract_organizationId_externalProvider_externalId_idx" ON "RevenueContract"("organizationId", "externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_dueDate_idx" ON "Invoice"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_clientId_idx" ON "Invoice"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_revenueContractId_idx" ON "Invoice"("organizationId", "revenueContractId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_archivedAt_idx" ON "Invoice"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_externalProvider_externalInvoiceId_idx" ON "Invoice"("organizationId", "externalProvider", "externalInvoiceId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_paymentDate_idx" ON "Payment"("organizationId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_organizationId_status_idx" ON "Payment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Payment_organizationId_clientId_idx" ON "Payment"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_invoiceId_idx" ON "Payment"("organizationId", "invoiceId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_revenueContractId_idx" ON "Payment"("organizationId", "revenueContractId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_externalProvider_externalPaymentId_idx" ON "Payment"("organizationId", "externalProvider", "externalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_organizationId_idempotencyKey_key" ON "Payment"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "RecurringRevenueSchedule_organizationId_nextExpectedDate_idx" ON "RecurringRevenueSchedule"("organizationId", "nextExpectedDate");

-- CreateIndex
CREATE INDEX "RecurringRevenueSchedule_organizationId_status_idx" ON "RecurringRevenueSchedule"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RecurringRevenueSchedule_organizationId_clientId_idx" ON "RecurringRevenueSchedule"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "RecurringRevenueSchedule_organizationId_revenueContractId_idx" ON "RecurringRevenueSchedule"("organizationId", "revenueContractId");

-- CreateIndex
CREATE INDEX "RecurringRevenueSchedule_organizationId_externalProvider_ex_idx" ON "RecurringRevenueSchedule"("organizationId", "externalProvider", "externalId");

-- CreateIndex
CREATE INDEX "RevenueForecastSnapshot_organizationId_forecastDate_idx" ON "RevenueForecastSnapshot"("organizationId", "forecastDate");

-- CreateIndex
CREATE INDEX "RevenueForecastSnapshot_organizationId_periodStart_periodEn_idx" ON "RevenueForecastSnapshot"("organizationId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "RevenueAdjustment_organizationId_effectiveDate_idx" ON "RevenueAdjustment"("organizationId", "effectiveDate");

-- CreateIndex
CREATE INDEX "RevenueAdjustment_organizationId_adjustmentType_idx" ON "RevenueAdjustment"("organizationId", "adjustmentType");

-- CreateIndex
CREATE INDEX "RevenueAdjustment_organizationId_clientId_idx" ON "RevenueAdjustment"("organizationId", "clientId");

-- CreateIndex
CREATE INDEX "RevenueAdjustment_organizationId_invoiceId_idx" ON "RevenueAdjustment"("organizationId", "invoiceId");

-- CreateIndex
CREATE INDEX "RevenueAdjustment_organizationId_paymentId_idx" ON "RevenueAdjustment"("organizationId", "paymentId");

-- CreateIndex
CREATE INDEX "RevenueAdjustment_organizationId_revenueContractId_idx" ON "RevenueAdjustment"("organizationId", "revenueContractId");

-- AddForeignKey
ALTER TABLE "RevenueGoal" ADD CONSTRAINT "RevenueGoal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueGoal" ADD CONSTRAINT "RevenueGoal_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffering" ADD CONSTRAINT "ServiceOffering_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueContract" ADD CONSTRAINT "RevenueContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueContract" ADD CONSTRAINT "RevenueContract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueContract" ADD CONSTRAINT "RevenueContract_serviceOfferingId_fkey" FOREIGN KEY ("serviceOfferingId") REFERENCES "ServiceOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_revenueContractId_fkey" FOREIGN KEY ("revenueContractId") REFERENCES "RevenueContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_revenueContractId_fkey" FOREIGN KEY ("revenueContractId") REFERENCES "RevenueContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRevenueSchedule" ADD CONSTRAINT "RecurringRevenueSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRevenueSchedule" ADD CONSTRAINT "RecurringRevenueSchedule_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRevenueSchedule" ADD CONSTRAINT "RecurringRevenueSchedule_revenueContractId_fkey" FOREIGN KEY ("revenueContractId") REFERENCES "RevenueContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueForecastSnapshot" ADD CONSTRAINT "RevenueForecastSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAdjustment" ADD CONSTRAINT "RevenueAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAdjustment" ADD CONSTRAINT "RevenueAdjustment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAdjustment" ADD CONSTRAINT "RevenueAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAdjustment" ADD CONSTRAINT "RevenueAdjustment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAdjustment" ADD CONSTRAINT "RevenueAdjustment_revenueContractId_fkey" FOREIGN KEY ("revenueContractId") REFERENCES "RevenueContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAdjustment" ADD CONSTRAINT "RevenueAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

