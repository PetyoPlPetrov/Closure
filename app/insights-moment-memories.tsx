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
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

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
          borderRadius: 20 * fontScale,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.045)",
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
          width: "46%",
          gap: 9 * fontScale,
        },
        legendDot: {
          width: 12 * fontScale,
          height: 12 * fontScale,
          borderRadius: 6 * fontScale,
        },
        memoryAvatar: {
          width: 30 * fontScale,
          height: 30 * fontScale,
          borderRadius: 15 * fontScale,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(255, 255, 255, 0.12)"
              : "rgba(0, 0, 0, 0.08)",
        },
        memoryAvatarImage: {
          width: "100%",
          height: "100%",
        },
        legendLabel: {
          flexShrink: 1,
        },
        legendCountBeforeBar: {
          width: 34 * fontScale,
          textAlign: "right",
          opacity: 0.6,
          marginRight: 6 * fontScale,
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
        legendMetrics: {
          flexDirection: "row",
          alignItems: "center",
          width: 72 * fontScale,
          justifyContent: "flex-end",
          gap: 6 * fontScale,
          marginLeft: 8 * fontScale,
        },
        legendCount: {
          opacity: 0.68,
          minWidth: 20 * fontScale,
          textAlign: "right",
        },
        pct: {
          minWidth: 44 * fontScale,
          textAlign: "right",
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
        emptyWrap: {
          paddingVertical: 48 * fontScale,
          alignItems: "center",
        },
        rowsWrap: {
          gap: 8 * fontScale,
          marginTop: 2 * fontScale,
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
              <View style={styles.rowsWrap}>
                {memoryRows.map((row, index) => {
                const pct =
                  totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                const rowColor = ROW_PALETTE[index % ROW_PALETTE.length];
                return (
                  <TouchableOpacity
                    key={row.memory.id}
                    style={styles.legendItem}
                    onPress={() => openMemory(row.memory.id)}
                    activeOpacity={0.72}
                  >
                    <View style={styles.legendLeft}>
                      <View style={styles.memoryAvatar}>
                        {row.memory.imageUri ? (
                          <Image
                            source={{ uri: row.memory.imageUri }}
                            style={styles.memoryAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: rowColor },
                            ]}
                          />
                        )}
                      </View>
                      <ThemedText
                        size="m"
                        weight="semibold"
                        style={styles.legendLabel}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {row.label}
                      </ThemedText>
                    </View>
                    <ThemedText size="xs" style={styles.legendCountBeforeBar}>
                      ({row.count})
                    </ThemedText>
                    <View style={styles.rowBarTrack}>
                      <View
                        style={[
                          styles.rowBarFill,
                          {
                            width: `${Math.max(7, pct)}%`,
                            backgroundColor: rowColor,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.legendMetrics}>
                      <ThemedText
                        size="m"
                        weight="bold"
                        style={[styles.pct, { color: rowColor }]}
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
                          opacity: 1,
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
