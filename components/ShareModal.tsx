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
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function ShareModal({ visible, onClose, title, content }: ShareModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Animation for share button press
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

  // Press handlers for share button
  const handleShareButtonPressIn = () => {
    shareButtonPressScale.value = withTiming(0.92, { duration: 100, easing: Easing.out(Easing.ease) });
  };

  const handleShareButtonPressOut = () => {
    shareButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  // Press handlers for close button
  const handleCloseButtonPressIn = () => {
    closeButtonPressScale.value = withTiming(0.88, { duration: 100, easing: Easing.out(Easing.ease) });
  };

  const handleCloseButtonPressOut = () => {
    closeButtonPressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  // Animated style for share button
  const shareButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareButtonPressScale.value }],
  }));

  // Animated style for close button
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
        style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)' }
        ]}
        onPress={onClose}
      />

      <View style={styles.container} pointerEvents="box-none">
        <View
          style={[
            styles.modal,
            {
              backgroundColor: isDark ? '#1E2A3A' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                { color: isDark ? 'rgba(255, 255, 255, 0.87)' : '#000000' },
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
                style={styles.closeButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'}
                />
              </Pressable>
            </Animated.View>
          </View>

          {/* Content in ScrollView */}
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
                { color: isDark ? 'rgba(255, 255, 255, 0.87)' : 'rgba(0, 0, 0, 0.87)' },
              ]}
            >
              {content || 'No content to share'}
            </Text>
          </ScrollView>

          {/* Share Button at Bottom */}
          <Animated.View style={shareButtonAnimatedStyle}>
            <Pressable
              onPress={handleShare}
              onPressIn={handleShareButtonPressIn}
              onPressOut={handleShareButtonPressOut}
              style={[
                styles.shareButton,
                {
                  backgroundColor: isDark ? '#64B5F6' : '#1976D2',
                },
              ]}
            >
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share</Text>
            </Pressable>
          </Animated.View>
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
    padding: 16,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    height: '70%',
    maxHeight: 600,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    gap: 8,
    flexShrink: 0,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
