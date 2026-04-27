# Requirements Document

## Introduction

This document defines the requirements for upgrading the existing Predictive Maintenance web application into a production-ready SaaS platform. The current application has a working FastAPI backend (port 8001) with `/predict`, `/health`, and `/auth/login` endpoints, two trained Random Forest ML models (98.82% accuracy), JWT authentication with a single hardcoded user, and a React + TypeScript frontend with file upload and analysis results. The upgrade introduces multi-user registration, a public landing page, a sidebar navigation layout, dedicated pages for dashboard overview, data upload, analytics, and settings, and interactive metric cards with filtered table views — all while preserving the existing ML pipeline and authentication mechanism.

## Glossary

- **App**: The full-stack Predictive Maintenance SaaS application (FastAPI backend + React/TypeScript frontend).
- **Frontend**: The React + TypeScript + Vite + Tailwind CSS client application.
- **Backend**: The FastAPI Python server running on port 8001.
- **Auth_Service**: The backend module responsible for user registration, login, and password management.
- **User_Store**: The JSON file (`data/users.json`) used to persist registered user records for the MVP.
- **JWT**: JSON Web Token used for stateless authentication between Frontend and Backend.
- **ML_Pipeline**: The existing Random Forest model inference pipeline exposed via the `/predict` endpoint; must remain unchanged.
- **Landing_Page**: The public marketing page served at the `/` route before authentication.
- **Signup_Page**: The `/signup` frontend route where new users register.
- **Login_Page**: The existing `/login` frontend route.
- **Sidebar**: The left-side navigation component rendered for all authenticated routes.
- **Dashboard_Page**: The `/app/dashboard` route showing summary cards and recent analyses.
- **Upload_Page**: The `/app/upload` route containing the existing file upload and analysis results functionality.
- **Analytics_Page**: The `/app/analytics` route showing aggregated charts across all analyses.
- **Settings_Page**: The `/app/settings` route for viewing user info and changing passwords.
- **Analysis_Record**: A persisted summary of a completed analysis (date, record count, failure count, high-risk count).
- **Metric_Card**: A summary statistic card on the Upload_Page results view (Total Records, Predicted Failures, High Risk Items, Healthy Items).
- **Analysis_History**: The ordered list of Analysis_Records associated with the authenticated user, stored client-side in localStorage for MVP.
- **Validator**: The client-side form validation logic in the Frontend.
- **Password_Hasher**: The bcrypt-based password hashing utility in the Backend.

---

## Requirements

### Requirement 1: Public Landing Page

**User Story:** As a visitor, I want to see a marketing landing page at the root URL, so that I can understand the product before deciding to sign up or sign in.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to `/`, THE Frontend SHALL render the Landing_Page without redirecting to `/login` or `/app/dashboard`.
2. THE Landing_Page SHALL display a product introduction section describing the Predictive Maintenance SaaS App.
3. THE Landing_Page SHALL display a features overview section listing at least three key capabilities of the App.
4. THE Landing_Page SHALL display a "How It Works" section describing the analysis workflow in three or more steps.
5. THE Landing_Page SHALL display a "Get Started" call-to-action button that navigates the user to `/signup`.
6. THE Landing_Page SHALL display a "Sign In" call-to-action button that navigates the user to `/login`.
7. THE Landing_Page SHALL render correctly on viewport widths from 320px to 1920px (responsive design).
8. WHEN an authenticated user navigates to `/`, THE Frontend SHALL redirect the user to `/app/dashboard`.

---

### Requirement 2: Sign-Up Page

**User Story:** As a new user, I want to register an account with my name, email, username, and password, so that I can access the SaaS application.

#### Acceptance Criteria

1. THE Frontend SHALL expose a `/signup` route that renders the Signup_Page.
2. THE Signup_Page SHALL contain input fields for: full name, email address, username, password, and confirm password.
3. WHEN the user submits the registration form with a missing required field, THE Validator SHALL display an inline error message identifying the missing field without submitting the form to the Backend.
4. WHEN the user submits the registration form with an email address that does not match the format `local@domain.tld`, THE Validator SHALL display an inline error message and prevent form submission.
5. WHEN the user submits the registration form with a password fewer than 8 characters, THE Validator SHALL display an inline error message and prevent form submission.
6. WHEN the user submits the registration form with a confirm password value that does not match the password value, THE Validator SHALL display an inline error message and prevent form submission.
7. WHEN all client-side validations pass, THE Signup_Page SHALL submit a POST request to the Backend `/auth/register` endpoint with the registration payload.
8. WHEN the Backend returns a success response, THE Frontend SHALL redirect the user to `/login` and display a success message indicating that the account was created.
9. WHEN the Backend returns a 409 conflict error, THE Signup_Page SHALL display the error message returned by the Backend without clearing the form fields.
10. THE Signup_Page SHALL render correctly on viewport widths from 320px to 1920px.
11. THE Signup_Page SHALL include a link to `/login` for users who already have an account.

---

### Requirement 3: Backend User Registration

**User Story:** As a new user, I want the backend to securely register my account and return a JWT, so that I am automatically authenticated after sign-up.

#### Acceptance Criteria

1. THE Backend SHALL expose a `POST /auth/register` endpoint that accepts a JSON body containing: `full_name`, `email`, `username`, and `password`.
2. WHEN a registration request is received with a `username` that already exists in the User_Store, THE Auth_Service SHALL return HTTP 409 with a descriptive error message.
3. WHEN a registration request is received with an `email` that already exists in the User_Store, THE Auth_Service SHALL return HTTP 409 with a descriptive error message.
4. WHEN a registration request is received with a `password` fewer than 8 characters, THE Auth_Service SHALL return HTTP 422 with a descriptive validation error.
5. WHEN a registration request passes all validations, THE Password_Hasher SHALL hash the password using bcrypt before storing it.
6. WHEN a registration request passes all validations, THE Auth_Service SHALL append the new user record to the User_Store (`data/users.json`), persisting: `username`, `email`, `full_name`, and the bcrypt-hashed password.
7. WHEN a registration request passes all validations, THE Auth_Service SHALL return HTTP 200 with a signed JWT and `token_type: "bearer"` using the same signing mechanism as the existing `/auth/login` endpoint.
8. THE Backend SHALL create the `data/` directory and an empty `data/users.json` file if they do not exist at startup.
9. IF the `data/users.json` file is corrupted or unreadable, THEN THE Auth_Service SHALL return HTTP 500 with a descriptive error message and log the error.
10. THE existing `/auth/login` endpoint SHALL authenticate users registered via `/auth/register` by comparing the submitted password against the bcrypt-hashed password in the User_Store.
11. THE existing hardcoded `admin` user credentials SHALL continue to work for login without requiring registration.

---

### Requirement 4: Sidebar Navigation Layout

**User Story:** As an authenticated user, I want a persistent left sidebar with navigation links, so that I can move between pages without losing context.

#### Acceptance Criteria

1. THE Frontend SHALL render the Sidebar on all authenticated routes (`/app/*`).
2. THE Sidebar SHALL contain navigation items for: Dashboard, Upload Data, Analytics, and Settings.
3. WHEN the user clicks a Sidebar navigation item, THE Frontend SHALL navigate to the corresponding route: `/app/dashboard`, `/app/upload`, `/app/analytics`, `/app/settings`.
4. THE Sidebar SHALL visually highlight the navigation item corresponding to the current active route.
5. THE Sidebar SHALL display the authenticated user's username and a user avatar or initials at the bottom of the sidebar.
6. THE Sidebar SHALL display a "Logout" button at the bottom that, when clicked, clears the JWT from storage and redirects the user to `/login`.
7. THE Frontend SHALL replace the existing top Header component with the Sidebar layout for all authenticated pages.
8. WHEN the viewport width is below 768px, THE Sidebar SHALL collapse to a hamburger menu icon that expands the sidebar as an overlay when clicked.
9. THE main content area to the right of the Sidebar SHALL update to display the page corresponding to the active route.

---

### Requirement 5: Dashboard Overview Page

**User Story:** As an authenticated user, I want a dashboard overview page with summary statistics and recent analyses, so that I can quickly assess my usage and history.

#### Acceptance Criteria

1. THE Dashboard_Page SHALL display a summary card showing the total number of analyses run by the authenticated user.
2. THE Dashboard_Page SHALL display a summary card showing the date of the most recent analysis, formatted as a human-readable date string.
3. THE Dashboard_Page SHALL display a summary card showing the total number of failures detected across all analyses run by the authenticated user.
4. THE Dashboard_Page SHALL display a summary card showing the ML model accuracy as "98.82%".
5. THE Dashboard_Page SHALL display a "Recent Analyses" list showing the last 5 Analysis_Records, each displaying: date, record count, and failure count.
6. WHEN the authenticated user has no Analysis_Records, THE Dashboard_Page SHALL display an empty state message in the "Recent Analyses" section with a "Run Your First Analysis" call-to-action button that navigates to `/app/upload`.
7. THE Dashboard_Page SHALL display a "New Analysis" button that navigates the user to `/app/upload`.
8. THE Dashboard_Page SHALL read Analysis_Records from the Analysis_History stored in the browser's localStorage under a key scoped to the authenticated user's username.

---

### Requirement 6: Upload Data Page

**User Story:** As an authenticated user, I want to upload machine data CSV files and view analysis results on a dedicated page, so that the upload workflow is clearly separated from the dashboard overview.

#### Acceptance Criteria

1. THE Upload_Page SHALL be accessible at the `/app/upload` route.
2. THE Upload_Page SHALL contain the existing file upload component and analysis results component, preserving all current functionality.
3. THE existing `/predict` endpoint and ML_Pipeline SHALL remain unchanged.
4. WHEN an analysis completes successfully, THE Upload_Page SHALL create an Analysis_Record containing: ISO 8601 timestamp, total record count, failure count, and high-risk count.
5. WHEN an analysis completes successfully, THE Upload_Page SHALL append the Analysis_Record to the Analysis_History in localStorage, scoped to the authenticated user's username.
6. THE Upload_Page SHALL display the analysis results immediately after a successful prediction response, without requiring a page reload.
7. THE Upload_Page SHALL render correctly on viewport widths from 320px to 1920px.

---

### Requirement 7: Interactive Metric Cards

**User Story:** As an authenticated user, I want to click on metric cards in the analysis results to filter the predictions table, so that I can quickly focus on specific subsets of data.

#### Acceptance Criteria

1. WHEN the user clicks the "Total Records" Metric_Card, THE Upload_Page SHALL display all prediction rows in the Detailed Predictions table and clear any active filter.
2. WHEN the user clicks the "Predicted Failures" Metric_Card, THE Upload_Page SHALL filter the Detailed Predictions table to show only rows where `will_fail` is `true`.
3. WHEN the user clicks the "High Risk Items" Metric_Card, THE Upload_Page SHALL filter the Detailed Predictions table to show only rows where `risk_level` is `"High Risk"`.
4. WHEN the user clicks the "Healthy Items" Metric_Card, THE Upload_Page SHALL filter the Detailed Predictions table to show only rows where `will_fail` is `false`.
5. WHEN a filter is active, THE Upload_Page SHALL display a visual indicator on the active Metric_Card to distinguish it from inactive cards.
6. WHEN a filter is active, THE Upload_Page SHALL update the "Showing X–Y of Z records" pagination label to reflect the filtered record count.
7. WHEN a filter is active and the user clicks the same Metric_Card again, THE Upload_Page SHALL clear the filter and return to showing all rows.
8. WHEN a new analysis result is loaded, THE Upload_Page SHALL clear any previously active filter.

---

### Requirement 8: Analytics Page

**User Story:** As an authenticated user, I want to view aggregated charts across all my analyses, so that I can identify trends and patterns over time.

#### Acceptance Criteria

1. THE Analytics_Page SHALL be accessible at the `/app/analytics` route.
2. THE Analytics_Page SHALL display a line chart showing the failure count per analysis over time, with the x-axis representing analysis date and the y-axis representing failure count.
3. THE Analytics_Page SHALL display a pie chart showing the aggregated risk distribution (High Risk, Medium Risk, Low Risk counts) across all analyses stored in the Analysis_History.
4. THE Analytics_Page SHALL display a bar chart showing the top failure reasons aggregated across all analyses stored in the Analysis_History.
5. WHEN the authenticated user has no Analysis_Records in the Analysis_History, THE Analytics_Page SHALL display an empty state with a "Run Your First Analysis" call-to-action button that navigates to `/app/upload`.
6. THE Analytics_Page SHALL read all Analysis_Records from the Analysis_History in localStorage, scoped to the authenticated user's username.
7. THE Analytics_Page SHALL render correctly on viewport widths from 320px to 1920px.

---

### Requirement 9: Settings Page

**User Story:** As an authenticated user, I want to view my account information and change my password, so that I can manage my account security.

#### Acceptance Criteria

1. THE Settings_Page SHALL be accessible at the `/app/settings` route.
2. THE Settings_Page SHALL display the authenticated user's username and email address as read-only fields.
3. THE Settings_Page SHALL display a "Change Password" form containing: current password, new password, and confirm new password fields.
4. WHEN the user submits the change password form with a new password fewer than 8 characters, THE Validator SHALL display an inline error message and prevent form submission.
5. WHEN the user submits the change password form with a confirm new password that does not match the new password, THE Validator SHALL display an inline error message and prevent form submission.
6. WHEN all client-side validations pass, THE Settings_Page SHALL submit a POST request to the Backend `/auth/change-password` endpoint with the current password and new password.
7. WHEN the Backend returns a success response, THE Settings_Page SHALL display a success message and clear the change password form fields.
8. WHEN the Backend returns a 401 error (incorrect current password), THE Settings_Page SHALL display the error message returned by the Backend without clearing the form.
9. THE Backend SHALL expose a `POST /auth/change-password` endpoint that accepts: `current_password` and `new_password` in the request body, authenticated via the JWT in the Authorization header.
10. WHEN the `/auth/change-password` endpoint receives a valid JWT and a correct `current_password`, THE Auth_Service SHALL update the user's hashed password in the User_Store and return HTTP 200.
11. WHEN the `/auth/change-password` endpoint receives an incorrect `current_password`, THE Auth_Service SHALL return HTTP 401 with a descriptive error message.
12. THE Settings_Page SHALL render correctly on viewport widths from 320px to 1920px.

---

### Requirement 10: Tech Stack and Constraints

**User Story:** As a developer, I want the SaaS upgrade to use the existing tech stack with minimal additions, so that the codebase remains maintainable and the ML pipeline is not disrupted.

#### Acceptance Criteria

1. THE App SHALL continue to use FastAPI as the backend framework and React + TypeScript + Vite + Tailwind CSS + Recharts as the frontend stack.
2. THE Backend SHALL use `bcrypt` (via the `passlib[bcrypt]` package) for all password hashing operations.
3. THE Backend SHALL use a JSON file at `data/users.json` as the User_Store for the MVP, with no external database dependency.
4. THE ML_Pipeline, `/predict` endpoint, and `/health` endpoint SHALL remain functionally unchanged by this upgrade.
5. THE existing JWT signing mechanism (HS256, 24-hour expiry) SHALL be reused for tokens issued by `/auth/register` and `/auth/change-password`.
6. ALL new authenticated frontend pages SHALL be protected by the existing ProtectedRoute component or an equivalent mechanism that redirects unauthenticated users to `/login`.
7. ALL new frontend pages SHALL be responsive and render correctly on viewport widths from 320px to 1920px.
8. EVERY interactive UI element (button, link, form control) SHALL perform a defined action; no placeholder or non-functional UI elements SHALL be present in the delivered implementation.
