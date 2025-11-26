import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFontScale } from '@/hooks/use-device-size';
import { useLargeDevice } from '@/hooks/use-large-device';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { useLanguage } from '@/utils/languages/language-context';
import { useTranslate } from '@/utils/languages/use-translate';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { DimensionValue, Modal, Pressable, ScrollView, StyleSheet, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const fontScale = useFontScale();
  const { maxContentWidth } = useLargeDevice();
  const { language, setLanguage } = useLanguage();
  const t = useTranslate();
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create<{
        content: ViewStyle;
        title: TextStyle;
        section: ViewStyle;
        sectionTitle: TextStyle;
        languageOption: ViewStyle;
        languageOptionSelected: ViewStyle;
        languageOptionContent: ViewStyle;
        languageOptionText: TextStyle;
        checkIcon: ViewStyle;
        dropdown: ViewStyle;
        dropdownContent: ViewStyle;
        dropdownText: TextStyle;
        modalOverlay: ViewStyle;
        modalContent: ViewStyle;
        modalHeader: ViewStyle;
        dropdownOption: ViewStyle;
        dropdownOptionContent: ViewStyle;
        dropdownOptionText: TextStyle;
      }>({
        content: {
          padding: 16 * fontScale,
          paddingBottom: 32 * fontScale,
          gap: 24 * fontScale,
          maxWidth: maxContentWidth as DimensionValue,
          alignSelf: 'center',
          width: '100%',
        },
        title: {
          marginBottom: 8 * fontScale,
        },
        section: {
          gap: 16 * fontScale,
        },
        sectionTitle: {
          marginBottom: 8 * fontScale,
        },
        languageOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
          borderColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
        },
        languageOptionSelected: {
          borderColor: colors.primary,
          borderWidth: 2,
        },
        languageOptionContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
          flex: 1,
        },
        languageOptionText: {
          flex: 1,
        },
        checkIcon: {
          width: 24 * fontScale,
          height: 24 * fontScale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        dropdown: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16 * fontScale,
          borderRadius: 12 * fontScale,
          backgroundColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
          borderColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
        },
        dropdownContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
          flex: 1,
        },
        dropdownText: {
          flex: 1,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        },
        modalContent: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
          borderTopLeftRadius: 20 * fontScale,
          borderTopRightRadius: 20 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 40 * fontScale,
          maxHeight: '50%',
        },
        modalHeader: {
          paddingHorizontal: 20 * fontScale,
          paddingBottom: 16 * fontScale,
          borderBottomWidth: 1,
          borderBottomColor:
            colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.1)'
              : 'rgba(0, 0, 0, 0.1)',
        },
        dropdownOption: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16 * fontScale,
          paddingHorizontal: 20 * fontScale,
        },
        dropdownOptionContent: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12 * fontScale,
          flex: 1,
        },
        dropdownOptionText: {
          flex: 1,
        },
      }),
    [fontScale, colorScheme, colors.primary, maxContentWidth]
  );

  const handleLanguageChange = async (lang: 'en' | 'bg') => {
    await setLanguage(lang);
    setDropdownVisible(false);
  };

  const getLanguageLabel = (lang: 'en' | 'bg') => {
    return lang === 'en' ? t('settings.language.english') : t('settings.language.bulgarian');
  };

  return (
    <TabScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText size="xl" weight="bold" style={styles.title}>
          {t('settings.title')}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText size="l" weight="semibold" style={styles.sectionTitle}>
            {t('settings.language')}
          </ThemedText>
    

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dropdownContent}>
              <MaterialIcons
                name="language"
                size={24 * fontScale}
                color={colors.primary}
              />
              <ThemedText
                size="l"
                weight="medium"
                style={styles.dropdownText}
              >
                {getLanguageLabel(language)}
              </ThemedText>
            </View>
            <MaterialIcons
              name="arrow-drop-down"
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={dropdownVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.modalContent}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <ThemedText size="l" weight="bold">
                    {t('settings.language')}
                  </ThemedText>
                </View>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleLanguageChange('en')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="language"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={language === 'en' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.language.english')}
                    </ThemedText>
                  </View>
                  {language === 'en' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => handleLanguageChange('bg')}
                  activeOpacity={0.7}
                >
                  <View style={styles.dropdownOptionContent}>
                    <MaterialIcons
                      name="language"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                    <ThemedText
                      size="l"
                      weight={language === 'bg' ? 'bold' : 'medium'}
                      style={styles.dropdownOptionText}
                    >
                      {t('settings.language.bulgarian')}
                    </ThemedText>
                  </View>
                  {language === 'bg' && (
                    <MaterialIcons
                      name="check-circle"
                      size={24 * fontScale}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </ScrollView>
    </TabScreenContainer>
  );
}
