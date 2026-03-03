import { Stack } from "expo-router";

export default function BackupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="import" />
    </Stack>
  );
}
