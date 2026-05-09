import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import {
  getSferaSizeHintDismissedForever,
  getSunnyVsCloudyHintDismissedForever,
  setSferaSizeHintDismissedForever,
  setSunnyVsCloudyHintDismissedForever,
} from '@/utils/sfera-size-hint-storage';
import { useTranslate } from '@/utils/languages/use-translate';

export default function NotificationsScreen() {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const palette = useMemo(
    () => ({
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      border: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
      card: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      muted: colors.textMediumEmphasis,
      error: colors.error || '#e05555',
    }),
    [colorScheme, colors]
  );
  const styles = useMemo(() => createStyles(palette, fontScale), [palette, fontScale]);

  const [guidePromptEnabled, setGuidePromptEnabled] = useState(true);
  const [sferaSizesHintEnabled, setSferaSizesHintEnabled] = useState(true);

  // Refresh reminders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      getSunnyVsCloudyHintDismissedForever().then((dismissed) => {
        setGuidePromptEnabled(!dismissed);
      });
      getSferaSizeHintDismissedForever().then((dismissed) => {
        setSferaSizesHintEnabled(!dismissed);
      });
    }, [])
  );

  const renderSectionHeader = (label: string) => (
    <View style={{ marginTop: 8, marginBottom: 4, paddingHorizontal: 4 }}>
      <ThemedText size="xs" weight="medium" style={{ color: palette.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </ThemedText>
    </View>
  );

  const renderSferasView = () => (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Section 1: Banners & alerts */}
      {renderSectionHeader(t('notifications.section.banners'))}
      <View style={styles.sectionGroup}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText size="md" style={styles.rowTitleText}>
                {t('notifications.guidePrompt.title')}
              </ThemedText>
              <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
                {t('notifications.guidePrompt.description')}
              </ThemedText>
            </View>
            <View style={styles.switchCompact}>
              <Switch
                value={guidePromptEnabled}
                onValueChange={async (value) => {
                  await setSunnyVsCloudyHintDismissedForever(!value);
                  setGuidePromptEnabled(value);
                }}
                trackColor={{
                  false: 'rgba(150,150,150,0.35)',
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText size="md" style={styles.rowTitleText}>
                {t('notifications.sferaSizesHint.title')}
              </ThemedText>
              <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
                {t('notifications.sferaSizesHint.description')}
              </ThemedText>
            </View>
            <View style={styles.switchCompact}>
              <Switch
                value={sferaSizesHintEnabled}
                onValueChange={async (value) => {
                  await setSferaSizeHintDismissedForever(!value);
                  setSferaSizesHintEnabled(value);
                }}
                trackColor={{
                  false: 'rgba(150,150,150,0.35)',
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Section 2: Push reminders */}
      {renderSectionHeader(t('notifications.section.pushReminders'))}
      <View style={styles.sectionGroup}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/moment-notifications')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText size="md" style={styles.rowTitleText}>
              {t('momentNotifications.title')}
            </ThemedText>
            <MaterialIcons name="chevron-right" size={23 * fontScale} color={palette.text} />
          </View>
          <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
            {t('momentNotifications.addSchedule')}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Section 3: People */}
      {renderSectionHeader(t('notifications.section.people'))}
      <View style={styles.sectionGroup}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/entity-reminders')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <ThemedText size="md" style={styles.rowTitleText}>
              {t('notifications.entityReminders.title')}
            </ThemedText>
            <MaterialIcons name="chevron-right" size={23 * fontScale} color={palette.text} />
          </View>
          <ThemedText size="sm" style={{ color: palette.muted, marginTop: 4 }}>
            {t('notifications.entityReminders.description')}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
              hitSlop={12}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText size="md" weight="bold" style={styles.headerTitle}>
          {t('notifications.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>
      {renderSferasView()}
    </TabScreenContainer>
  );
}

const createStyles = (
  palette: {
    text: string;
    background: string;
    primary: string;
    border: string;
    card: string;
    muted: string;
    error: string;
  },
  fontScale: number
) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16 * fontScale,
      paddingTop: 50,
      paddingBottom: 12 * fontScale,
    },
    headerButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18 * fontScale,
      lineHeight: 24 * fontScale,
    },
    rowTitleText: {
      fontSize: 17 * fontScale,
      lineHeight: 23 * fontScale,
    },
    switchCompact: {
      marginLeft: 8 * fontScale,
      marginRight: -6 * fontScale,
      transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
      alignSelf: 'center',
    },
    content: {
      padding: 16 * fontScale,
      paddingBottom: 32 * fontScale,
      gap: 8 * fontScale,
    },
    sectionGroup: {
      gap: 8 * fontScale,
    },
    card: {
      padding: 14 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 10 * fontScale,
    },
  });
