import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { useLargeDevice } from "@/hooks/use-large-device";
import type { IdealizedMemory } from "@/utils/JourneyProvider";
import { useMomentColors } from "@/utils/MomentColorsProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { useMemo } from "react";
import { Dimensions, Platform, StyleSheet, TouchableOpacity, View } from "react-native";

const { width: _SW, height: _SH } = Dimensions.get("window");
const IS_IPAD =
  Platform.OS === "ios" &&
  (Platform.isPad || Math.min(_SW, _SH) >= 768);
const IPAD_SCALE = IS_IPAD ? 1.3 : 1;

type EntityListItemProps = {
  id: string;
  name: string;
  imageUri?: string;
  memories: IdealizedMemory[];
  placeholderIcon: keyof typeof MaterialIcons.glyphMap;
  onPress: (entityId: string) => void;
};

export const EntityListItem = React.memo(function EntityListItem({
  id,
  name,
  imageUri,
  memories,
  placeholderIcon,
  onPress,
}: EntityListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const { isTablet } = useLargeDevice();
  const { momentColors } = useMomentColors();
  const t = useTranslate();

  const avatarSize = Math.round(40 * fontScale * IPAD_SCALE);

  const { sunnyCount, cloudyCount, sunnyPct, cloudyPct } = useMemo(() => {
    let sunny = 0;
    let cloudy = 0;
    for (const m of memories) {
      sunny += (m.goodFacts || []).length;
      cloudy += (m.hardTruths || []).length;
    }
    const total = sunny + cloudy;
    return {
      sunnyCount: sunny,
      cloudyCount: cloudy,
      sunnyPct: total > 0 ? (sunny / total) * 100 : 0,
      cloudyPct: total > 0 ? (cloudy / total) * 100 : 0,
    };
  }, [memories]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
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
        info: {
          flex: 1,
          marginHorizontal: 12 * fontScale,
        },
        bar: {
          height: 20 * fontScale,
          borderRadius: 10 * fontScale,
          overflow: "hidden",
          flexDirection: "row",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
          width: isTablet ? 140 : 100,
        },
        barSegment: {
          height: "100%",
        },
      }),
    [fontScale, colorScheme, colors, avatarSize, isTablet],
  );

  const total = sunnyCount + cloudyCount;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons
              name={placeholderIcon}
              size={Math.round(20 * fontScale * IPAD_SCALE)}
              color={colors.primaryLight}
            />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <ThemedText size="sm" weight="semibold" numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText
          size="xs"
          emphasis="medium"
          style={{ marginTop: 2 * fontScale }}
        >
          {memories.length} {t("displayMode.memories")}
        </ThemedText>
      </View>

      {total > 0 && (
        <View style={styles.bar}>
          {cloudyPct > 0 && (
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
          {sunnyPct > 0 && (
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
      )}

      <MaterialIcons
        name="chevron-right"
        size={22 * fontScale}
        color={colors.textMediumEmphasis}
        style={{ marginLeft: 8 * fontScale }}
      />
    </TouchableOpacity>
  );
});
