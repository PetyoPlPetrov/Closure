import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useJourney } from '@/utils/JourneyProvider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const params = useLocalSearchParams();
  const { getProfile } = useJourney();
  
  const profileId = params.profileId as string | undefined;
  const profile = profileId ? getProfile(profileId) : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16 * fontScale,
          paddingTop: 8 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 20,
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
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth,
          alignSelf: 'center',
          width: '100%',
        },
        title: {
          marginBottom: 12 * fontScale,
        },
        description: {
          marginBottom: 32 * fontScale,
        },
        buttons: {
          gap: 16 * fontScale,
        },
        button: {
          width: '100%',
          height: 56 * fontScale,
          borderRadius: 12 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16 * fontScale,
          flexDirection: 'row',
          gap: 12 * fontScale,
        },
      }),
    [fontScale, maxContentWidth]
  );

  const handleEditExInfo = () => {
    if (profileId) {
      router.push({
        pathname: '/add-ex-profile',
        params: { profileId, edit: 'true' },
      });
    }
  };

  const handleEditMemories = () => {
    if (profileId) {
      router.push({
        pathname: '/idealized-memories',
        params: { profileId },
      });
    }
  };

  // Redirect if profile not found
  useEffect(() => {
    if (!profile && profileId) {
      router.back();
    }
  }, [profile, profileId]);

  if (!profile) {
    return null;
  }

  return (
    <TabScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.headerTitle}>
          {profile.name}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title and Description */}
        <View>
          <ThemedText size="xl" weight="bold" letterSpacing="s" style={styles.title}>
            Edit Profile
          </ThemedText>
          <ThemedText size="sm" weight="normal" style={styles.description}>
            Choose what you&apos;d like to edit for this profile.
          </ThemedText>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colorScheme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.05)',
                borderWidth: 1,
                borderColor: colorScheme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
            onPress={handleEditExInfo}
            activeOpacity={0.8}
          >
            <MaterialIcons name="person" size={24 * fontScale} color={colors.primary} />
            <ThemedText weight="bold" letterSpacing="l" style={{ color: colors.text, flex: 1 }}>
              Edit Ex Info
            </ThemedText>
            <MaterialIcons 
              name="chevron-right" 
              size={24 * fontScale} 
              color={colorScheme === 'dark' ? colors.icon : colors.tabIconDefault}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: colorScheme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.05)',
                borderWidth: 1,
                borderColor: colorScheme === 'dark' 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)',
              },
            ]}
            onPress={handleEditMemories}
            activeOpacity={0.8}
          >
            <MaterialIcons 
              name="psychology" 
              size={24 * fontScale} 
              color={colors.primary} 
            />
            <ThemedText weight="bold" letterSpacing="l" style={{ color: colors.text, flex: 1 }}>
              Edit Memories
            </ThemedText>
            <MaterialIcons 
              name="chevron-right" 
              size={24 * fontScale} 
              color={colorScheme === 'dark' ? colors.icon : colors.tabIconDefault}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}

