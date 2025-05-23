-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Upcoming',
    "notes" TEXT,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "paymentId" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "audioFile" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Due',
    "due_date" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "sessionsCovered" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reflections" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."resource_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."performance_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "url" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metrics" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "sessions_clientId_idx" ON "public"."sessions"("clientId");

-- CreateIndex
CREATE INDEX "sessions_coachId_idx" ON "public"."sessions"("coachId");

-- CreateIndex
CREATE INDEX "sessions_date_idx" ON "public"."sessions"("date");

-- CreateIndex
CREATE INDEX "sessions_status_idx" ON "public"."sessions"("status");

-- CreateIndex
CREATE INDEX "sessions_paymentId_idx" ON "public"."sessions"("paymentId");

-- CreateIndex
CREATE INDEX "payments_clientId_idx" ON "public"."payments"("clientId");

-- CreateIndex
CREATE INDEX "payments_coachId_idx" ON "public"."payments"("coachId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_due_date_idx" ON "public"."payments"("due_date");

-- CreateIndex
CREATE INDEX "reflections_userId_idx" ON "public"."reflections"("userId");

-- CreateIndex
CREATE INDEX "reflections_created_at_idx" ON "public"."reflections"("created_at");

-- CreateIndex
CREATE INDEX "resources_type_idx" ON "public"."resources"("type");

-- CreateIndex
CREATE INDEX "resources_title_idx" ON "public"."resources"("title");

-- CreateIndex
CREATE INDEX "resource_users_userId_idx" ON "public"."resource_users"("userId");

-- CreateIndex
CREATE INDEX "resource_users_resourceId_idx" ON "public"."resource_users"("resourceId");

-- CreateIndex
CREATE INDEX "performance_metrics_userId_idx" ON "public"."performance_metrics"("userId");

-- CreateIndex
CREATE INDEX "performance_metrics_timestamp_idx" ON "public"."performance_metrics"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reflections" ADD CONSTRAINT "reflections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_users" ADD CONSTRAINT "resource_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."resource_users" ADD CONSTRAINT "resource_users_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "public"."resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
