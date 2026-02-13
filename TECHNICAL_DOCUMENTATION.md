# Bytes (Byte to Bite) — Technical Documentation

## High-Level Architecture Overview

### System Components

<img width="783" height="794" alt="image" src="https://github.com/user-attachments/assets/0ef0c2c2-249f-43f9-86a4-a1961baa1987" />


### Data and Request Flow

- **Auth:** User signs up/logs in via backend; JWT is stored and sent as `Authorization: Bearer <token>` on API requests. RevenueCat user ID is set to the app’s user ID after login for server-side reconciliation.
- **Subscription:** Entitlement and product info come from RevenueCat SDK on the client. The client syncs this to the backend via `POST /api/subscription/sync`. The backend also receives RevenueCat webhooks for server-side updates. All limit checks use the backend’s view of tier (free vs pro) and usage.
- **Usage limits:** Daily limits (recipe generation, inventory scan, recipe suggestion) and total limits (cookbook uploads, saved recipes, shopping lists) are enforced in backend middleware. The frontend calls `GET /api/subscription/status` for usage summary and uses `canUseFeature(action)` for UI (e.g. disabling buttons or showing upgrade prompts).

### Frontend Structure (expo-frontend)

| Area | Purpose |
|------|--------|
| `app/` | Expo Router: auth, onboarding, drawer (main app), paywall, modal |
| `contexts/` | `AuthContext` (user, token), `RevenueCatContext` (isPro, usage, paywall, restore) |
| `config/revenuecat.ts` | API keys, entitlement ID, product IDs, test store flag |
| `services/` | API clients: `subscriptionService` (RevenueCat SDK), `subscriptionApiService` (backend subscription endpoints), recipe, cookbook, inventory, etc. |
| `constants/` | `URL.ts` (backend base URL), `branding.ts`, `theme.ts` |

### Backend Structure (backend)

| Area | Purpose |
|------|--------|
| `server.js` | Express app, CORS, JSON body, mount of all API routes |
| `routes/` | Route definitions; protected routes use `authenticate` and optionally `requireDailyLimit` / `requireTotalLimit` |
| `controllers/` | Business logic; subscription controller handles sync, status, test-toggle, webhook |
| `middleware/auth.js` | JWT verification, attach `req.user` |
| `middleware/subscription.js` | `TIER_LIMITS`, `getUserTier`, `getUsageSummary`, `requireDailyLimit(action)`, `requireTotalLimit(action)` |
| `prisma/schema.prisma` | User (with subscription fields), Recipe, Cookbook, InventoryItem, UsageLog, MealPlan, etc. |

---

## RevenueCat Integration and Monetization Setup

### 1. Client-Side (Expo Frontend)

**Configuration (`config/revenuecat.ts`)**

- **API keys:** Android public API key is set; iOS key is empty (iOS not used for purchases). Optional test store key and `EXPO_PUBLIC_REVENUECAT_USE_TEST_STORE=true` for sandbox testing.
- **Entitlement:** `entitlementId: "Byte to Bite Pro"` — must match the entitlement ID in the RevenueCat project.
- **Products:** `monthly`, `yearly` (product IDs aligned with Google Play).

**Initialization**

- In `app/_layout.tsx`, `initializeRevenueCat()` is called on app load. It configures `Purchases` with the correct API key (and test store when enabled). On iOS, initialization is skipped so the app still runs without RevenueCat.

**RevenueCatContext (`contexts/RevenueCatContext.tsx`)**

- **State:** `customerInfo`, `isPro`, `subscriptionStatus`, `subscriptionInfo`, `usage`, `isLoading`.
- **Pro detection:** `checkProFromCustomerInfo(info)` reads `info.entitlements.active[entitlementId]`; if present, user is Pro. Expiration and `willRenew` come from that entitlement.
- **Backend sync:** After any customer info update (initial fetch, listener, restore), the context calls `syncSubscriptionWithBackend(token, { isPro, productIdentifier, expirationDate })` so the backend has the same tier and expiration.
- **Usage:** `refreshUsage()` calls `GET /api/subscription/status` and stores `usage` (daily and total limits/remaining). `canUseFeature(action)` uses cached `usage` and `isPro` to return `{ allowed, current, limit, remaining }` for UI and gating.
- **Paywall:** `showPaywall()` uses `RevenueCatUI.presentPaywall()` (Android only). After the user closes the paywall, `refreshCustomerInfo()` runs so state and backend stay updated.
- **Customer Center:** `showCustomerCenter()` uses `RevenueCatUI.presentCustomerCenter()` for manage subscription / restore (Android only).
- **Restore:** `restorePurchases()` calls RevenueCat’s `restorePurchases()`, then `processCustomerInfo()` to update state and sync to backend.
- **Listeners:** RevenueCat `addCustomerInfoUpdateListener` and AppState `active` trigger `refreshCustomerInfo()` so subscription changes (e.g. renewal, expiration) are reflected without restart.

**Subscription services**

- `subscriptionService.ts`: Wraps RevenueCat SDK — `initializeRevenueCat`, `setRevenueCatUserId`, `getCustomerInfo`, `restorePurchases`, etc.
- `subscriptionApiService.ts`: Backend API — `syncSubscriptionWithBackend`, `getSubscriptionStatus`; helpers `isUsageLimitError`, `getLimitInfoFromError` for 429 handling.

**Paywall screen (`app/(drawer)/paywall.tsx`)**

- On mount, calls `RevenueCatUI.presentPaywall()`. On `PURCHASED` or `RESTORED`, refreshes customer info and navigates back; on cancel, just goes back.

### 2. Backend Subscription Logic

**Database (Prisma)**

- `User`: `subscriptionTier` (`free` | `pro`), `subscriptionProductId`, `subscriptionExpiresAt`, `revenuecatId`. Used as source of truth for tier after sync or webhook.
- `UsageLog`: `userId`, `action`, `date`, `count` for daily usage; total limits for saved recipes, cookbooks, and shopping lists are derived from actual record counts.

**Subscription middleware (`middleware/subscription.js`)**

- **TIER_LIMITS:** For `free`, defines daily caps (e.g. recipe_generation: 3, inventory_scan: 2, recipe_suggestion: 1) and total caps (cookbook_upload: 1, saved_recipes: 15, shopping_lists: 3). For `pro`, all are `Infinity`.
- **getUserTier(user):** Returns `pro` only if `subscriptionTier === 'pro'` and `subscriptionExpiresAt` is in the future; otherwise `free`.
- **requireDailyLimit(action):** Loads tier, calls `checkDailyLimit(userId, tier, action)` (uses `UsageLog` for that user/action/today). If over limit, responds with **429** and `limitInfo` (action, current, limit, remaining, tier, upgradeRequired). Otherwise attaches `req.limitInfo` and continues.
- **requireTotalLimit(action):** Same idea for lifetime/total limits; for `saved_recipes` / `shopping_lists` / `cookbook_upload` uses Prisma counts, not just UsageLog.

**Subscription controller (`controllers/subscriptionController.js`)**

- **syncSubscription:** `POST /api/subscription/sync`. Body: `isPro`, `productIdentifier`, `expirationDate`, optional `revenuecatId`. Updates `User` and returns updated subscription summary.
- **getSubscriptionStatus:** `GET /api/subscription/status`. Returns tier, isPro, productId, expiresAt, limits, and full **usage** summary (daily and total) for the authenticated user.
- **revenuecatWebhook:** `POST /api/subscription/webhook`. Handles RevenueCat events (e.g. INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION). Resolves user by `app_user_id` (revenuecatId or numeric user id). On purchase-type events, sets user to pro and stores product/expiration; on EXPIRATION, sets to free. Always responds 200 so RevenueCat does not retry unnecessarily.
- **testToggleSubscription:** `POST /api/subscription/test-toggle`. Dev-only; flips current user between free and pro for testing without store.

**Route protection examples**

- `recipeRoutes`: `POST /analyze`, `POST /generate-from-text` use `requireDailyLimit('recipe_generation')`; `GET /suggestions-from-inventory` uses `requireDailyLimit('recipe_suggestion')`; save recipe uses `requireTotalLimit('saved_recipes')`.
- `inventoryRoutes`: `POST /scan` uses `requireDailyLimit('inventory_scan')`.
- `cookbookRoutes`: `POST /upload` uses `requireTotalLimit('cookbook_upload')`; save recipe to my recipes uses `requireTotalLimit('saved_recipes')`.
- `shoppingRoutes`: `POST /generate` uses `requireTotalLimit('shopping_lists')`.

### 3. End-to-End Monetization Flow

1. **User opens app** → RevenueCat SDK initialized (Android); user id set when logged in.
2. **Entitlement check** → `getCustomerInfo()` → active entitlement “Byte to Bite Pro” → `isPro = true` in context; else free.
3. **Sync to backend** → Context calls `syncSubscriptionWithBackend` with isPro, productId, expiration → backend updates `User` and returns success.
4. **Usage** → Every rate-limited request goes through `requireDailyLimit` or `requireTotalLimit`; backend increments or checks usage and returns 429 when limit exceeded. Frontend uses `canUseFeature()` and 429 handler to show upgrade prompt and optionally open paywall.
5. **Purchase** → User taps upgrade → `showPaywall()` → RevenueCat UI → user subscribes (or restores) → CustomerInfo listener or post-paywall refresh runs → `processCustomerInfo` → sync to backend → `isPro` true, usage unlimited.
6. **Webhook** → RevenueCat sends renewal/expiration/cancellation to `POST /api/subscription/webhook` → backend updates `User` so tier stays correct even if the app is closed.

### 4. Trial and Paywall Copy

- Free trial (e.g. 1 month) is configured in **Google Play** for the subscription product.
- Paywall layout and copy (including trial text) are managed in the **RevenueCat Dashboard** (Paywalls). Use variables such as `{{ product.offer_period_with_unit }}` and `{{ product.price }}` so trial and price display correctly without app changes. See project root `PAYWALL_TRIAL_DISPLAY.md` for details.

### 5. Summary Table

| Item | Location / Value |
|------|-------------------|
| Entitlement ID | RevenueCat project + `config/revenuecat.ts`: `"Byte to Bite Pro"` |
| Product IDs | `monthly`, `yearly` (RevenueCat + Google Play) |
| Paywall UI | RevenueCat Dashboard (RevenueCatUI.presentPaywall) |
| Backend sync | POST `/api/subscription/sync` (from client after purchase/restore) |
| Webhook | POST `/api/subscription/webhook` (RevenueCat → backend) |
| Usage & limits | `GET /api/subscription/status`; middleware `requireDailyLimit` / `requireTotalLimit` |
| Daily reset | Midnight UTC (backend `getToday()` in subscription middleware) |

This setup keeps a single source of truth for “pro” status (RevenueCat + synced backend), enforces limits server-side, and gives the frontend a simple API for gating and upgrade prompts.
