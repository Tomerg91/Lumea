-- CreateTable
CREATE TABLE "public"."calendar_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "calendarId" TEXT,
    "calendarName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncErrors" JSONB,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_events" (
    "id" TEXT NOT NULL,
    "calendarIntegrationId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "attendees" JSONB,
    "recurrenceRule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "visibility" TEXT NOT NULL DEFAULT 'default',
    "sessionId" TEXT,
    "isCoachingSession" BOOLEAN NOT NULL DEFAULT false,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "syncErrors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."calendar_sync_logs" (
    "id" TEXT NOT NULL,
    "calendarIntegrationId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "eventsProcessed" INTEGER NOT NULL DEFAULT 0,
    "eventsCreated" INTEGER NOT NULL DEFAULT 0,
    "eventsUpdated" INTEGER NOT NULL DEFAULT 0,
    "eventsDeleted" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "calendar_integrations_userId_idx" ON "public"."calendar_integrations"("userId");

-- CreateIndex
CREATE INDEX "calendar_integrations_provider_idx" ON "public"."calendar_integrations"("provider");

-- CreateIndex
CREATE INDEX "calendar_integrations_isActive_idx" ON "public"."calendar_integrations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_integrations_userId_provider_key" ON "public"."calendar_integrations"("userId", "provider");

-- CreateIndex
CREATE INDEX "calendar_events_calendarIntegrationId_idx" ON "public"."calendar_events"("calendarIntegrationId");

-- CreateIndex
CREATE INDEX "calendar_events_startTime_idx" ON "public"."calendar_events"("startTime");

-- CreateIndex
CREATE INDEX "calendar_events_endTime_idx" ON "public"."calendar_events"("endTime");

-- CreateIndex
CREATE INDEX "calendar_events_sessionId_idx" ON "public"."calendar_events"("sessionId");

-- CreateIndex
CREATE INDEX "calendar_events_isCoachingSession_idx" ON "public"."calendar_events"("isCoachingSession");

-- CreateIndex
CREATE INDEX "calendar_events_isBlocked_idx" ON "public"."calendar_events"("isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_events_calendarIntegrationId_providerEventId_key" ON "public"."calendar_events"("calendarIntegrationId", "providerEventId");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_calendarIntegrationId_idx" ON "public"."calendar_sync_logs"("calendarIntegrationId");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_status_idx" ON "public"."calendar_sync_logs"("status");

-- CreateIndex
CREATE INDEX "calendar_sync_logs_startedAt_idx" ON "public"."calendar_sync_logs"("startedAt");

-- AddForeignKey
ALTER TABLE "public"."calendar_integrations" ADD CONSTRAINT "calendar_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_calendarIntegrationId_fkey" FOREIGN KEY ("calendarIntegrationId") REFERENCES "public"."calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_events" ADD CONSTRAINT "calendar_events_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calendar_sync_logs" ADD CONSTRAINT "calendar_sync_logs_calendarIntegrationId_fkey" FOREIGN KEY ("calendarIntegrationId") REFERENCES "public"."calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
