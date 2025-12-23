import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import { useNotificationsManager } from '@/utils/NotificationsProvider';
import { useTranslate } from '@/utils/languages/use-translate';

export default function NotificationsScreen() {
  const t = useTranslate();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const palette = useMemo(
    () => ({
      text: colors.text,
      background: colors.background,
      primary: colors.primary,
      border: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
      card: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      muted: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#4a4a4a',
      error: colors.error || '#e05555',
    }),
    [colorScheme, colors]
  );
  const fontScale = useFontScale();
  const styles = useMemo(() => createStyles(palette, fontScale), [palette, fontScale]);

  const { friends, familyMembers, profiles } = useJourney();
  const { assignments } = useNotificationsManager();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('notifications.title'),
    });
  }, [navigation, t]);

  const renderSphereBlock = (sphere: 'friends' | 'family' | 'relationships', title: string, entityNames: { id: string; name: string }[]) => {
    const assignment = assignments[sphere];
    return (
      <View key={sphere} style={styles.card}>
        <ThemedText size="l" weight="bold" style={{ marginBottom: 8 }}>
          {title}
        </ThemedText>

        <View style={{ marginTop: 12, gap: 10 }}>
          {entityNames.map((entity) => {
            // Check if notification is enabled: must have override with kind 'custom'
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
                  <ThemedText size="sm" weight="medium">
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

  const renderSferasView = () => (
    <ScrollView contentContainerStyle={styles.content}>
      {renderSphereBlock(
        'friends',
        t('notifications.sphere.friends'),
        friends.map((f) => ({ id: f.id, name: f.name }))
      )}
      {renderSphereBlock(
        'family',
        t('notifications.sphere.family'),
        familyMembers.map((f) => ({ id: f.id, name: f.name }))
      )}
      {renderSphereBlock(
        'relationships',
        t('notifications.sphere.relationships'),
        profiles.filter((p) => !p.relationshipEndDate).map((p) => ({ id: p.id, name: p.name }))
      )}
    </ScrollView>
  );

  return (
    <TabScreenContainer>
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
    content: {
      padding: 16 * fontScale,
      paddingBottom: 32 * fontScale,
      gap: 16 * fontScale,
    },
    card: {
      padding: 14 * fontScale,
      borderRadius: 12 * fontScale,
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      gap: 10 * fontScale,
    },
    entityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
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
