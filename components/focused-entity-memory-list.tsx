/**
 * FocusedEntityMemoryList — list-mode alternative to FloatingAvatar.
 * Shows an entity's memories as a scrollable list when display mode is "list".
 */

import { ConstellationBackground } from "@/components/constellation-background";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { IdealizedMemory, LifeSphere } from "@/utils/JourneyProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import { useVisualSettings } from "@/utils/VisualSettingsProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const IS_IPAD =
  Platform.OS === "ios" && (Platform.isPad || Math.min(SW, SH) >= 768);
const IPAD_SCALE = IS_IPAD ? 1.3 : 1;

const SPHERE_ICONS: Record<LifeSphere, keyof typeof MaterialIcons.glyphMap> = {
  relationships: "person",
  career: "work",
  family: "family-restroom",
  friends: "people",
  hobbies: "sports-esports",
};

type FocusedEntityMemoryListProps = {
  entity: { id: string; name: string; imageUri?: string };
  memories: IdealizedMemory[];
  sphere: LifeSphere;
  colorScheme: "light" | "dark";
  onMemoryFocus: (
    entityId: string,
    memoryId: string,
    sphere: LifeSphere,
  ) => void;
};

export const FocusedEntityMemoryList = React.memo(
  function FocusedEntityMemoryList({
    entity,
    memories,
    sphere,
    colorScheme,
    onMemoryFocus,
  }: FocusedEntityMemoryListProps) {
    const colors = Colors[colorScheme];
    const fontScale = useFontScale();
    const { isTablet } = useLargeDevice();
    const { momentColors } = useMomentColors();
    const t = useTranslate();
    const { constellationAmount, constellationOpacity } = useVisualSettings();

    const iPadHeaderScale = IS_IPAD ? 1.3 : 1;
    const headerBackSize = (isTablet ? 70 : 50) * iPadHeaderScale;
    const headerBottom = 70 + headerBackSize;

    // Match SferaInsightsCard dimensions from focused-entities-view
    const IPAD_CARD_SCALE = IS_IPAD ? 1.6 : 1;
    const insightAtmoR = Math.round(120 * IPAD_CARD_SCALE);
    const insightPlanetCanvas = Math.round(insightAtmoR * 3.4);
    const insightCardHeight = Math.round(insightPlanetCanvas + 20) * IPAD_CARD_SCALE;

    // Position: avatar section fills the same space as SferaInsightsCard
    const usableTop = headerBottom;
    const insightCardListY = usableTop + insightCardHeight / 2 + 8;
    const sortPillsTop = insightCardListY + insightCardHeight / 2 + 16;
    const listTop = sortPillsTop + 40;

    // Avatar fills the insight card area — use ~55% of the card height
    const avatarSize = Math.round(insightCardHeight * 0.55);
    const placeholderIcon = SPHERE_ICONS[sphere];

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            flex: 1,
            width: SW,
            height: SH,
          },
          avatarContainer: {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            overflow: "hidden",
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
          },
          avatar: {
            width: "100%",
            height: "100%",
          },
          avatarPlaceholder: {
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.primary + "40",
          },
          memoryRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12 * fontScale,
            paddingHorizontal: 20 * fontScale,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor:
              colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.08)"
                : "rgba(0, 0, 0, 0.08)",
          },
          memoryInfo: {
            flex: 1,
            marginRight: 10 * fontScale,
          },
          memoryBar: {
            height: 18 * fontScale,
            borderRadius: 9 * fontScale,
            overflow: "hidden",
            flexDirection: "row",
            backgroundColor:
              colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            width: isTablet ? 120 : 90,
          },
          barSegment: {
            height: "100%",
          },
        }),
      [fontScale, colorScheme, colors, avatarSize, isTablet],
    );

    const [sortBy, setSortBy] = useState<"memories" | "sunny">("memories");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

    const sortedMemories = useMemo(() => {
      const slice = [...memories];
      const dir = sortDir === "desc" ? 1 : -1;
      slice.sort((a, b) => {
        if (sortBy === "sunny") {
          return ((b.goodFacts || []).length - (a.goodFacts || []).length) * dir;
        }
        const totalA = (a.goodFacts || []).length + (a.hardTruths || []).length;
        const totalB = (b.goodFacts || []).length + (b.hardTruths || []).length;
        return (totalB - totalA) * dir;
      });
      return slice;
    }, [memories, sortBy, sortDir]);

    const sortPill = (
      key: "memories" | "sunny",
      label: string,
    ) => (
      <TouchableOpacity
        key={key}
        onPress={() => {
          if (sortBy === key) {
            setSortDir((d) => (d === "desc" ? "asc" : "desc"));
          } else {
            setSortBy(key);
            setSortDir("desc");
          }
        }}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingLeft: 10,
          paddingRight: 8,
          paddingVertical: 6,
          borderRadius: 14,
          backgroundColor:
            sortBy === key
              ? colorScheme === "dark"
                ? "rgba(255, 255, 255, 0.18)"
                : "rgba(0, 0, 0, 0.12)"
              : "transparent",
          borderWidth: 1,
          borderColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.15)"
              : "rgba(0, 0, 0, 0.1)",
        }}
      >
        <ThemedText
          size="xs"
          weight={sortBy === key ? "semibold" : "normal"}
          style={{ opacity: sortBy === key ? 1 : 0.6 }}
        >
          {label}
        </ThemedText>
        <MaterialIcons
          name={sortBy === key && sortDir === "asc" ? "arrow-upward" : "arrow-downward"}
          size={12}
          color={colors.text}
          style={{ opacity: sortBy === key ? 1 : 0.4 }}
        />
      </TouchableOpacity>
    );

    return (
      <View style={styles.container}>
        <ConstellationBackground
          width={SW}
          height={SH}
          constellationAmount={constellationAmount}
          constellationOpacity={constellationOpacity}
        />

        {/* Entity avatar — centered in the same area as SferaInsightsCard */}
        <View
          style={{
            position: "absolute",
            top: usableTop,
            left: 0,
            right: 0,
            height: insightCardHeight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View style={styles.avatarContainer}>
            {entity.imageUri ? (
              <Image
                source={{ uri: entity.imageUri }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons
                  name={placeholderIcon}
                  size={Math.round(32 * fontScale * IPAD_SCALE)}
                  color={colors.primaryLight}
                />
              </View>
            )}
          </View>
          <ThemedText
            size="xs"
            emphasis="medium"
            style={{ marginTop: 8 * fontScale }}
          >
            {memories.length} {t("displayMode.memories")}
          </ThemedText>
        </View>

        {/* Fixed sort pills — same position as sphere list view */}
        {memories.length > 1 && (
          <View
            style={{
              position: "absolute",
              top: sortPillsTop,
              left: 0,
              right: 0,
              zIndex: 10,
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: 20,
              paddingVertical: 8,
              gap: 8,
            }}
          >
            {sortPill("memories", t("displayMode.sort.memories"))}
            {sortPill("sunny", t("displayMode.sort.sunny"))}
          </View>
        )}

        {/* Scrollable memory list — starts at same Y as sphere list view */}
        <ScrollView
          style={{
            position: "absolute",
            top: listTop,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
            {memories.length === 0 ? (
              <ThemedText
                size="sm"
                emphasis="medium"
                style={{
                  textAlign: "center",
                  marginTop: 40 * fontScale,
                  paddingHorizontal: 20,
                }}
              >
                {t("insights.detail.relationship.memories.noData")}
              </ThemedText>
            ) : (
              sortedMemories.map((memory) => {
                const cloudyCount = (memory.hardTruths || []).length;
                const sunnyCount = (memory.goodFacts || []).length;
                const total = cloudyCount + sunnyCount;

                if (total === 0) return null;

                const cloudyPct = (cloudyCount / total) * 100;
                const sunnyPct = (sunnyCount / total) * 100;

                return (
                  <TouchableOpacity
                    key={memory.id}
                    style={styles.memoryRow}
                    onPress={() => onMemoryFocus(entity.id, memory.id, sphere)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memoryInfo}>
                      <ThemedText size="sm" weight="semibold" numberOfLines={1}>
                        {memory.title}
                      </ThemedText>
                      <ThemedText
                        size="xs"
                        emphasis="medium"
                        style={{ marginTop: 2 }}
                      >
                        {sunnyCount} / {cloudyCount}
                      </ThemedText>
                    </View>

                    <View style={styles.memoryBar}>
                      {cloudyCount > 0 && (
                        <View
                          style={[
                            styles.barSegment,
                            {
                              width: `${cloudyPct}%`,
                              backgroundColor: momentColors.cloudy.background,
                            },
                          ]}
                        />
                      )}
                      {sunnyCount > 0 && (
                        <View
                          style={[
                            styles.barSegment,
                            {
                              width: `${sunnyPct}%`,
                              backgroundColor: momentColors.sunny.background,
                            },
                          ]}
                        />
                      )}
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={20 * fontScale}
                      color={colors.textMediumEmphasis}
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                );
              })
            )}
        </ScrollView>
      </View>
    );
  },
);
