-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SitepingFeedback" (
    "id" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "url" TEXT NOT NULL,
    "urlPattern" TEXT,
    "screenshotUrl" TEXT,
    "screenshotRegion" JSONB,
    "diagnostics" JSONB,
    "viewport" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitepingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitepingAnnotation" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "cssSelector" TEXT NOT NULL,
    "xpath" TEXT NOT NULL,
    "textSnippet" TEXT NOT NULL,
    "elementTag" TEXT NOT NULL,
    "elementId" TEXT,
    "textPrefix" TEXT NOT NULL,
    "textSuffix" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "neighborText" TEXT NOT NULL,
    "anchorKey" TEXT,
    "xPct" DOUBLE PRECISION NOT NULL,
    "yPct" DOUBLE PRECISION NOT NULL,
    "wPct" DOUBLE PRECISION NOT NULL,
    "hPct" DOUBLE PRECISION NOT NULL,
    "scrollX" DOUBLE PRECISION NOT NULL,
    "scrollY" DOUBLE PRECISION NOT NULL,
    "viewportW" INTEGER NOT NULL,
    "viewportH" INTEGER NOT NULL,
    "devicePixelRatio" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitepingAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SitepingFeedback_clientId_key" ON "SitepingFeedback"("clientId");

-- CreateIndex
CREATE INDEX "SitepingFeedback_projectName_idx" ON "SitepingFeedback"("projectName");

-- CreateIndex
CREATE INDEX "SitepingFeedback_projectName_status_createdAt_idx" ON "SitepingFeedback"("projectName", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SitepingFeedback_projectName_url_idx" ON "SitepingFeedback"("projectName", "url");

-- CreateIndex
CREATE INDEX "SitepingAnnotation_feedbackId_idx" ON "SitepingAnnotation"("feedbackId");

-- AddForeignKey
ALTER TABLE "SitepingAnnotation" ADD CONSTRAINT "SitepingAnnotation_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "SitepingFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
