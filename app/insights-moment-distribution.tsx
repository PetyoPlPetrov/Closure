import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import type { LifeSphere } from "@/utils/JourneyProvider";
import { useJourney } from "@/utils/JourneyProvider";
import {
  countMetricInMemory,
  getMemoriesForEntityInsight,
  parseMomentInsightKind,
} from "@/utils/insights-moment-kind";
import { useTranslate } from "@/utils/languages/use-translate";
import { getSphereAccentColor } from "@/utils/sphere-styles";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const SPHERES: LifeSphere[] = [
  "relationships",
  "career",
  "family",
  "friends",
  "hobbies",
];

export default function InsightsMomentDistributionScreen() {
  const colorScheme = useColorScheme();
  const scheme = (colorScheme ?? "dark") as "light" | "dark";
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const params = useLocalSearchParams<{ type?: string }>();
  const rawType =
    typeof params.type === "string" ? params.type : undefined;
  const kind = parseMomentInsightKind(rawType);

  const {
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  } = useJourney();

  useEffect(() => {
    if (kind === null) {
      router.back();
    }
  }, [kind]);

  const sphereRows = useMemo(() => {
    if (!kind) return [];
    const rows: { sphere: LifeSphere; count: number }[] = [];

    for (const sphere of SPHERES) {
      let count = 0;
      const entities = getEntitiesBySphere(sphere);
      for (const entity of entities) {
        const memories = getMemoriesForEntityInsight(
          sphere,
          entity.id,
          getIdealizedMemoriesByProfileId,
          getIdealizedMemoriesByEntityId,
        );
        for (const memory of memories) {
          count += countMetricInMemory(memory, kind);
        }
      }
      if (count > 0) {
        rows.push({ sphere, count });
      }
    }

    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [
    kind,
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  ]);

  const totalCount = useMemo(
    () => sphereRows.reduce((s, r) => s + r.count, 0),
    [sphereRows],
  );

  const title =
    kind === "sunny"
      ? t("insights.momentDistribution.titleSunny")
      : kind === "cloudy"
        ? t("insights.momentDistribution.titleCloudy")
        : kind === "lessons"
          ? t("insights.momentDistribution.titleLessons")
          : "";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16 * fontScale,
          paddingTop: 20 * fontScale,
          paddingBottom: 8 * fontScale,
          marginTop: 50,
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
        scrollContent: {
          paddingHorizontal: 16 * fontScale,
          paddingBottom: 100 * fontScale,
        },
        card: {
          marginTop: 8 * fontScale,
          marginBottom: 24 * fontScale,
          padding: 20 * fontScale,
          borderRadius: 16 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.05)"
              : "rgba(0, 0, 0, 0.05)",
        },
        legendItem: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14 * fontScale,
        },
        legendLeft: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          gap: 10 * fontScale,
        },
        legendDot: {
          width: 12 * fontScale,
          height: 12 * fontScale,
          borderRadius: 6 * fontScale,
        },
        legendLabel: {
          flex: 1,
        },
        pct: {
          marginLeft: 8 * fontScale,
        },
        stackedBarWrapper: {
          height: 48 * fontScale,
          borderRadius: 24 * fontScale,
          overflow: "hidden",
          flexDirection: "row",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.1)"
              : "rgba(0, 0, 0, 0.1)",
        },
        stackedBarSegment: {
          height: "100%",
        },
        emptyWrap: {
          paddingVertical: 48 * fontScale,
          alignItems: "center",
        },
      }),
    [fontScale, colorScheme],
  );

  if (kind === null) {
    return null;
  }

  const openSphere = (sphere: LifeSphere) => {
    router.push({
      pathname: "/insights-moment-sphere",
      params: { type: kind, sphere },
    });
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
            name="arrow-back"
            size={24 * fontScale}
            color={colors.text}
          />
        </TouchableOpacity>
        <ThemedText
          size="xl"
          weight="bold"
          letterSpacing="s"
          style={styles.headerTitle}
          numberOfLines={2}
        >
          {title}
        </ThemedText>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {totalCount === 0 ? (
            <View style={styles.emptyWrap} />
          ) : (
            <>
              {sphereRows.map((row) => {
                const pct =
                  totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                const sphereColor = getSphereAccentColor(row.sphere, scheme);
                const label = t(`spheres.${row.sphere}` as const);
                return (
                  <TouchableOpacity
                    key={row.sphere}
                    style={styles.legendItem}
                    onPress={() => openSphere(row.sphere)}
                    activeOpacity={0.65}
                  >
                    <View style={styles.legendLeft}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: sphereColor },
                        ]}
                      />
                      <ThemedText
                        size="m"
                        weight="semibold"
                        style={styles.legendLabel}
                      >
                        {label} ({row.count})
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <ThemedText
                        size="m"
                        weight="bold"
                        style={[styles.pct, { color: sphereColor }]}
                      >
                        {Math.round(pct)}%
                      </ThemedText>
                      <MaterialIcons
                        name="chevron-right"
                        size={22 * fontScale}
                        color={colors.icon}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.stackedBarWrapper}>
                {sphereRows.map((row, i) => {
                  const pct =
                    totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                  const w =
                    i === sphereRows.length - 1
                      ? Math.max(
                          0,
                          100 -
                            sphereRows
                              .slice(0, -1)
                              .reduce(
                                (s, r) =>
                                  s +
                                  (totalCount > 0
                                    ? (r.count / totalCount) * 100
                                    : 0),
                                0,
                              ),
                        )
                      : pct;
                  return (
                    <View
                      key={`bar-${row.sphere}`}
                      style={[
                        styles.stackedBarSegment,
                        {
                          width: `${w}%`,
                          backgroundColor: getSphereAccentColor(row.sphere, scheme),
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}
