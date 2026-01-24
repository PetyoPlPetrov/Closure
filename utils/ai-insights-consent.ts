import AsyncStorage from '@react-native-async-storage/async-storage';

export type AIInsightsConsentChoice = 'enabled' | 'maybe_later';

const STORAGE_KEY_AI_INSIGHTS_CONSENT = '@sferas:ai_insights_consent';

export async function getAIInsightsConsentChoice(): Promise<AIInsightsConsentChoice | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_AI_INSIGHTS_CONSENT);
    if (raw === 'enabled' || raw === 'maybe_later') return raw;
    return null;
  } catch {
    return null;
  }
}

export async function setAIInsightsConsentChoice(choice: AIInsightsConsentChoice): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_AI_INSIGHTS_CONSENT, choice);
}

export async function isAIInsightsEnabled(): Promise<boolean> {
  const choice = await getAIInsightsConsentChoice();
  return choice === 'enabled';
}

