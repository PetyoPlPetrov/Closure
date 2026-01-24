import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AIInsightsConsentModalProps = {
  visible: boolean;
  onEnable: () => void;
  onMaybeLater: () => void;
};

export function AIInsightsConsentModal({ visible, onEnable, onMaybeLater }: AIInsightsConsentModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const insets = useSafeAreaInsets();

  const styles = useMemo(() => createStyles(colors, colorScheme ?? 'dark', fontScale, insets.top), [colors, colorScheme, fontScale, insets.top]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onMaybeLater}>
      <Pressable style={styles.backdrop} onPress={onMaybeLater} />
      <View style={styles.container}>
        <View style={styles.card}>
          <ThemedText size="l" weight="bold" style={styles.title}>
            AI Insights
          </ThemedText>
          <ThemedText size="sm" style={styles.body}>
            Sferas now uses AI to analyze your memories and send you personalized motivational nudges. Your data is sent securely to our AI partner solely for this purpose and is not used for training models.
          </ThemedText>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryButton} onPress={onEnable} activeOpacity={0.85}>
              <ThemedText size="sm" weight="bold" style={styles.primaryButtonText}>
                Enable AI Insights
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={onMaybeLater} activeOpacity={0.85}>
              <ThemedText size="sm" weight="bold" style={styles.secondaryButtonText}>
                Maybe Later
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: any, scheme: 'light' | 'dark', fontScale: number, safeTop: number) {
  const isDark = scheme === 'dark';
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 18 * fontScale,
      paddingTop: safeTop,
    },
    card: {
      borderRadius: 16 * fontScale,
      padding: 18 * fontScale,
      backgroundColor: isDark ? (colors.surfaceElevated1 || 'rgba(26, 35, 50, 1)') : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    title: {
      marginBottom: 10 * fontScale,
      color: colors.text,
    },
    body: {
      color: isDark ? (colors.textMediumEmphasis || colors.text) : (colors.textMediumEmphasis || colors.text),
      lineHeight: 20 * fontScale,
    },
    actions: {
      marginTop: 16 * fontScale,
      gap: 10 * fontScale,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    secondaryButton: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      borderRadius: 12 * fontScale,
      paddingVertical: 12 * fontScale,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    },
    secondaryButtonText: {
      color: colors.text,
    },
  });
}

