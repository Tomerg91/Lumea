# System Patterns

System architecture: Full-stack Progressive Web App (PWA) with a React frontend, leveraging **Supabase for backend services (Auth, PostgreSQL DB, Storage, Realtime APIs)**. Packaged using Capacitor for native iOS/Android deployment. ~~Node.js/Express backend potentially for specific logic, but likely deprecated for MVP.~~

Key technical decisions: Utilizing PWA features for app-like experience and offline capabilities. Choosing React with functional components/hooks for the frontend. Employing Tailwind CSS for utility-first styling. Using i18next for robust internationalization (Hebrew/RTL first). **Relying on Supabase Auth and Row Level Security (RLS) for secure data access.** RESTful principles applied via Supabase auto-generated APIs.

Design patterns in use: Role-Based Access Control (RBAC) implemented via Supabase RLS policies. MVC/MVVM patterns relevant to React frontend structure. Service Worker caching strategies (Cache First, Network First). State management patterns (Context API or libraries like Zustand/Redux Toolkit) needed for React frontend.

Component relationships: Clear data relationships managed in Supabase tables: Coach manages Clients (via `coach_id` FK); Sessions link Coach and Client; Reflections link to Sessions/Clients; Resources managed by Coaches. Admin role oversees Coaches. Supabase Auth (`auth.users`) links to user profile data.

Critical implementation paths: Defining robust Supabase RLS policies for all tables. Implementing comprehensive Hebrew/RTL support across the entire UI. Setting up Supabase Storage and policies for secure file uploads. Encrypting sensitive data at rest (potentially using Supabase features or application-level encryption if needed). Implementing functional offline capabilities via Service Worker (primarily for UI shell and read-only data).