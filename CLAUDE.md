# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Sferas** is a React Native mobile app built with Expo that helps users track and process life experiences across different "spheres" (relationships, career, family, friends, hobbies). The app uses a unique visual metaphor where each sphere contains entities (ex-partners, jobs, family members, etc.) that users can process through therapeutic workflows.

### Key Technologies
- **Expo SDK 54** with file-based routing (`expo-router`)
- **React Native 0.81.5** with React 19.1.0
- **New Architecture enabled** (`newArchEnabled: true`)
- **React Compiler** enabled in experiments
- **Reanimated 4.1.1** for animations
- **Firebase Analytics** for tracking
- **RevenueCat** for subscriptions (can be disabled via feature flag)
- **Expo Notifications** for local notifications management
- **AsyncStorage** for local data persistence

## Development Commands

### Starting the Development Server
```bash
npm start                # Start Expo dev server
npm run android          # Run on Android emulator
npm run ios              # Run on iOS simulator
npm run web              # Run on web
```

### Building
```bash
npm run prebuild         # Generate native projects
npm run build:android    # Build Android production locally
npm run build:ios        # Bump version and build iOS production locally
npm run build:ios:preview # Build iOS preview locally
```

### Other Commands
```bash
npm run lint             # Run ESLint
npm run bump:version     # Increment app version (see scripts/bump-version.js)
npm run download-fake-images  # Download placeholder images for testing
npm run postinstall      # Runs create-splash-logo.js (auto-runs after npm install)
```

## Architecture

### File-Based Routing
The app uses Expo Router with typed routes enabled. Main structure:
- `app/(tabs)/` - Tab navigation screens (index, spheres, settings)
- `app/` - Modal and detail screens
- Root layout at `app/_layout.tsx` defines the navigation stack

### Context Providers
The app wraps components in multiple providers (defined in `app/_layout.tsx`):
1. **AppThemeProvider** - Theme management
2. **SplashAnimationProvider** - Custom splash screen animations
3. **LanguageProvider** - i18n (English/Bulgarian auto-detection)
4. **SubscriptionProvider** - RevenueCat subscription state
5. **JourneyProvider** - Core data management for all life spheres
6. **NotificationsProvider** - Notification permissions and handling

### Data Architecture (JourneyProvider)

The app's core data is managed by `JourneyProvider` (`utils/JourneyProvider.tsx`), which:
- Stores all data in AsyncStorage with separate keys per sphere type
- Defines 5 life spheres: `'relationships' | 'career' | 'family' | 'friends' | 'hobbies'`
- Each sphere contains typed entities:
  - **Relationships**: `ExProfile` (ex-partners)
  - **Career**: `Job`
  - **Family**: `FamilyMember`
  - **Friends**: `Friend`
  - **Hobbies**: `Hobby`

All entities extend `BaseEntity` with:
- `id`, `name`, `description`, `imageUri`
- `sphere`, `setupProgress` (0-100), `isCompleted`
- `createdAt`, `updatedAt` timestamps

### Storage Keys
```typescript
'@sferas:ex_profiles'           // Relationships
'@sferas:jobs'                  // Career
'@sferas:family_members'        // Family
'@sferas:friends'               // Friends
'@sferas:hobbies'              // Hobbies
'@sferas:idealized_memories'    // Shared memories
```

### Theme System
- Custom theme defined in `constants/theme.ts`
- Dark mode uses Material Design principles: desaturated colors, elevation-based surfaces, proper text opacity (87%/60%/38%)
- Primary color: `#64B5F6` (desaturated blue) in dark mode
- Background: `#1A2332` (dark blue-grey)
- Platform-specific fonts via `Fonts` export

### Animations
Heavy use of `react-native-reanimated` for:
- Custom splash screen animations with pulse and split effects
- Draggable "moments" (memories) on the home screen
- Sparkled dots scattered around the floating avatar
- Sphere entrance animations with staggered delays
- Smooth transitions between screens

### Firebase Integration
- Auto-initialized via `@react-native-firebase/app` plugin (no manual init needed)
- Analytics tracked via `utils/analytics.ts` with events like:
  - `logEntityCreated`, `logMemoryCreated`, `logMomentCreated`

### RevenueCat Integration
- Controlled by `ENABLE_REVENUECAT` feature flag in `utils/revenuecat-wrapper.ts`
- Gracefully handles missing native module (web/dev builds)
- Platform-specific API keys in `app/_layout.tsx`
- RevenueCat paywall is used throughout the app via `showPaywallForPremiumAccess()` from `utils/premium-access.ts`

### Localization
- Auto-detects Bulgarian (`bg`) or English (`en`) based on device locale
- Translations in `utils/languages/translations.ts`
- Use `useTranslate()` hook to get `t()` function

## Important Files

### Configuration
- `app.json` - Expo config with custom plugins
- `eas.json` - EAS Build configuration
- `tsconfig.json` - Path alias `@/*` maps to project root

### Custom Expo Plugins
Located in `plugins/`:
- `with-transparent-splash-logo.js` - Custom splash screen rendering
- `with-firebase-appdelegate.js` - Firebase iOS setup
- `withAnalyticsSourcePatch.js` - Firebase Analytics source patches

### Scripts
- `scripts/bump-version.js` - Increments semver in `app.json`, syncs iOS buildNumber and Android versionCode
- `scripts/create-splash-logo.js` - Generates splash screen logo (runs on postinstall/postprebuild)
- `scripts/download-fake-images.js` - Downloads test images

## Development Notes

### Version Bumping
- Always run `npm run bump:version` before production builds
- Script automatically syncs version across `expo.version`, `ios.buildNumber`, and `android.versionCode`
- iOS builds auto-run bump via `build:ios` script

### AsyncStorage Data
All user data is stored locally - no backend. Key patterns:
- Lists stored as JSON arrays
- Each entity has unique UUID (`id` field)
- CRUD operations are synchronous within JourneyProvider context

### Navigation Patterns
- Use `router.push()`, `router.replace()`, or `router.back()` from `expo-router`
- Detail screens receive entity ID via route params
- Tab screens at `(tabs)/` use custom tab bar with haptic feedback

### TypeScript
- Strict mode enabled
- Typed routes via `experiments.typedRoutes: true`
- Use `@/` path alias for imports (e.g., `@/utils/JourneyProvider`)

### Platform-Specific Code
- iOS: Uses static frameworks (`useFrameworks: "static"`)
- Android: Edge-to-edge enabled, predictive back gesture disabled
- Platform-specific constants via `Platform.select()`

### Error Handling
- `utils/dev-error-handler.ts` shows errors in dev, silent in production
- RevenueCat errors don't crash the app - features degrade gracefully
