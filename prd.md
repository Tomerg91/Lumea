# Product Requirements Document (PRD): Lumea Coaching Platform

## 1. Introduction & Vision

**Product:** Lumea  
**Vision:** To provide a secure, dedicated, calm, and supportive Progressive Web App (PWA) for the Satya Method coaching practice. Lumea aims to move beyond generic tools, offering a unified and specialized digital environment that fosters a serene, safe, and reflective space for both coaches and their clients.  
**Core Goal:** Build a 1-on-1 personal development coaching platform that is mobile-first, bilingual (Hebrew/RTL primary), and meets high standards of UI/UX and accessibility (WCAG 2.1 AA).

---

## 2. User Roles & Personas

*   **Client:** An individual receiving coaching. They need to reflect on sessions, track their journey, and access resources provided by their coach.
*   **Coach:** A certified Satya Method coach. They need to manage their clients, schedule sessions, keep private notes, share resources, and monitor client progress and payments.
*   **Platform Admin:** An administrator responsible for maintaining the platform's integrity. They onboard/approve new coaches and oversee platform-level metrics.

---

## 3. Key Feature Areas (Epics)

This PRD outlines the core user-facing features required to complete the Lumea application. The foundational work on security, compliance (HIPAA), performance, and i18n is largely complete. This plan focuses on building the application's primary functionality on that foundation.

The work is broken down into the following epics:

1.  **User Onboarding & Management**
2.  **Session & Scheduling Management**
3.  **Reflections Journal**
4.  **Coach's Private Notes**
5.  **Resource Center**
6.  **Client Progress Tracking**
7.  **Admin Dashboard & Coach Approval**
8.  **Technical Excellence & Debt Reduction**

---

## 4. Feature Breakdown & User Stories

### Epic 1: User Onboarding & Management
*As a user, I want to be able to register, log in, and manage my profile securely.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 1.1| User Registration | Client, Coach | A prospective coach or a new client can register for an account. Coach accounts require admin approval. |
| 1.2| User Login | All | Users can log in using their credentials. Implements the existing strong password and session management policies. |
| 1.3| Password Reset | All | Users can securely reset their password if they forget it. |
| 1.4| Profile Management | All | Users can view and edit their basic profile information (name, email). |
| 1.5| Coach-Client Association | Coach | A coach can invite a new client (via email) or be assigned a client by an admin. They can view a list of their active clients. |

### Epic 2: Session & Scheduling Management
*As a coach or client, I want to manage our coaching sessions seamlessly.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 2.1| Schedule Session | Coach | Coaches can schedule a new session (date, time, duration) for a specific client. |
| 2.2| View Session Calendar/List | Coach, Client | Users can see a list or calendar view of their upcoming and past sessions. |
| 2.3| Session Reminders | Client | The system sends an email/push notification reminder to the client 24 hours before a scheduled session. |
| 2.4| Reschedule/Cancel Session | Coach, Client | Users can request to reschedule or cancel a session, with a notification sent to the other party. Business rules for cancellation notice to be determined. |
| 2.5| Manual Payment Tracking | Coach | Coach can mark a session or a set of sessions as "Paid" or "Unpaid" and see a summary of payment status per client. |

### Epic 3: Reflections Journal
*As a client, I want a private space to reflect after my sessions, and as a coach, I want to review those reflections to guide my coaching.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 3.1| Submit Text Reflection | Client | After a session, a client can write and submit a text-based reflection. |
| 3.2| Submit Audio Reflection | Client | A client can record and upload an audio file (e.g., mp3, m4a) as a reflection. |
| 3.3| View Reflections | Client, Coach | A client can see all their past reflections. A coach can see the reflections of their associated clients. |
| 3.4| Reflection Notifications | Coach | A coach receives a notification when one of their clients submits a new reflection. |

### Epic 4: Coach's Private Notes
*As a coach, I want a secure place to keep private notes on my clients that are never visible to the client.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 4.1| Create Private Note | Coach | A coach can create a private, timestamped note and associate it with a specific client and/or session. |
| 4.2| View/Edit Private Notes | Coach | A coach can view, edit, and search all their private notes for a specific client. Utilizes existing AES-256 encryption. |

### Epic 5: Resource Center
*As a coach, I want to share resources, and as a client, I want to easily access them.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 5.1| Upload Resource | Coach | A coach can upload files (PDF, mp3, docx) or add links to a shared resource library. |
| 5.2| Assign Resource | Coach | A coach can assign one or more resources from the library to a specific client. |
| 5.3| View Assigned Resources | Client | A client can see and access a list of all resources their coach has assigned to them. |

### Epic 6: Client Progress Tracking
*As a user, I want to visualize my coaching journey and milestones over time.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 6.1| Progress Timeline View | Client, Coach | A chronological timeline view that displays key events: sessions, submitted reflections, and achieved milestones. |
| 6.2| Define/Track Milestones | Coach | A coach can define and mark custom milestones as "achieved" for a client. |

### Epic 7: Admin Dashboard & Coach Approval
*As an admin, I need to manage the platform's integrity and quality.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 7.1| Coach Approval Queue | Admin | Admins can see a list of prospective coaches who have registered and are awaiting approval. |
| 7.2| Approve/Reject Coach | Admin | Admins can review a coach's profile and approve or reject their application. |
| 7.3| View Platform Metrics | Admin | A simple dashboard showing high-level platform metrics (e.g., total users, active coaches, total sessions). |

### Epic 8: Technical Excellence & Debt Reduction
*As a developer, I want to ensure the codebase is stable, maintainable, and secure.*

| ID | User Story | Role(s) | Details |
|----|------------|---------|---------|
| 8.1| Enable TypeScript Strict Mode | Dev Team | Refactor the entire codebase (`client` and `server`) to enable `strict: true` in `tsconfig.json` for improved type safety. |
| 8.2| Database Migration Strategy | Dev Team | Analyze the remaining Mongoose models and develop/execute a migration plan to move all data and logic to PostgreSQL/Prisma for a unified data layer. |
| 8.3| Enhance Test Coverage | Dev Team | Implement a comprehensive testing strategy including integration tests for API endpoints and E2E tests for critical user flows (e.g., registration, session scheduling, reflection submission). |
| 8.4| Finalize Native Wrapper | Dev Team | Complete the Capacitor configuration to build, test, and package the PWA as a native iOS and Android application. |

---

## 5. Non-Functional Requirements

*   **Security:** Continue to adhere to the established enterprise-grade security standards. All new features must be built with these principles in mind.
*   **Performance:** Maintain the high-performance benchmark already set. New features should be optimized, and lazy loading should be used where appropriate.
*   **Accessibility:** All UI components must meet WCAG 2.1 AA standards.
*   **Internationalization (i18n):** All user-facing strings must be implemented via the `i18next` framework to support both Hebrew and English.
*   **Reliability:** The application must be robust, with comprehensive error handling on both the client and server.

---

## 6. Out of Scope (For MVP)

*   Group coaching features.
*   Real-time chat or messaging.
*   Integrated payment gateways (tracking is manual).
*   AI-driven analysis or suggestions within the app.
*   Automated calendar synchronization with external services (e.g., Google Calendar).

---

## 7. Risks & Assumptions

*   **Risk:** The dual-database architecture (Mongoose/MongoDB and Prisma/PostgreSQL) introduces complexity and potential data consistency challenges.
    *   **Mitigation:** Prioritize Epic 8.2 to create a unified data layer in Prisma.
*   **Assumption:** The current serverless architecture on Vercel will scale effectively for the features outlined.
*   **Assumption:** The existing UI component library (`radix-ui`, `lucide-react`) is sufficient for building the required user interfaces. 