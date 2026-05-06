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

const CLOUDY_PERCENT_LIGHT_COLORS: Record<LifeSphere, string> = {
  relationships: "#8E2A30",
  career: "#14538A",
  family: "#256B30",
  friends: "#5A1D78",
  hobbies: "#995307",
};

const CLOUDY_PERCENT_DARK_COLORS: Record<LifeSphere, string> = {
  relationships: "#CF7A82",
  career: "#7BB4E3",
  family: "#83C68E",
  friends: "#BC8AD8",
  hobbies: "#E2A45D",
};

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
  const topRow = sphereRows[0];

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
          paddingTop: 14 * fontScale,
          paddingBottom: 12 * fontScale,
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
        heroHint: {
          opacity: 0.7,
        },
        card: {
          marginTop: 8 * fontScale,
          marginBottom: 24 * fontScale,
          padding: 20 * fontScale,
          borderRadius: 20 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.045)",
        },
        barMeta: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12 * fontScale,
        },
        legendItem: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 10 * fontScale,
          minHeight: 58 * fontScale,
        },
        legendLeft: {
          flexDirection: "row",
          alignItems: "center",
          width: "42%",
          gap: 9 * fontScale,
        },
        legendDot: {
          width: 12 * fontScale,
          height: 12 * fontScale,
          borderRadius: 6 * fontScale,
        },
        legendLabel: {
          flexShrink: 1,
        },
        legendMetrics: {
          flexDirection: "row",
          alignItems: "center",
          width: 112 * fontScale,
          justifyContent: "flex-end",
          gap: 6 * fontScale,
          marginLeft: 8 * fontScale,
        },
        legendCount: {
          opacity: 0.6,
          minWidth: 30 * fontScale,
          textAlign: "right",
        },
        pct: {
          minWidth: 44 * fontScale,
          textAlign: "right",
        },
        rowBarTrack: {
          flex: 1,
          height: 6 * fontScale,
          borderRadius: 999,
          marginHorizontal: 8 * fontScale,
          overflow: "hidden",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.14)"
              : "rgba(0, 0, 0, 0.12)",
        },
        rowBarFill: {
          height: "100%",
          borderRadius: 999,
        },
        stackedBarWrapper: {
          height: 28 * fontScale,
          borderRadius: 999,
          overflow: "hidden",
          flexDirection: "row",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(0, 0, 0, 0.1)",
        },
        stackedBarSegment: {
          height: "100%",
        },
        rowsWrap: {
          marginTop: 14 * fontScale,
          gap: 8 * fontScale,
        },
        emptyWrap: {
          paddingVertical: 48 * fontScale,
          alignItems: "center",
        },
        explanationText: {
          opacity: 0.82,
          lineHeight: 22,
        },
        explanationCard: {
          borderRadius: 14 * fontScale,
          paddingHorizontal: 14 * fontScale,
          paddingVertical: 12 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.035)",
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

  const getRowColor = (sphere: LifeSphere) => getSphereAccentColor(sphere, scheme);
  const getPercentageColor = (sphere: LifeSphere) => {
    if (kind !== "cloudy") {
      return getRowColor(sphere);
    }
    return scheme === "dark"
      ? CLOUDY_PERCENT_DARK_COLORS[sphere]
      : CLOUDY_PERCENT_LIGHT_COLORS[sphere];
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
              <View style={styles.barMeta}>
                <ThemedText size="sm" style={styles.heroHint}>
                  {kind === "sunny"
                    ? t("insights.momentDistribution.subtitleSunny")
                    : kind === "cloudy"
                      ? t("insights.momentDistribution.subtitleCloudy")
                      : t("insights.momentDistribution.subtitleLessons")}
                </ThemedText>
                <ThemedText size="sm" weight="semibold" style={styles.heroHint}>
                  {t("insights.momentDistribution.allSferas")}
                </ThemedText>
              </View>
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
                          backgroundColor: getRowColor(row.sphere),
                          opacity: 1,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <View style={styles.rowsWrap}>
                {sphereRows.map((row) => {
                  const pct =
                    totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                  const sphereColor = getRowColor(row.sphere);
                  const label = t(`spheres.${row.sphere}` as const);
                  return (
                    <TouchableOpacity
                      key={row.sphere}
                      style={styles.legendItem}
                      onPress={() => openSphere(row.sphere)}
                      activeOpacity={0.72}
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
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {label}
                        </ThemedText>
                      </View>
                      <View style={styles.rowBarTrack}>
                        <View
                          style={[
                            styles.rowBarFill,
                            { width: `${Math.max(7, pct)}%`, backgroundColor: sphereColor },
                          ]}
                        />
                      </View>
                      <View style={styles.legendMetrics}>
                        <ThemedText size="xs" style={styles.legendCount}>
                          ({row.count})
                        </ThemedText>
                        <ThemedText
                          size="m"
                          weight="bold"
                          style={[styles.pct, { color: getPercentageColor(row.sphere) }]}
                        >
                          {Math.round(pct)}%
                        </ThemedText>
                        <MaterialIcons
                          name="chevron-right"
                          size={20 * fontScale}
                          color={colors.icon}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>
        {topRow && totalCount > 0 ? (
          <View style={styles.explanationCard}>
            <ThemedText size="sm" style={styles.explanationText}>
              {kind === "sunny"
                ? t("insights.momentDistribution.explainerSunny", {
                    sphere: t(`spheres.${topRow.sphere}` as const),
                  })
                : kind === "cloudy"
                  ? t("insights.momentDistribution.explainerCloudy", {
                      sphere: t(`spheres.${topRow.sphere}` as const),
                    })
                  : t("insights.momentDistribution.explainerLessons", {
                      sphere: t(`spheres.${topRow.sphere}` as const),
                    })}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </TabScreenContainer>
  );
}
