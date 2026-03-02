# RevenueCat Subscription Plans

Reference for Sferas RevenueCat integration — entitlements, products, and how the `CustomerInfo` object looks at runtime.

## Products (Apple)

| Product ID | Plan Name | Grants Entitlements |
|---|---|---|
| `petyo.petrov.sferasplus` | **Sfera Plus** | `SferaPlus` |
| `petyo.petrov.sferas` | **Sfera AI** | `SferaPlus` + `Sfera Premium` |

- **Sfera Plus** — unlimited entities, custom notifications, statistics.
- **Sfera AI** — everything in Plus, plus all AI features.

## Entitlements (RevenueCat Dashboard)

| Entitlement ID | What it unlocks |
|---|---|
| `SferaPlus` | Plus features (unlimited entities, notifications, statistics) |
| `Sfera Premium` | AI features (AI-generated insights, nudges, etc.) |

Both entitlements are granted by the AI product (`petyo.petrov.sferas`).
Only `SferaPlus` is granted by the Plus product (`petyo.petrov.sferasplus`).

## Primary Plan Resolution

The app determines `primaryPlan` from `activeSubscriptions` (not entitlements):

1. If `activeSubscriptions` contains `petyo.petrov.sferas` → `"ai"`
2. Else if `activeSubscriptions` contains `petyo.petrov.sferasplus` → `"plus"`
3. Else fallback to whichever entitlement is active (AI takes priority)
4. If none → `null`

## CustomerInfo Object — No Active Subscription

When the user has **no active subscriptions** (expired or never purchased), the object looks like:

```json
{
  "originalAppUserId": "$RCAnonymousID:1eb94f36b15f45e0b48fc4e5f8ca5d0e",
  "requestDate": "2026-03-02T14:02:43Z",
  "entitlements": {
    "active": {},
    "all": {
      "SferaPlus": {
        "isActive": false,
        "expirationDate": "2026-02-28T20:21:05Z",
        "willRenew": false,
        "productIdentifier": "petyo.petrov.sferas"
      },
      "Sfera Premium": {
        "isActive": false,
        "expirationDate": "2026-02-28T20:21:05Z",
        "willRenew": false,
        "productIdentifier": "petyo.petrov.sferas"
      }
    }
  },
  "activeSubscriptions": [],
  "allPurchasedProductIdentifiers": [
    "petyo.petrov.sferasplus",
    "petyo.petrov.sferas"
  ],
  "allExpirationDates": {
    "petyo.petrov.sferasplus": "2026-02-22T20:20:14Z",
    "petyo.petrov.sferas": "2026-02-28T20:21:05Z"
  },
  "allPurchaseDates": {
    "petyo.petrov.sferasplus": "2026-02-22T06:53:37Z",
    "petyo.petrov.sferas": "2026-02-27T20:21:05Z"
  },
  "latestExpirationDate": "2026-02-28T20:21:05Z",
  "managementURL": null
}
```

### Key observations (no subscription)

- `entitlements.active` is **empty** `{}`
- `entitlements.all` still lists both entitlements but with `isActive: false`
- `activeSubscriptions` is **empty** `[]`
- `allPurchasedProductIdentifiers` still shows previously purchased products
- `allExpirationDates` shows when each product expired
- `allPurchaseDates` shows original purchase timestamps
- `managementURL` is `null`

### Derived app state (no subscription)

```json
{
  "hasPlusEntitlement": false,
  "hasAIEntitlement": false,
  "hasPlusPlan": false,
  "hasAIPlan": false,
  "isSubscribed": false,
  "primaryPlan": null,
  "activeEntitlements": []
}
```

## CustomerInfo Object — Active Sfera AI

When the user has an **active Sfera AI** subscription (`petyo.petrov.sferas`), the AI product grants **both** entitlements. Example:

```json
{
  "originalAppUserId": "$RCAnonymousID:1eb94f36b15f45e0b48fc4e5f8ca5d0e",
  "requestDate": "2026-03-02T14:36:56Z",
  "entitlements": {
    "active": {
      "Sfera Premium": {
        "isActive": true,
        "expirationDate": "2026-03-03T14:36:26Z",
        "willRenew": true,
        "productIdentifier": "petyo.petrov.sferas",
        "periodType": "NORMAL"
      },
      "SferaPlus": {
        "isActive": true,
        "expirationDate": "2026-03-03T14:36:26Z",
        "willRenew": true,
        "productIdentifier": "petyo.petrov.sferas",
        "periodType": "NORMAL"
      }
    },
    "all": {
      "Sfera Premium": {
        "isActive": true,
        "expirationDate": "2026-03-03T14:36:26Z",
        "willRenew": true,
        "productIdentifier": "petyo.petrov.sferas"
      },
      "SferaPlus": {
        "isActive": true,
        "expirationDate": "2026-03-03T14:36:26Z",
        "willRenew": true,
        "productIdentifier": "petyo.petrov.sferas"
      }
    }
  },
  "activeSubscriptions": ["petyo.petrov.sferas"],
  "allPurchasedProductIdentifiers": ["petyo.petrov.sferasplus", "petyo.petrov.sferas"],
  "allExpirationDates": {
    "petyo.petrov.sferas": "2026-03-03T14:36:26Z",
    "petyo.petrov.sferasplus": "2026-03-02T14:36:26Z"
  },
  "allPurchaseDates": {
    "petyo.petrov.sferas": "2026-03-02T14:36:26Z",
    "petyo.petrov.sferasplus": "2026-02-22T06:53:37Z"
  },
  "latestExpirationDate": "2026-03-03T14:36:26Z",
  "managementURL": "https://apps.apple.com/account/subscriptions"
}
```

### Key observations (active Sfera AI)

- `entitlements.active` contains **both** `Sfera Premium` and `SferaPlus` — the AI product grants both.
- Both active entitlements share the same `productIdentifier` (`petyo.petrov.sferas`) and `expirationDate`.
- `activeSubscriptions` is `["petyo.petrov.sferas"]` only (the Plus product may appear in `allPurchasedProductIdentifiers` / `allExpirationDates` from a previous purchase).
- `managementURL` is set to the Apple subscriptions page.

### Derived app state (active Sfera AI)

```json
{
  "hasPlusEntitlement": true,
  "hasAIEntitlement": true,
  "hasPlusPlan": false,
  "hasAIPlan": true,
  "isSubscribed": true,
  "primaryPlan": "ai",
  "activeEntitlements": ["Sfera Premium", "SferaPlus"]
}
```

Note: `hasPlusPlan` is false (user did not purchase the Plus product), but `hasPlusEntitlement` is true because the AI product grants the SferaPlus entitlement.

## EntitlementInfo: `willRenew` vs `isActive`

**Official meaning (RevenueCat):**

- **`isActive`** — Whether the user currently has access to the entitlement. Use this for feature gating.
- **`willRenew`** — Whether the **underlying subscription** (the one that unlocked this entitlement) is set to renew at the end of its billing period. RevenueCat notes there can be a **multi-hour delay** between this value and the store; for “cancelled but still active” detection they recommend `unsubscribeDetectedAt` instead.

**Observed quirk: inactive entitlement with `willRenew: true`**

When the user has **Sfera Plus** active (and **Sfera AI** expired), `entitlements.all["Sfera Premium"]` can show:

- `isActive: false` (correct — Plus does not grant Sfera Premium)
- `willRenew: true` (surprising — the product that grants Sfera Premium, `petyo.petrov.sferas`, is not active)

**Likely explanation:** Both products live in the **same Apple subscription group**. RevenueCat may be setting `willRenew` for entitlements in that group from the **group’s** active subscription (Plus), not strictly from the subscription that unlocked each entitlement. So “underlying subscription” can behave like “renewing subscription in this group” for inactive entitlements.

**Recommendation:** Do not use `willRenew` for access control. Rely on **`isActive`** and **`activeSubscriptions`** (and our derived `hasPlusEntitlement` / `hasAIEntitlement` / `isSubscribed`) for gating. Treat `willRenew` as best-effort and potentially delayed or group-scoped.

## Code References

- Entitlement constants: `utils/entitlements.ts`
- Subscription context & state logic: `utils/SubscriptionProvider.tsx`
- Paywall helpers: `utils/revenuecat-paywall.ts`
- RevenueCat wrapper (feature flag): `utils/revenuecat-wrapper.ts`
- Paywall access functions: `utils/premium-access.ts`
