# Migration Master Checklist: guest_id → id

## 1. Database Schema
- [ ] Remove the `guest_id` column from the `guests` table (if it exists).
- [ ] Ensure the `guests` table uses only `id` as the unique identifier.
- [ ] Update all foreign keys in related tables (e.g., `guest_logins`, `guest_travel_profiles`, `guest_itinerary_assignments`, etc.) to reference `guests.id` (not `guests.guest_id`).
- [ ] Update all unique constraints and indexes to use `id` instead of `guest_id`.

## 2. Database Functions & Triggers
- [ ] Update all PL/pgSQL functions to use `id` (not `guest_id`) for guests.
    - Example: `create_guest_login`, `create_guest_auth_user`, `validate_guest_login`, etc.
- [ ] Update all triggers that reference `guest_id` to use `id`.
- [ ] Update all queries inside functions to use `guests.id` (never `guests.guest_id`).

## 3. App Code (Frontend & Backend)
- [ ] Update all TypeScript/JS types and interfaces to use `id` (not `guest_id`).
- [ ] Update all code that queries or mutates guests to use `.eq('id', ...)` (not `.eq('guest_id', ...)`).
- [ ] Update all code that constructs guest objects to use `id`.
- [ ] Update all code that expects or passes `guest_id` to use `id` instead.
- [ ] Update all API calls, RPCs, and Supabase function calls to use `id`.

## 4. Data Migration
- [ ] Write a migration script to:
    - Copy `guest_id` values to `id` where needed (if you have legacy data).
    - Remove the `guest_id` column from the `guests` table.
    - Update all related tables to reference `guests.id`.
- [ ] Test the migration on a staging database with a copy of production data.

## 5. Testing
- [ ] Write or update automated tests for all guest-related flows (login, profile fetch, itinerary assignment, etc.).
- [ ] Manually test all guest flows in the app (desktop and mobile).
- [ ] Test all admin flows that touch guests.

## 6. Deployment
- [ ] Deploy all code and database changes together (no partial deploys!).
- [ ] Monitor logs and error reports closely after deployment.

---

**How to Use This Checklist**
- Work in a **feature branch** (not main).
- Tackle each section one at a time.
- Only merge and deploy when **every box is checked** and all tests pass. okay
