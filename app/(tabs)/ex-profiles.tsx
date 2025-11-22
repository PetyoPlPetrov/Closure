import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale, useIconScale } from '@/hooks/use-device-size';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ExProfilesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const iconScale = useIconScale();

  // Memoize dynamic styles that scale with device size
  // Only recalculate when fontScale changes
  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16 * fontScale,
      paddingTop: 8 * fontScale,
      paddingBottom: 8 * fontScale,
    },
    headerButton: {
      width: 48 * fontScale,
      height: 48 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16 * fontScale,
      paddingVertical: 24 * fontScale,
      gap: 24 * fontScale,
    },
    iconContainer: {
      width: 200 * fontScale * iconScale,
      height: 200 * fontScale * iconScale,
      borderRadius: 100 * fontScale * iconScale,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: '100%',
      aspectRatio: 1,
    },
    textContainer: {
      alignItems: 'center',
      gap: 8 * fontScale,
      maxWidth: 480 * fontScale,
    },
    heading: {
      textAlign: 'center',
    },
    description: {
      textAlign: 'center',
      maxWidth: 480 * fontScale,
    },
    button: {
      width: '100%',
      minWidth: 84 * fontScale,
      maxWidth: 480 * fontScale,
      height: 48 * fontScale,
      borderRadius: 8 * fontScale,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16 * fontScale,
    },
    buttonText: {
    },
  }), [fontScale, iconScale]);

  return (
    <TabScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>Ex Profiles</ThemedText>
        <View style={styles.headerButton} />
      </View>

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { 
          backgroundColor: colorScheme === 'dark' 
            ? 'rgba(14, 165, 233, 0.5)' 
            : 'rgba(125, 211, 252, 0.3)' // Light blue circle for light mode
        }]}>
          <MaterialIcons 
            name="psychology" 
            size={100 * fontScale * iconScale} 
            color={colorScheme === 'dark' ? colors.primaryLight : colors.primary}
            style={{ fontWeight: '200' }}
          />
        </View>

        {/* Heading and Description */}
        <View style={styles.textContainer}>
          <ThemedText size="l" weight="bold" letterSpacing="s" style={styles.heading}>
            Begin Your Journey to Closure
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            This is a safe space to document past relationships objectively. Creating a profile is the first constructive step towards understanding and moving on.
          </ThemedText>
        </View>

        {/* Button */}
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <ThemedText weight="bold" letterSpacing="l" style={styles.buttonText}>
            Add Your First Ex Profile
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </TabScreenContainer>
  );
}

