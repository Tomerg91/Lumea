# Active Context

Current work focus: Implementing the defined Minimum Viable Product (MVP). Starting with the first vertical slice: **"Coach views their Clients"**. This involves database schema updates, creating a backend API endpoint, and building the corresponding frontend page/component.

Recent changes:
*   Established foundational elements (auth scaffolding, i18n, PWA setup, Capacitor integration).
*   Defined the detailed MVP feature set.
*   **Configured Git repository and set up CI/CD with Vercel for frontend deployment.**

Next steps: 
1. Implement the database schema changes for users, roles, and client-coach assignment (using Supabase).
2. Build the backend API functionality (likely using Supabase Functions or auto-generated APIs with RLS) for `GET /api/my-clients`.
3. Create the frontend `/dashboard/clients` page and component in React to display the client list for a logged-in coach.
4. Integrate these parts end-to-end.

Active decisions and considerations:
*   Adhering strictly to the MVP scope to ensure focus.
*   Implementing features as vertical slices.
*   Continuing with the chosen tech stack (React, **Vite**, **Supabase (PostgreSQL, Auth, Storage, APIs)**, Tailwind, i18next, Capacitor). **(Node/Express backend deprecated for MVP)**.
*   Prioritizing Hebrew/RTL support within each slice.
*   **Utilizing Vercel for deployment.**

Important patterns and preferences: Role-Based Access Control (RBAC) is crucial. Mobile-first design approach. Emphasis on a calm, clean, minimalist aesthetic. Use of functional components and hooks in React. RESTful API design.

Learnings and project insights: A clear MVP definition is essential for focused development. Vertical slices help deliver demonstrable value incrementally and validate integration early.