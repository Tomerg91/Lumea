# Daily Intention Homepage Feature Implementation Plan

## 1. Backend (Supabase)

### 1.1. Database Schema

- **Task 1: Create `Beings` Table**
  - Create a new table named `Beings` with the following columns:
    - `being_id` (UUID, Primary Key, default: `uuid_generate_v4()`)
    - `label_en` (TEXT, NOT NULL)
    - `label_he` (TEXT, NOT NULL)
    - `created_by_user_id` (UUID, Foreign Key to `auth.users`, nullable)
    - `is_default` (BOOLEAN, default: `false`)
    - `created_at` (TIMESTAMPTZ, default: `now()`)

- **Task 2: Create `DailyIntentionLog` Table**
  - Create a new table named `DailyIntentionLog` with the following columns:
    - `log_id` (UUID, Primary Key, default: `uuid_generate_v4()`)
    - `user_id` (UUID, Foreign Key to `auth.users`, NOT NULL)
    - `being_id` (UUID, Foreign Key to `Beings`, NOT NULL)
    - `selection_date` (DATE, NOT NULL)
    - `created_at` (TIMESTAMPTZ, default: `now()`)

- **Task 3: Create Indexes**
  - Add indexes to `DailyIntentionLog` on `user_id` and `selection_date` for efficient querying.

### 1.2. Database Functions

- **Task 4: Create `needs_beings_selection` Function**
  - Create a SQL function `needs_beings_selection(p_user_id UUID)` that returns a boolean.
  - This function will check if there is an entry in `DailyIntentionLog` for the given `user_id` and the current date (respecting the user's timezone, which might require an additional parameter or a lookup).

### 1.3. API Endpoints (RPC Functions)

- **Task 5: Create API for `Beings`**
  - `get_beings()`: Fetches all default beings and any custom beings created by the current user.
  - `add_being(label_en TEXT, label_he TEXT)`: Adds a new custom being for the current user.

- **Task 6: Create API for `DailyIntentionLog`**
  - `add_daily_intention(being_ids UUID[])`: Adds a new entry for each selected being in the `DailyIntentionLog` for the current user and date.
  - `get_daily_intentions()`: Fetches the selected beings for the current user for today.

### 1.4. Row Level Security (RLS)

- **Task 7: Implement RLS for `Beings`**
  - Users can read all `is_default = true` beings.
  - Users can read beings they created (`created_by_user_id = auth.uid()`).
  - Users can insert beings for themselves.

- **Task 8: Implement RLS for `DailyIntentionLog`**
  - Users can only read/write their own intention logs (`user_id = auth.uid()`).

## 2. Frontend (React/Vite)

### 2.1. Services

- **Task 9: Create `intentionService.ts`**
  - Implement functions to call the new Supabase RPC functions:
    - `getBeings()`
    - `addBeing()`
    - `addDailyIntention()`
    - `getDailyIntentions()`
    - `needsBeingsSelection()`

### 2.2. UI Components

- **Task 10: Create `BeingsSelectionScreen.tsx`**
  - Fetch beings using `intentionService.getBeings()`.
  - Display the list of beings with checkboxes.
  - Include an input field and button to add custom beings.
  - Implement the "Continue" button logic to save selections via `intentionService.addDailyIntention()`.

- **Task 11: Create `CoachHomepage.tsx`**
  - Fetch and display the coach's daily schedule.
  - Fetch and display the selected beings for the day using `intentionService.getDailyIntentions()`.

- **Task 12: Create `ClientHomepage.tsx`**
  - Fetch and display the client's upcoming session information.
  - Fetch and display the selected beings for the day using `intentionService.getDailyIntentions()`.

### 2.3. Routing and Logic Flow

- **Task 13: Update App Initialization Logic**
  - On app launch (e.g., in a main layout component or a router guard), call `intentionService.needsBeingsSelection()`.
  - Based on the result, navigate to either the `BeingsSelectionScreen` or the appropriate homepage.

- **Task 14: Update Router**
  - Add new routes for `/select-intentions`, `/coach-dashboard`, and `/client-dashboard`.

### 2.4. Internationalization (i18n)

- **Task 15: Add New Translations**
  - Add English and Hebrew translations for all new UI text in the respective JSON files.

## 3. Testing

### 3.1. Unit Tests

- **Task 16: Test Services**
  - Write unit tests for `intentionService.ts` to mock Supabase calls and verify data transformation.

- **Task 17: Test Components**
  - Write unit tests for `BeingsSelectionScreen`, `CoachHomepage`, and `ClientHomepage` to verify rendering and user interactions.

### 3.2. Integration Tests

- **Task 18: Test Daily Intention Flow**
  - Write an integration test that covers the entire flow:
    1.  User logs in.
    2.  App checks if beings need to be selected.
    3.  User is redirected to the selection screen.
    4.  User selects beings and continues.
    5.  User is redirected to their homepage and sees the selected beings.

### 3.3. End-to-End (E2E) Tests

- **Task 19: Create E2E Tests**
  - Use a framework like Playwright or Cypress to create E2E tests that simulate a user completing the daily intention feature from start to finish.
