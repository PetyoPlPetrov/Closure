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

## Code References

- Entitlement constants: `utils/entitlements.ts`
- Subscription context & state logic: `utils/SubscriptionProvider.tsx`
- Paywall helpers: `utils/revenuecat-paywall.ts`
- RevenueCat wrapper (feature flag): `utils/revenuecat-wrapper.ts`
- Paywall access functions: `utils/premium-access.ts`
