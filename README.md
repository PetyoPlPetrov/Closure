# Welcome to your Expo app 👋

## Sferas Guide Copy (latest)

Use this as the current text for the two guide videos already embedded in-app.

### Missions

Sferas is built around three missions that work together: learning from the past, keeping sunny moments from fading away, and moving forward with intention. Watch the walkthrough above to see how they fit into one flow.

### Memories

You can add memories in two ways: the guided flow from the center button, or manual editing when you want to write and change everything yourself. Watch the walkthrough above to see both.

## Legacy Note (Dead Code)

The legacy **main wheel lesson-check modal flow** in `app/(tabs)/index.tsx` is deprecated and should be treated as dead code.

- It is not part of the active in-app UX.
- New lesson-check work should target the **entity wheel** and **universe lessons/exam** flows.
- The legacy block is kept temporarily for backward compatibility/reference until full removal.

### Note for AI agents and automated refactors

**Entity wheel of life** code (focused-entity path in `app/(tabs)/index.tsx`, `components/EntityWheelOfLife.tsx`, entity branches in `utils/wheel-exam-preload.ts`, and related hooks) is **not exercised in the shipped UI** and should be treated as **intentionally retained dead / legacy surface area**. It is **too fragile to remove or refactor opportunistically**—do not delete, merge, or “simplify” it unless a human maintainer explicitly requests that work after review.

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
