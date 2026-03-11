import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  Share,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

// Cosmic palette
const COSMIC = {
  deepSpace: '#0D1117',
  nebulaMid: '#1A2332',
  nebulaSoft: '#243041',
  nebulaGlow: '#2D3A4F',
  primary: '#64B5F6',
  primaryLight: '#90CAF9',
  primaryGlow: 'rgba(100, 181, 246, 0.35)',
  star: 'rgba(255, 255, 255, 0.5)',
  starDim: 'rgba(255, 255, 255, 0.2)',
  overlay: 'rgba(8, 12, 24, 0.88)',
};

const LIGHT_COSMIC = {
  overlay: 'rgba(0, 0, 0, 0.52)',
  gradient: ['#FFFFFF', '#F0F4FA', '#E8EEF5'] as const,
  border: 'rgba(100, 181, 246, 0.25)',
  contentBg: 'rgba(255, 255, 255, 0.6)',
  shareGradient: ['#42A5F5', '#64B5F6'] as const,
};

export default function ShareModal({ visible, onClose, title, content }: ShareModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const shareButtonPressScale = useSharedValue(1);
  const closeButtonPressScale = useSharedValue(1);

  const handleShare = async () => {
    try {
      await Share.share({
        message: content,
        title: title,
      });
    } catch (error) {
      // Error sharing content
    }
  };

  const handleShareButtonPressIn = () => {
    shareButtonPressScale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.ease) });
  };

  const handleShareButtonPressOut = () => {
    shareButtonPressScale.value = withSpring(1, { damping: 12, stiffness: 280 });
  };

  const handleCloseButtonPressIn = () => {
    closeButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
  };

  const handleCloseButtonPressOut = () => {
    closeButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const shareButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareButtonPressScale.value }],
  }));

  const closeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeButtonPressScale.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: isDark ? COSMIC.overlay : LIGHT_COSMIC.overlay }]}
        onPress={onClose}
      />

      <View style={styles.container} pointerEvents="box-none">
        <View
          style={[
            styles.modalOuter,
            isDark && styles.modalOuterDark,
          ]}
        >
          {isDark ? (
            <>
              <LinearGradient
                colors={[COSMIC.nebulaMid, COSMIC.nebulaSoft, COSMIC.nebulaGlow, COSMIC.nebulaMid]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Subtle star dots */}
              <View style={styles.starField}>
                {[0.1, 0.25, 0.4, 0.6, 0.75, 0.9].map((x, i) => (
                  <View
                    key={`s${i}`}
                    style={[
                      styles.star,
                      {
                        left: `${x * 100}%`,
                        top: i % 2 === 0 ? 12 : 24,
                        width: i % 3 === 0 ? 3 : 2,
                        height: i % 3 === 0 ? 3 : 2,
                        backgroundColor: i % 2 === 0 ? COSMIC.star : COSMIC.starDim,
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <LinearGradient
              colors={LIGHT_COSMIC.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={[styles.modalInner, isDark && styles.modalInnerDark]}>
            {/* Header */}
            <View style={[styles.header, isDark && styles.headerDark]}>
              <Text
                style={[
                  styles.title,
                  { color: isDark ? 'rgba(255, 255, 255, 0.92)' : '#1A2332' },
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Animated.View style={closeButtonAnimatedStyle}>
                <Pressable
                  onPress={onClose}
                  onPressIn={handleCloseButtonPressIn}
                  onPressOut={handleCloseButtonPressOut}
                  style={[
                    styles.closeButton,
                    isDark ? styles.closeButtonDark : styles.closeButtonLight,
                  ]}
                >
                  <MaterialIcons
                    name="close"
                    size={22}
                    color={isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(26, 35, 50, 0.7)'}
                  />
                </Pressable>
              </Animated.View>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={true}
            >
              <Text
                style={[
                  styles.content,
                  { color: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(26, 35, 50, 0.87)' },
                ]}
              >
                {content || 'No content to share'}
              </Text>
            </ScrollView>

            {/* Share button */}
            <Animated.View style={[styles.shareButtonWrap, shareButtonAnimatedStyle]}>
              <Pressable
                onPress={handleShare}
                onPressIn={handleShareButtonPressIn}
                onPressOut={handleShareButtonPressOut}
                style={({ pressed }) => [styles.shareButtonPressable, pressed && styles.shareButtonPressed]}
              >
                {isDark ? (
                  <LinearGradient
                    colors={[COSMIC.primary, COSMIC.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shareButtonGradient}
                  >
                    <MaterialIcons name="share" size={20} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </LinearGradient>
                ) : (
                  <LinearGradient
                    colors={LIGHT_COSMIC.shareGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shareButtonGradient}
                  >
                    <MaterialIcons name="share" size={20} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </LinearGradient>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOuter: {
    width: '92%',
    maxWidth: 480,
    height: '70%',
    maxHeight: 560,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LIGHT_COSMIC.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modalOuterDark: {
    borderColor: 'rgba(100, 181, 246, 0.28)',
    shadowColor: COSMIC.primary,
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalInner: {
    flex: 1,
    minHeight: 280,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalInnerDark: {
    backgroundColor: 'transparent',
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.15)',
    flexShrink: 0,
  },
  headerDark: {
    borderBottomColor: 'rgba(100, 181, 246, 0.15)',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  closeButtonDark: {
    backgroundColor: 'rgba(100, 181, 246, 0.12)',
  },
  closeButtonLight: {
    backgroundColor: 'rgba(100, 181, 246, 0.1)',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  content: {
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  shareButtonWrap: {
    flexShrink: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  shareButtonPressable: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COSMIC.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  shareButtonPressed: {
    opacity: 0.92,
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
