import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import type { BaseEntity, IdealizedMemory } from "@/utils/JourneyProvider";
import { useJourney } from "@/utils/JourneyProvider";
import {
  countMetricInMemory,
  getMemoriesForEntityInsight,
  parseLifeSphereParam,
  parseMomentInsightKind,
} from "@/utils/insights-moment-kind";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const ROW_PALETTE = [
  "#64B5F6",
  "#42A5F5",
  "#2196F3",
  "#81C784",
  "#66BB6A",
  "#FFB74D",
  "#FFA726",
  "#BA68C8",
  "#9575CD",
  "#4DD0E1",
  "#26A69A",
  "#FF8A65",
];

export default function InsightsMomentMemoriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const params = useLocalSearchParams<{
    type?: string;
    sphere?: string;
    entityId?: string;
  }>();
  const kind = parseMomentInsightKind(
    typeof params.type === "string" ? params.type : undefined,
  );
  const sphere = parseLifeSphereParam(
    typeof params.sphere === "string" ? params.sphere : undefined,
  );
  const entityId =
    typeof params.entityId === "string" ? params.entityId : undefined;

  const {
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  } = useJourney();

  useEffect(() => {
    if (kind === null || sphere === null || !entityId) {
      router.back();
    }
  }, [kind, sphere, entityId]);

  const entityName = useMemo(() => {
    if (!sphere || !entityId) return "";
    const entities = getEntitiesBySphere(sphere) as BaseEntity[];
    const entity = entities.find((e) => e.id === entityId);
    const raw = entity?.name?.trim();
    return raw || t("insights.momentDrill.unnamedEntity");
  }, [sphere, entityId, getEntitiesBySphere, t]);

  const memoryRows = useMemo(() => {
    if (!kind || !sphere || !entityId) return [];
    const memories = getMemoriesForEntityInsight(
      sphere,
      entityId,
      getIdealizedMemoriesByProfileId,
      getIdealizedMemoriesByEntityId,
    );
    const rows: { memory: IdealizedMemory; count: number; label: string }[] =
      [];
    for (const memory of memories) {
      const count = countMetricInMemory(memory, kind);
      if (count > 0) {
        const title = memory.title?.trim();
        rows.push({
          memory,
          count,
          label:
            title ||
            t("insights.momentDrill.memoryUntitled"),
        });
      }
    }
    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [
    kind,
    sphere,
    entityId,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
    t,
  ]);

  const totalCount = useMemo(
    () => memoryRows.reduce((s, r) => s + r.count, 0),
    [memoryRows],
  );

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

  if (kind === null || sphere === null || !entityId) {
    return null;
  }

  const headerTitle = entityName;

  const openMemory = (memoryId: string) => {
    router.push({
      pathname: "/(tabs)",
      params: {
        entityId,
        sphere,
        focusedMemoryId: memoryId,
        insightsReturnPath: "/insights-moment-memories",
        insightsReturnType: kind,
        insightsReturnSphere: sphere,
        insightsReturnEntityId: entityId,
        insightsReturnNonce: `${Date.now()}`,
      },
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
          size="l"
          weight="bold"
          letterSpacing="s"
          style={styles.headerTitle}
          numberOfLines={2}
        >
          {headerTitle}
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
              {memoryRows.map((row, index) => {
                const pct =
                  totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                const rowColor = ROW_PALETTE[index % ROW_PALETTE.length];
                return (
                  <TouchableOpacity
                    key={row.memory.id}
                    style={styles.legendItem}
                    onPress={() => openMemory(row.memory.id)}
                    activeOpacity={0.65}
                  >
                    <View style={styles.legendLeft}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: rowColor },
                        ]}
                      />
                      <ThemedText
                        size="m"
                        weight="semibold"
                        style={styles.legendLabel}
                        numberOfLines={2}
                      >
                        {row.label} ({row.count})
                      </ThemedText>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <ThemedText
                        size="m"
                        weight="bold"
                        style={[styles.pct, { color: rowColor }]}
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
                {memoryRows.map((row, i) => {
                  const pct =
                    totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                  const rowColor = ROW_PALETTE[i % ROW_PALETTE.length];
                  const w =
                    i === memoryRows.length - 1
                      ? Math.max(
                          0,
                          100 -
                            memoryRows
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
                      key={`bar-${row.memory.id}`}
                      style={[
                        styles.stackedBarSegment,
                        {
                          width: `${w}%`,
                          backgroundColor: rowColor,
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
