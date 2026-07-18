# Insurance Tracking System - Developer Documentation

This document serves as the live, synchronized technical reference for the Insurance Tracking System (PolicyFlow) built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, NextAuth, and MongoDB.

---

## 1. Project Directory Structure

Below is the directory mapping for **Module 1: Initialization & Authentication**:

```
.
├── .env                              # Active local runtime environment variables
├── .env.example                      # Distribution template for env configuration
├── DEVELOPER_DOCS.md                 # Synchronized system documentation (this file)
├── next-env.d.ts                     # Next.js custom TypeScript declarations
├── next.config.js                    # Next.js framework configuration
├── package.json                      # Build script pipelines and packages
├── postcss.config.mjs                # PostCSS and Tailwind CSS processing definitions
├── tsconfig.json                     # TypeScript compiler strict constraints
└── src
    ├── app
    │   ├── api
    │   │   ├── auth
    │   │   │   └── [...nextauth]
    │   │   │       └── route.ts      # NextAuth.js dynamic auth handler API route
    │   │   └── setup
    │   │       └── route.ts          # Development system initialization utility
    │   ├── dashboard
    │   │   ├── layout.tsx            # Protected dashboard shell & template with global state
    │   │   └── page.tsx              # Diagnostic workspace and landing view for Module 1
    │   ├── login
    │   │   └── page.tsx              # Safe authentication form view (Zod, React Hook Form)
    │   ├── layout.tsx                # Core HTML envelope and SessionProvider wrapper
    │   └── page.tsx                  # Root redirect engine (auto routes to /dashboard or /login)
    ├── components
    │   ├── layout
    │   │   ├── Header.tsx            # Shell top nav with live profile & signout features
    │   │   └── Sidebar.tsx           # Role-based workspace menu links
    │   └── providers
    │       └── SessionProvider.tsx   # React context wrapper for authentication state
    ├── lib
    │   ├── auth.ts                   # Core NextAuth config with JWT & Iframe support
    │   ├── mongodb.ts                # Mongoose connection layer with static caching
    │   └── utils.ts                  # Utility helper functions
    ├── models
    │   └── User.ts                   # Mongoose Schema mapping the PolicyFlow user profiles
    ├── types
    │   └── next-auth.d.ts            # Type expansions for Auth roles and user tokens
    └── index.css                     # Global styles, Tailwind imports, and layout custom rules
```

---

## 2. Environment Variables (`.env.example`)

The following variables dictate system connectivity. Ensure they are configured before booting:

```env
# MongoDB Database Connection
MONGODB_URI="mongodb+srv://sudarshankmwebdeveloper_db_user:2NEFbcyPIMOmj9uF@cluster0.uq1tsge.mongodb.net/policyflow?retryWrites=true&w=majority&appName=Cluster0"

# NextAuth Authentication Config
NEXTAUTH_SECRET="f69df919b4e339dae75c61eb63d91653bc07ea8fa538bd8c6a0c5de2cfa8a93b" # Secure 32-byte secret
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth Credentials (Optional - Placeholder during Module 1)
GOOGLE_CLIENT_ID="google-oauth-placeholder"
GOOGLE_CLIENT_SECRET="google-oauth-placeholder-secret"

# WhatsApp Cloud API Configuration (Optional - Placeholder during Module 1)
WHATSAPP_TOKEN="whatsapp-cloud-api-token-placeholder"
WHATSAPP_PHONE_NUMBER="whatsapp-phone-number-placeholder"

# Scheduled Cron Security (Optional - Placeholder during Module 1)
CRON_SECRET="cron-endpoint-secret-placeholder"
```

---

## 3. MongoDB Connection Flow

PolicyFlow leverages **MongoDB Atlas** as the durable persistence layer combined with **Mongoose** as the ODM.

### Cached Database Connection (`src/lib/mongodb.ts`)
To prevent connection leaks under hot reloading in development and to optimize cold start response times on serverless environments, we implement a static global cache for the connection promise:

1. **Check Cache**: If `mongoose.conn` is already active in the global memory space, the handler returns immediately.
2. **First Connection**: If no connection is cached, a new `mongoose.connect()` request is sent to the connection string found in `process.env.MONGODB_URI`.
3. **Register Promise**: The ongoing connection promise is registered in the global cache. Upon resolution, future database requests pull from this single instance.

---

## 4. Authentication Flow & NextAuth Configuration

PolicyFlow implements strict authorization leveraging **NextAuth v4**.

```
[ Client Login Page ] ---> Submits Credentials ---> [ CredentialsProvider: authorize() ]
                                                                 │
                                                   Finds User in Mongoose DB
                                                                 │
                                                   Verifies hash using bcryptjs
                                                                 │
                                                       Checks "isActive" flag
                                                                 │
                                                     [ jwt() Callback Triggered ]
                                                       Maps User ID & Role -> JWT
                                                                 │
                                                   [ session() Callback Triggered ]
                                                    Maps JWT -> Client Session
```

### NextAuth Configuration (`src/lib/auth.ts`)
- **Providers**: Supports `CredentialsProvider` for Email/Password logins and `GoogleProvider` for secure single sign-on.
- **Session Strategy**: Configured with `jwt` (JSON Web Tokens) with a maximum lifespan of 30 days.
- **Callbacks**:
  - `signIn`: Custom validations check if accounts are active.
  - `jwt`: Transfers Custom Database fields (`role`, `id`) to the token payload. Supports reactive token updates.
  - `session`: Exposes user metadata safely to client views.
- **Iframe Compatibility**: Since PolicyFlow is previewed in a sandboxed iframe, we set specialized cookie constraints to prevent blockages:
  ```ts
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  }
  ```

---

## 5. Routing Protection & Navigation Layout

### Next.js 15 Layout Boundaries
Rather than standard custom middleware, route access control is enforced at the server component layout level inside `src/app/dashboard/layout.tsx` and the main redirect root `src/app/page.tsx`:

1. **Initial Access**: When a client requests `/`, the root page `src/app/page.tsx` checks if a valid NextAuth session is active. If true, it redirects to `/dashboard`. If false, it redirects to `/login`.
2. **Dashboard Boundary**: Inside `/dashboard/*`, the layout `src/app/dashboard/layout.tsx` checks the session at server execution. If the user session is missing, it triggers an instant redirect to `/login`.
3. **Role-based Sidebar Links**: Inside `Sidebar.tsx`, the menu list adapts dynamically based on `session.user.role`. Administrative screens like **User Management** are completely hidden from standard employees.

---

## 6. Secure System Initialization Endpoint (`/api/setup`)

PolicyFlow features a development-only seeding utility located in `/api/setup`.

- **Access Level**: Development Only.
- **Production Guard**: Checks if `process.env.NODE_ENV === "production"`. If so, it instantly aborts with a `403 Forbidden` status to lock out malicious actors.
- **Seeding Logic**:
  - Connects to MongoDB Atlas and checks if any user with the `admin` role exists.
  - If yes, aborts initialization without creating new entries.
  - If no admin exists, creates a single default system administrator account:
    - **Email**: `admin@insurance.com`
    - **Password**: `Admin123!`
    - **Role**: `admin`
  - **Note**: No employee accounts are pre-seeded; employees must be manually created from the User Management admin page once logged in.

---

## 7. Production Deployment & Build Verification

To verify full system compatibility prior to deployment, execute:

```bash
# Clean previous builds
npm run clean

# Run strict build
npm run build

# Start the Node.js runner
npm run start
```

---

## 8. Module 2: Customer & Vehicle Management (APIs)

This module implements the complete backend architecture for customer accounts and vehicle registrations.

### 8.1 API Standards & Unified Payload Formats
Every API endpoint strictly implements standardized response structures and appropriate HTTP response codes:

*   **Success Response (HTTP 200/201)**:
    ```json
    {
      "success": true,
      "message": "Action completed successfully.",
      "data": {}
    }
    ```
*   **Error Response (HTTP 400/401/403/404/409/500)**:
    ```json
    {
      "success": false,
      "message": "Specific error description.",
      "errors": ["Detailed reason or field validation message"]
    }
    ```

### 8.2 Database Schema Architecture

#### **Customer Collection (`src/models/Customer.ts`)**
*   `name`: String, required.
*   `phone`: String, required. Case-insensitive index, primary communication field for WhatsApp.
*   `email`: String, optional.
*   `address`: String, optional.
*   `isActive`: Boolean, default `true`. Allows soft deactivation.
*   `createdBy` / `updatedBy`: References to `User` model (Audit tracking).

#### **Vehicle Collection (`src/models/Vehicle.ts`)**
*   `customer`: Reference to `Customer` model, required.
*   `vehicleNumber`: String, required, unique, uppercase index.
*   `vehicleType`: Enum (`"Two-Wheeler"`, `"Four-Wheeler"`, `"Commercial"`, `"Other"`), required.
*   `manufacturer`: String, required.
*   `model`: String, required.
*   `year`: Number, required (from 1900 to current year + 1).
*   `engineNumber`: String, required, unique, uppercase index.
*   `chassisNumber`: String, required, unique, uppercase index.
*   `color`: String, optional.
*   `isActive`: Boolean, default `true`.
*   `createdBy` / `updatedBy`: References to `User` model (Audit tracking).

---

### 8.3 Route Specification & Core Endpoints

#### **Customer APIs**

##### **1. List Customers with Pagination, Sorting & Filtering**
*   **Path**: `GET /api/customers`
*   **URL Parameters**:
    *   `page`: Page number (default: `1`)
    *   `limit`: Page limit (default: `10`, max: `100`)
    *   `search`: Search string matching `name`, `phone`, or `address` (case-insensitive)
    *   `sortBy`: Sort field (default: `createdAt`)
    *   `sortOrder`: Sort direction (`asc` or `desc`)
    *   `includeInactive`: Fetch deactivated accounts (`true` or `false`)

##### **2. Create Customer**
*   **Path**: `POST /api/customers`
*   **Payload (JSON)**:
    ```json
    {
      "name": "Jane Doe",
      "phone": "+1234567890",
      "email": "jane@example.com",
      "address": "123 Main St"
    }
    ```
*   **Response Codes**:
    *   `201 Created`: Customer successfully saved.
    *   `400 Bad Request`: Zod validation failure.
    *   `409 Conflict`: Active customer with duplicate phone number exists.

##### **3. Get/Update/Deactivate Single Customer**
*   **Path**: `GET /api/customers/[id]`
    *   Retrieves customer details.
*   **Path**: `PUT /api/customers/[id]`
    *   Updates customer fields (Zod validated).
*   **Path**: `DELETE /api/customers/[id]`
    *   Performs **Soft Delete** (`isActive` set to `false`).
    *   **Rigid Rule**: Will reject with `400 Bad Request` if there are any active vehicles linked to the customer.

---

#### **Vehicle APIs**

##### **1. List Vehicles**
*   **Path**: `GET /api/vehicles`
*   **URL Parameters**: Same pagination criteria as Customers. Supports filtering by customer: `customerId=CUSTOMER_ID`.

##### **2. Create Vehicle**
*   **Path**: `POST /api/vehicles`
*   **Payload (JSON)**:
    ```json
    {
      "customer": "65b987cdef65b987cdef0123",
      "vehicleNumber": "KA-03-HA-1234",
      "vehicleType": "Four-Wheeler",
      "manufacturer": "Toyota",
      "model": "Innova",
      "year": 2024,
      "engineNumber": "ENG12345678",
      "chassisNumber": "CHA12345678"
    }
    ```
*   **Validation Rules**:
    *   Ensures target Customer exists and is active.
    *   Ensures `vehicleNumber`, `engineNumber`, and `chassisNumber` are unique across active records.

##### **3. Get/Update/Deactivate Single Vehicle**
*   **Path**: `GET /api/vehicles/[id]`
*   **Path**: `PUT /api/vehicles/[id]`
*   **Path**: `DELETE /api/vehicles/[id]`
    *   Performs **Soft Delete** (`isActive` set to `false`).
    *   **Rigid Rule**: Will reject with `400 Bad Request` if any active policy references this vehicle.

---

## 9. Module 2 - Frontend Implementation Status

The entire Customer & Vehicle frontend module is fully completed and integrated. Both directories feature real-time database synchronizations, schema-validated inputs, multi-state visual indicators, and rigid soft delete confirmation flows.

### 9.1 Customer Module Core Infrastructure
*   **Path**: `/src/app/dashboard/customers/page.tsx`
*   **Listing & Search**: Features a fully responsive paginated grid with interactive column sorting, status filters, and global multi-field search triggers.
*   **Add Customer Drawer**: A slide-over right-side panel with immediate client validation (Name length constraints, 10-15 digit phone regex matches, and optional email structure validations). Submits a `POST` request to `/api/customers`.
*   **Edit Customer Drawer**: Prepopulates customer data, allowing updates and account reactivation toggles via `PUT /api/customers/[id]`.
*   **Customer Details Panel**: A split-frame profile card showing immediate contact coordinates, registered asset counters (statistics card), and a real-time timeline auditing creation metadata.
*   **Sub-Asset Real-time Visualizer**: Inside the details panel, the client automatically sends a `GET /api/vehicles?customerId=X` request and populates a dynamic visual inventory list of all registered vehicles owned by this customer, including type and registration badges.

### 9.2 Vehicle Module Core Infrastructure
*   **Path**: `/src/app/dashboard/vehicles/page.tsx`
*   **Listing & Search**: Includes visual cards and records. Columns list Registration plate badges, classification type, manufacturer/model specs, allocation owner profiles, and engine/chassis identifier numbers. Search matches across plate numbers, models, engine, or chassis IDs.
*   **Advanced Customer Selector**: During registration, a client side `useEffect` fetches all active customers from `/api/customers?includeInactive=false` and populates an ownership selector, ensuring complete entity relational consistency.
*   **Add Vehicle Drawer**: A slide-over panel utilizing rigorous validations for plate lengths (3-15 chars), classification types ("Two-Wheeler", "Four-Wheeler", "Commercial", "Other"), model/manufacturer length boundaries, year ranges (1900 to currentYear + 1), and unique chassis/engine fields. Submits a `POST` request to `/api/vehicles`.
*   **Edit Vehicle Drawer**: Prepopulates parameters and exposes state toggling for system suspension/reactivation. Submits a `PUT` request to `/api/vehicles/[id]`.
*   **Vehicle Details Spec Panel**: Displays full physical specifications, vehicle classifications, engine and chassis IDs, registration creation timestamps, and live owner credentials card (name, phone, email).
*   **Deactivation Shield Confirmation Modal**: Implements structural alerts warning staff that deactivation will be rejected if the asset is currently referenced by any active insurance policy. Calls `DELETE /api/vehicles/[id]`.



