/**
 * EventPreviewModal — lightweight read-only event detail sheet.
 * Used from insight cards (family/friends sphere) to preview a Sfera event
 * without navigating away. Tap "Open in Events" to go to the full experience.
 */

import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getEventImageUrls, type SferaEvent } from "@/utils/sfera-events";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 20;
const CARD_RADIUS = 20;
const IMAGE_HEIGHT = 200;
const IMAGE_RADIUS = 12;

function formatEventDate(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function EventPreviewModal({
  event,
  onClose,
}: {
  event: SferaEvent;
  onClose: () => void;
}) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const imageUrls = getEventImageUrls(event);
  const hasImages = imageUrls.length > 0 && !imageError;

  const handleOpenInEvents = () => {
    onClose();
    router.push({ pathname: "/(tabs)/events", params: { expandEventId: event.id } });
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => setImageError(false)}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Card — stop propagation so taps inside don't close */}
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colorScheme === "dark" ? "#1A2332" : "#FFFFFF",
              borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
              paddingBottom: Math.max(CARD_PADDING, insets.bottom + 8),
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header row */}
          <View style={styles.header}>
            <ThemedText size="l" weight="bold" numberOfLines={2} style={{ flex: 1, paddingRight: 12 }}>
              {event.name}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12}>
              <MaterialIcons name="close" size={28} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Image */}
            {hasImages ? (
              imageUrls.length === 1 ? (
                <Image
                  source={{ uri: imageUrls[0]! }}
                  style={styles.image}
                  contentFit="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.carouselWrap}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.image}
                    onMomentumScrollEnd={(e) => {
                      const pageWidth = SCREEN_WIDTH - CARD_PADDING * 2 - 32;
                      const idx = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
                      setImageIndex(Math.min(idx, imageUrls.length - 1));
                    }}
                  >
                    {imageUrls.map((uri, idx) => (
                      <Image
                        key={`${event.id}-${idx}`}
                        source={{ uri }}
                        style={[styles.image, { width: SCREEN_WIDTH - CARD_PADDING * 2 - 32 }]}
                        contentFit="cover"
                        onError={() => setImageError(true)}
                      />
                    ))}
                  </ScrollView>
                  {imageUrls.length > 1 && (
                    <View style={styles.dotRow}>
                      {imageUrls.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.dot,
                            { backgroundColor: i === imageIndex ? "#fff" : "rgba(255,255,255,0.4)" },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )
            ) : (
              <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: colors.primary + "20" }]}>
                <MaterialIcons name="event" size={64} color={colors.primary} />
              </View>
            )}

            {/* Meta */}
            <View style={styles.meta}>
              {(event.date || event.startDate) ? (
                <View style={styles.metaRow}>
                  <MaterialIcons name="event" size={16} color={colors.textMediumEmphasis ?? colors.text} />
                  <ThemedText size="sm" emphasis="medium" style={{ marginLeft: 8 }}>
                    {formatEventDate(event.startDate || event.date)}
                  </ThemedText>
                </View>
              ) : null}
              {event.location ? (
                <View style={styles.metaRow}>
                  <MaterialIcons name="location-on" size={16} color={colors.textMediumEmphasis ?? colors.text} />
                  <ThemedText size="sm" emphasis="medium" style={{ marginLeft: 8 }}>
                    {event.location}
                  </ThemedText>
                </View>
              ) : null}
              {event.description ? (
                <ThemedText size="sm" numberOfLines={6} style={{ marginTop: 10 }}>
                  {event.description}
                </ThemedText>
              ) : null}
            </View>
          </ScrollView>

          {/* CTA */}
          <Pressable onPress={handleOpenInEvents} style={styles.ctaWrap}>
            <LinearGradient
              colors={["#64B5F6", "#42A5F5", "#1E88E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cta}
            >
              <MaterialIcons name="event-available" size={18} color="#fff" />
              <ThemedText size="sm" weight="bold" style={{ color: "#fff", marginLeft: 8 }}>
                Open in Events
              </ThemedText>
              <MaterialIcons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" style={{ marginLeft: 4 }} />
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: CARD_RADIUS,
    borderTopRightRadius: CARD_RADIUS,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: CARD_PADDING,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  image: {
    width: "100%",
    height: IMAGE_HEIGHT,
    borderRadius: IMAGE_RADIUS,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  carouselWrap: {
    position: "relative",
  },
  dotRow: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  meta: {
    marginTop: 14,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaWrap: {
    marginTop: 18,
    borderRadius: 12,
    overflow: "hidden",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
});
