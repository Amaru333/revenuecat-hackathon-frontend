# Bytes (Byte to Bite) — Written Proposal

## Problem Statement

**What audience need does this solve?**

Home cooks and food enthusiasts often see a dish they love—in a photo, a video, or at a restaurant—and want to recreate it, but lack a reliable way to get from “what I see” to “what I cook.” Existing solutions either require manual recipe hunting, don’t handle visual input well, or scatter ingredients, nutrition, and meal planning across multiple apps.

**Specific needs we address:**

- **Visual-to-recipe:** Turn any food photo or video into a detailed recipe (ingredients, steps, nutrition) without typing or guessing.
- **Reduce food waste:** Use pantry and receipt scans to get recipe suggestions that match what users already have.
- **Unified cooking workflow:** One place for recipes, cookbooks (including PDF uploads), inventory, shopping lists, meal planning, and cooking mode—instead of juggling several tools.
- **Transparent limits:** A free tier with clear daily and total caps so users can try the product meaningfully before deciding to upgrade.

Our primary audience is **home cooks and meal planners** who want AI-assisted cooking from real-world cues (photos, videos, pantry) and a single app that ties together discovery, planning, and execution.

---

## Solution Overview

**How does the app address this need?**

**Bytes** is a mobile app (React Native/Expo) that turns food imagery and text into actionable recipes and connects that to inventory, cookbooks, meal prep, and shopping.

1. **Recipe discovery**
   - **Photo/video analysis:** Upload a food image or video; AI returns a full recipe with ingredients, instructions, and nutrition.
   - **Text-based generation:** Describe a dish in words and get a structured recipe.
   - **From inventory:** Scan pantry or receipts; the app suggests recipes based on what you have, reducing waste and indecision.

2. **Organization and execution**
   - **Cookbooks:** Upload PDF cookbooks; recipes are parsed and saved to a personal cookbook.
   - **Saved recipes & favorites:** Build a library of go-to recipes.
   - **Meal planning:** Plan meals by day and meal type; link to recipes.
   - **Shopping lists:** Generate lists from selected recipes, with “need to buy” vs “already have.”
   - **Cooking mode:** Step-by-step guidance while cooking.
   - **Cook history:** Log what you cooked, with ratings and notes.

3. **Access control and fairness**
   - **Free plan:** Full feature set with daily limits (e.g., 3 AI recipe generations, 2 inventory scans, 1 suggestion per day) and total caps (e.g., 15 saved recipes, 1 cookbook, 3 shopping lists). Daily limits reset at midnight UTC.
   - **Pro plan:** Unlimited access to all of the above. When a free user hits a limit, they see a clear upgrade prompt and can open the paywall without losing context.

The backend enforces limits and syncs subscription state so that entitlements are consistent across devices and with the store, while the frontend gives immediate feedback via usage summaries and upgrade prompts.

---

## Monetization Strategy

**How subscriptions or purchases are structured**

- **Model:** Free tier with usage limits + **Bytes Pro** subscription for unlimited access. No one-time purchases in the current scope; all paid access is subscription-based.

- **Plans**
  - **Free:** Daily and total limits as above; all features available but capped.
  - **Pro (Bytes Pro):** Monthly and/or yearly subscription (configurable in the store and RevenueCat). Optional **1-month free trial** for monthly; trial and pricing are configured in Google Play and surfaced on the RevenueCat paywall.

- **Store & infrastructure**
  - **Android:** RevenueCat is integrated with **Google Play**; the app uses RevenueCat’s native paywall (`RevenueCatUI.presentPaywall()`) and Customer Center for manage/restore. Product IDs (e.g. `monthly`, `yearly`) and entitlement **“Byte to Bite Pro”** are defined in RevenueCat and mapped to backend “pro” tier.
  - **iOS:** Not currently configured for RevenueCat/payments; the app runs on iOS with free-tier behavior only.

- **Backend sync**
  - After purchase or restore, the app sends subscription status (isPro, product id, expiration) to the backend. The backend stores tier and expiration and uses them for limit checks.
  - A **RevenueCat webhook** can push server-side events (e.g. renewal, cancellation, expiration) so the backend stays in sync even if the user doesn’t open the app.

- **User experience**
  - Upgrade prompts when limits are reached; paywall and restore available from profile and customer center.
  - Trial and pricing copy are managed in the RevenueCat paywall template (e.g. “1 month free, then $X/month”) so changes don’t require app releases.

---

## Roadmap

**What we would build next if selected or continued post-hackathon**

1. **iOS monetization**
   - Add RevenueCat iOS API key and App Store Connect products; enable paywall and Customer Center on iOS so Pro is available on both platforms.

2. **Annual plan and promos**
   - Promote a yearly option with a discount; use RevenueCat offerings to A/B test paywall variants and intro offers.

3. **Usage dashboard in-app**
   - Dedicated screen showing daily and total usage (e.g. “3/3 recipe generations today,” “10/15 saved recipes”) and a clear CTA to upgrade when near or at limits.

4. **Camera-first flows**
   - In-app camera for recipe and inventory capture (photo/video) to reduce friction from “see food” to “get recipe.”

5. **Offline and performance**
   - Cache recipes and cooking steps for offline use; optimize image upload and AI latency for a smoother experience.

6. **Retention and engagement**
   - Notifications for meal plan reminders, “use your pantry” suggestions, and gentle re-engagement for inactive users; optional email digest of weekly meal plans.

7. **Expanded AI and content**
   - Support for dietary tags, allergens, and serving-size adjustments; optional integration with more cookbook sources or community recipes.

8. **Analytics and experimentation**
   - Use RevenueCat and product analytics to measure conversion from free to Pro, trial-to-paid, and feature usage to prioritize roadmap and paywall placement.

---

*Bytes (Byte to Bite) — From any food photo or video to a full recipe, with inventory, cookbooks, meal prep, and shopping in one place.*
