### Project Plan: Remediate All Failing GitHub Actions in the "Lumea" Repository

#### Phase 1: Setup and Local Reproduction

This phase ensures the local environment is correctly set up to reproduce and diagnose the CI failures before pushing any changes.

*   **Task 1.1: Clone & Configure Repository**
    *   Clone the repository: `gh repo clone TomerG91/Lumea`
    *   Navigate into the project directory: `cd Lumea`
    *   Create the dedicated branch for these fixes: `git checkout -b ci/fix-workflows`

*   **Task 1.2: Install Dependencies**
    *   Install project dependencies using pnpm: `pnpm install`

*   **Task 1.3: Set Up Local CI Runner**
    *   Install `act` to run GitHub Actions locally: `brew install act`

*   **Task 1.4: Reproduce and Validate Failures**
    *   Run each failing workflow locally to confirm the errors and gather logs.
    *   Commands:
        ```bash
        act -j ci
        act -j codeql
        act -j lighthouse
        act -j mobile-release
        act -j deploy-pages
        ```

---

#### Phase 2: Workflow Remediation

This phase involves fixing each failing workflow individually, with a separate commit for each fix.

*   **Task 2.1: Fix `CI / Type Check` Workflow (`ci.yml`)**
    *   **Action:** Run `pnpm type-check` and `pnpm test` locally and fix any TypeScript or Jest errors until they pass.
    *   **Hardening:** Pin all third-party actions (e.g., `actions/checkout`, `pnpm/action-setup`) to their full commit SHA.
    *   **Documentation:** Add comments to the workflow file explaining the changes and linking to the failed run.
    *   **Commit:** `chore(ci): fix CI workflow (#<run-number>)`

*   **Task 2.2: Fix `Security Scanning` Workflow (`codeql.yml`)**
    *   **Action:** Upgrade the `github/codeql-action` to the latest `v2` version.
    *   **Action:** Ensure the `languages` matrix correctly specifies `['javascript-typescript']`.
    *   **Hardening:** Pin the `github/codeql-action` SHA.
    *   **Documentation:** Add explanatory comments.
    *   **Commit:** `chore(ci): fix Security Scanning workflow (#<run-number>)`

*   **Task 2.3: Fix `Quality & Performance` Workflows (`lighthouse.yml`, `lighthouse-budget.yml`)**
    *   **Action:** Analyze `lighthouseci.config.js`.
    *   **Action:** Implement one of the following:
        1.  **Optimization:** Address low-hanging performance fruit (e.g., compress an image).
        2.  **Relax Budgets:** Increase performance budgets by 5% and add `// TODO:` comments to revisit.
    *   **Hardening:** Pin all actions to their full SHA.
    *   **Documentation:** Add explanatory comments.
    *   **Commit:** `chore(ci): fix Lighthouse workflows (#<run-number>)`

*   **Task 2.4: Fix `Mobile Release` Workflow (`mobile-release.yml`)**
    *   **Action:** Modify the workflow trigger to only run on tagged commits or branches matching `release/*`.
    *   **Action:** Identify all required secrets (`APP_STORE_CONNECT_API_KEY`, `EXPO_ACCESS_TOKEN`, etc.) and list them for stubbing in the repository's secrets.
    *   **Hardening:** Pin all actions to their full SHA.
    *   **Documentation:** Add explanatory comments.
    *   **Commit:** `chore(ci): fix Mobile Release workflow (#<run-number>)`

*   **Task 2.5: Fix `Deploy to GitHub Pages` Workflow (`deploy-pages.yml`)**
    *   **Action:** Verify the `publish_dir` in the workflow file points to the correct build output directory (e.g., `build`, `dist`).
    *   **Action:** Confirm the `GH_PAT` secret is required and note it for setup.
    *   **Hardening:** Pin all actions to their full SHA.
    *   **Documentation:** Add explanatory comments.
    *   **Commit:** `chore(ci): fix Deploy to Pages workflow (#<run-number>)`

---

#### Phase 3: Project-Wide Security Hardening

This phase introduces automated dependency management for GitHub Actions to prevent future supply-chain issues.

*   **Task 3.1: Implement Dependabot for Actions**
    *   **Action:** Create a `.github/dependabot.yml` file if it doesn't exist.
    *   **Action:** Add a configuration to scan for updates to GitHub Actions on a nightly schedule.
    *   **Commit:** `chore(ci): add Dependabot for Actions`

---

#### Phase 4: Finalization and Delivery

This phase concludes the project by submitting the fixes for review and merging.

*   **Task 4.1: Push Changes**
    *   Push the `ci/fix-workflows` branch with all commits to the remote repository.

*   **Task 4.2: Open Pull Request**
    *   Create a new Pull Request targeting the default branch.

*   **Task 4.3: Document Fixes in PR**
    *   Write a summary in the PR body detailing:
        *   The root cause for each workflow failure.
        *   The specific fix that was implemented.
        *   Any follow-up `TODO`s or identified tech debt.

*   **Task 4.4: Verify and Merge**
    *   Monitor the PR's automated checks to ensure all workflows pass.
    *   If checks are green, request a review for final approval and merge.
