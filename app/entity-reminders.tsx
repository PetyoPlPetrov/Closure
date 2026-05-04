import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useNotificationsManager } from '@/utils/NotificationsProvider';
import { useTranslate } from '@/utils/languages/use-translate';
import { getSphereSferaColor } from '@/utils/sphere-styles';

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const intVal = Number.parseInt(expanded, 16);
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function EntityRemindersScreen() {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const resolvedColorScheme: "dark" = colorScheme;
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
      surfaceElevated: colorScheme === 'dark' ? '#2D3A4F' : 'rgba(0, 0, 0, 0.08)',
    }),
    [colorScheme, colors]
  );
  const styles = useMemo(() => createStyles(palette, fontScale), [palette, fontScale]);

  const { friends, familyMembers, profiles } = useJourney();
  const { assignments } = useNotificationsManager();

  const renderSphereRows = (
    sphere: 'friends' | 'family' | 'relationships',
    title: string,
    entityNames: { id: string; name: string }[]
  ) => {
    if (entityNames.length === 0) return null;
    const assignment = assignments[sphere];
    const sphereAccent = getSphereSferaColor(sphere, resolvedColorScheme);
    const sectionBorderColor = hexToRgba(sphereAccent, 0.24);
    const sectionBackgroundColor = hexToRgba(sphereAccent, 0.06);
    const sectionLabelColor = hexToRgba(sphereAccent, 0.95);
    const rowAccentColor = hexToRgba(sphereAccent, 0.72);
    return (
      <View
        key={sphere}
        style={[
          styles.sphereSection,
          {
            borderColor: sectionBorderColor,
            backgroundColor: sectionBackgroundColor,
          },
        ]}
      >
        <ThemedText
          size="xs"
          weight="semibold"
          style={{
            color: sectionLabelColor,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          {title}
        </ThemedText>
        <View style={styles.rowsStack}>
          {entityNames.map((entity) => {
            const override = assignment?.overrides?.[entity.id];
            const notifOn = override?.kind === 'custom';

            return (
              <TouchableOpacity
                key={entity.id}
                style={styles.entityRow}
                onPress={() => router.push(`/notifications/${sphere}/${entity.id}`)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.rowSphereAccent, { backgroundColor: rowAccentColor }]} />
                  <ThemedText size="m" weight="medium">
                    {entity.name}
                  </ThemedText>
                </View>
                <View style={styles.rowActionsCompact}>
                  <View style={[styles.badge, notifOn ? styles.badgeOn : styles.badgeOff]}>
                    <MaterialIcons
                      name={notifOn ? 'notifications-active' : 'notifications-off'}
                      size={16 * fontScale}
                      color={notifOn ? palette.background : palette.text}
                    />
                    <ThemedText size="xs" weight="bold" style={{ color: notifOn ? palette.background : palette.text }}>
                      {notifOn ? t('notifications.status.on') : t('notifications.status.off')}
                    </ThemedText>
                  </View>
                  <MaterialIcons name="chevron-right" size={20 * fontScale} color={palette.text} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const sphereBlocks = [
    renderSphereRows('family', t('notifications.sphere.family'), familyMembers.map((f) => ({ id: f.id, name: f.name }))),
    renderSphereRows('friends', t('notifications.sphere.friends'), friends.map((f) => ({ id: f.id, name: f.name }))),
    renderSphereRows(
      'relationships',
      t('notifications.sphere.relationships'),
      profiles.filter((p) => !p.relationshipEndDate).map((p) => ({ id: p.id, name: p.name }))
    ),
  ].filter(Boolean);

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7} hitSlop={12}>
          <MaterialIcons name="arrow-back-ios" size={24 * fontScale} color={colors.text} />
        </TouchableOpacity>
        <ThemedText size="l" weight="bold" style={styles.headerTitle}>
          {t('notifications.entityReminders.title')}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText size="sm" style={{ color: palette.muted, marginBottom: 4 }}>
          {t('notifications.entityReminders.description')}
        </ThemedText>

        {sphereBlocks.length === 0 ? (
          <ThemedText size="sm" style={{ color: palette.muted, textAlign: 'center', marginTop: 32 }}>
            {t('notifications.entityReminders.empty')}
          </ThemedText>
        ) : (
          <View style={styles.sectionsStack}>
            {sphereBlocks.map((block, i) => (
              <View key={i}>{block}</View>
            ))}
          </View>
        )}
      </ScrollView>
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
    surfaceElevated: string;
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
    },
    content: {
      padding: 16 * fontScale,
      paddingBottom: 32 * fontScale,
      gap: 12 * fontScale,
    },
    card: {
      padding: 14 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
    },
    sectionsStack: {
      gap: 12 * fontScale,
    },
    sphereSection: {
      borderRadius: 16 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.card,
      paddingHorizontal: 12 * fontScale,
      paddingVertical: 12 * fontScale,
    },
    rowsStack: {
      gap: 8 * fontScale,
    },
    entityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      borderRadius: 12 * fontScale,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surfaceElevated,
      paddingHorizontal: 10 * fontScale,
      paddingVertical: 10 * fontScale,
    },
    rowSphereAccent: {
      width: 3 * fontScale,
      height: 18 * fontScale,
      borderRadius: 999,
    },
    rowActionsCompact: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10 * fontScale,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6 * fontScale,
      paddingHorizontal: 10 * fontScale,
      paddingVertical: 6 * fontScale,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.border,
      minWidth: 84 * fontScale,
      justifyContent: 'center',
    },
    badgeOn: {
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    },
    badgeOff: {
      backgroundColor: palette.card,
      borderColor: palette.border,
    },
  });
