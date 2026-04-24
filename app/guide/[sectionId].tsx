import { ThemedText } from "@/components/themed-text";
import { Video, ResizeMode } from "expo-av";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { getReadSections, markSectionRead } from "@/utils/guide-storage";
import { useTranslate } from "@/utils/languages/use-translate";
import type { GuideBullet } from "@/utils/guide-data";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SECTIONS } from "@/utils/guide-data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_H_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2;

function BulletCard({
  bullet,
  fontScale,
  colorScheme,
  t,
  colors,
}: {
  bullet: GuideBullet;
  fontScale: number;
  colorScheme: "light" | "dark";
  t: (key: any) => string;
  colors: any;
}) {
  return (
    <View style={{ width: CARD_WIDTH, marginHorizontal: CARD_H_PADDING }}>
      {/* Image / GIF placeholder */}
      {!bullet.hideMedia && bullet.videoSource ? (
        <View
          style={{
            width: "100%",
            height: 260 * fontScale,
            borderRadius: 14 * fontScale,
            overflow: "hidden",
            marginBottom: 16 * fontScale,
            backgroundColor:
              colorScheme === "dark" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.04)",
          }}
        >
          <Video
            source={bullet.videoSource}
            style={{
              width: "100%",
              height: "100%",
            }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
          />
        </View>
      ) : !bullet.hideMedia && bullet.imageSource ? (
        <View
          style={{
            width: "100%",
            height: 300 * fontScale,
            borderRadius: 14 * fontScale,
            overflow: "hidden",
            marginBottom: 16 * fontScale,
          }}
        >
          <Image
            source={bullet.imageSource}
            style={
              bullet.imageScale !== undefined
                ? { width: `${bullet.imageScale * 100}%`, height: `${bullet.imageScale * 100}%`, alignSelf: "center", marginTop: "auto", marginBottom: "auto" }
                : bullet.imageAlignment === "bottom"
                  ? { width: "100%", height: "140%", position: "absolute", bottom: 0, left: 0, right: 0 }
                  : bullet.imageAlignment === "top"
                    ? { width: "100%", height: "120%", position: "absolute", top: bullet.imageOffsetY ?? 0, left: 0, right: 0 }
                    : bullet.imageOffsetY !== undefined
                      ? { width: "55%", height: "75%", position: "absolute", alignSelf: "center", top: bullet.imageOffsetY, left: "22.5%" }
                      : { width: "100%", height: "100%" }
            }
            resizeMode={bullet.imageScale !== undefined ? "contain" : "cover"}
          />
        </View>
      ) : !bullet.hideMedia ? (
        <View
          style={{
            width: "100%",
            height: 200 * fontScale,
            borderRadius: 14 * fontScale,
            backgroundColor:
              colorScheme === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.05)",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            marginBottom: 16 * fontScale,
          }}
        >
          <MaterialIcons
            name="play-circle-outline"
            size={40 * fontScale}
            color={
              colorScheme === "dark"
                ? "rgba(255,255,255,0.4)"
                : "rgba(0,0,0,0.25)"
            }
          />
          <ThemedText
            size="xs"
            emphasis="medium"
            style={{ marginTop: 8 * fontScale }}
          >
            Video coming soon
          </ThemedText>
        </View>
      ) : null}

      {/* Icon + Title */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12 * fontScale,
        }}
      >
        <View
          style={{
            width: 40 * fontScale,
            height: 40 * fontScale,
            borderRadius: 20 * fontScale,
            backgroundColor: "rgba(100,150,255,0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons
            name={bullet.icon}
            size={20 * fontScale}
            color={colors.primary}
          />
        </View>
        <ThemedText size="l" weight="semibold" style={{ flex: 1 }}>
          {t(bullet.titleKey)}
        </ThemedText>
      </View>

      <ThemedText
        size="xs"
        emphasis="medium"
        style={{
          marginTop: 10 * fontScale,
          opacity: colorScheme === "dark" ? 0.72 : 0.65,
        }}
      >
        {t(bullet.menuPathKey)}
      </ThemedText>
    </View>
  );
}

export default function GuideSectionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const [isDone, setIsDone] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxSeenIndex, setMaxSeenIndex] = useState(0);
  const listRef = useRef<FlatList<GuideBullet>>(null);

  const section = SECTIONS.find((s) => s.id === sectionId);

  useEffect(() => {
    if (!sectionId || !section) return;
    getReadSections().then((set) => {
      if (set.has(sectionId)) {
        setIsDone(true);
        setMaxSeenIndex(section.bullets.length - 1);
      }
    });
  }, [sectionId, section]);

  const snapOffsets = useMemo(() => {
    if (!section) return [];
    return section.bullets.map((_, i) => i * (CARD_WIDTH + CARD_H_PADDING * 2));
  }, [section]);

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = snapOffsets.reduce(
        (best, offset, i) =>
          Math.abs(offset - x) < Math.abs(snapOffsets[best] - x) ? i : best,
        0,
      );
      setCurrentIndex(idx);
      setMaxSeenIndex((prev) => Math.max(prev, idx));
    },
    [snapOffsets],
  );

  const onScrollEndDrag = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = snapOffsets.reduce(
        (best, offset, i) =>
          Math.abs(offset - x) < Math.abs(snapOffsets[best] - x) ? i : best,
        0,
      );
      setCurrentIndex(idx);
      setMaxSeenIndex((prev) => Math.max(prev, idx));
      listRef.current?.scrollToOffset({
        offset: snapOffsets[idx] ?? 0,
        animated: false,
      });
    },
    [snapOffsets],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH + CARD_H_PADDING * 2,
      offset: (CARD_WIDTH + CARD_H_PADDING * 2) * index,
      index,
    }),
    [],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create<{
        header: ViewStyle;
        headerButton: ViewStyle;
        headerTitle: TextStyle;
        body: ViewStyle;
        carouselWrapper: ViewStyle;
        pageIndicator: ViewStyle;
        descriptionArea: ViewStyle;
        bottomArea: ViewStyle;
        markDoneButton: ViewStyle;
        markDoneButtonDisabled: ViewStyle;
        markDoneRow: ViewStyle;
      }>({
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16 * fontScale,
          paddingTop: 50,
          paddingBottom: 12 * fontScale,
        },
        headerButton: {
          minWidth: 44,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
        },
        body: {
          flex: 1,
          justifyContent: "space-between",
        },
        carouselWrapper: {
          overflow: "hidden",
          paddingTop: 8 * fontScale,
        },
        pageIndicator: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14 * fontScale,
          paddingHorizontal: 12 * fontScale,
        },
        descriptionArea: {
          paddingHorizontal: 16 * fontScale,
          paddingTop: 20 * fontScale,
          gap: 4 * fontScale,
        },
        bottomArea: {
          paddingHorizontal: 16 * fontScale,
          paddingBottom: 36 * fontScale,
          paddingTop: 16 * fontScale,
        },
        markDoneButton: {
          height: 52 * fontScale,
          borderRadius: 14 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
        },
        markDoneButtonDisabled: {
          height: 52 * fontScale,
          borderRadius: 14 * fontScale,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
        },
        markDoneRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8 * fontScale,
          height: 52 * fontScale,
        },
      }),
    [fontScale, colors.primary, colorScheme],
  );

  if (!section) {
    return (
      <TabScreenContainer>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <MaterialIcons
              name="arrow-back-ios"
              size={24 * fontScale}
              color={colors.text}
            />
          </TouchableOpacity>
          <View style={styles.headerButton} />
        </View>
      </TabScreenContainer>
    );
  }

  const allSeen = maxSeenIndex >= section.bullets.length - 1;
  const currentBullet = section.bullets[currentIndex];

  const navigateTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, section.bullets.length - 1));
      listRef.current?.scrollToOffset({
        offset: snapOffsets[clamped] ?? 0,
        animated: true,
      });
      setCurrentIndex(clamped);
      setMaxSeenIndex((prev) => Math.max(prev, clamped));
    },
    [snapOffsets, section.bullets.length],
  );

  const handleMarkDone = async () => {
    if (!allSeen) return;
    await markSectionRead(section.id);
    setIsDone(true);
  };

  return (
    <TabScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText size="l" weight="bold" style={styles.headerTitle}>
          {t(section.titleKey)}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.body}>
        {/* Top: carousel + dots + description */}
        <View>
          <View style={styles.carouselWrapper}>
            <FlatList
              ref={listRef}
              data={section.bullets}
              keyExtractor={(item) => item.titleKey}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToOffsets={snapOffsets}
              snapToAlignment="start"
              decelerationRate="fast"
              getItemLayout={getItemLayout}
              onScrollEndDrag={onScrollEndDrag}
              onMomentumScrollEnd={onMomentumScrollEnd}
              renderItem={({ item }) => (
                <BulletCard
                  bullet={item}
                  fontScale={fontScale}
                  colorScheme={colorScheme ?? "dark"}
                  t={t}
                  colors={colors}
                />
              )}
            />

            {/* Arrows + page indicator dots */}
            <View style={styles.pageIndicator}>
              <TouchableOpacity
                onPress={() => navigateTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                hitSlop={12}
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={28 * fontScale}
                  color={
                    currentIndex === 0
                      ? colorScheme === "dark"
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(0,0,0,0.15)"
                      : colors.text
                  }
                />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 * fontScale }}>
                {section.bullets.map((_, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: idx === currentIndex ? 10 : 7,
                      height: idx === currentIndex ? 10 : 7,
                      borderRadius: 5,
                      backgroundColor:
                        idx === currentIndex
                          ? colors.primary
                          : idx <= maxSeenIndex
                            ? colorScheme === "dark"
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(0,0,0,0.25)"
                            : colorScheme === "dark"
                              ? "rgba(255,255,255,0.15)"
                              : "rgba(0,0,0,0.1)",
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={() => navigateTo(currentIndex + 1)}
                disabled={currentIndex === section.bullets.length - 1}
                hitSlop={12}
                activeOpacity={0.6}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={28 * fontScale}
                  color={
                    currentIndex === section.bullets.length - 1
                      ? colorScheme === "dark"
                        ? "rgba(255,255,255,0.15)"
                        : "rgba(0,0,0,0.15)"
                      : colors.text
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Current bullet description — static below dots, updates on swipe */}
          <View style={styles.descriptionArea}>
            <ThemedText size="sm" emphasis="medium">
              {t(currentBullet.descriptionKey)}
            </ThemedText>
          </View>
        </View>

        {/* Bottom: mark as done */}
        <View style={styles.bottomArea}>
          {isDone ? (
            <View style={styles.markDoneRow}>
              <MaterialIcons
                name="check-circle"
                size={20 * fontScale}
                color="#4CAF50"
              />
              <ThemedText
                size="sm"
                weight="semibold"
                style={{ color: "#4CAF50" }}
              >
                {t("guide.markedDone")}
              </ThemedText>
            </View>
          ) : (
            <TouchableOpacity
              style={
                allSeen
                  ? styles.markDoneButton
                  : styles.markDoneButtonDisabled
              }
              onPress={handleMarkDone}
              activeOpacity={allSeen ? 0.8 : 1}
              disabled={!allSeen}
            >
              <ThemedText
                size="l"
                weight="bold"
                style={{
                  color: allSeen
                    ? "#ffffff"
                    : colorScheme === "dark"
                      ? "rgba(255,255,255,0.25)"
                      : "rgba(0,0,0,0.25)",
                }}
              >
                {t("guide.markDone")}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TabScreenContainer>
  );
}
