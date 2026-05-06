import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFontScale } from "@/hooks/use-device-size";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import type { BaseEntity } from "@/utils/JourneyProvider";
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

export default function InsightsMomentSphereScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const fontScale = useFontScale();
  const t = useTranslate();
  const params = useLocalSearchParams<{ type?: string; sphere?: string }>();
  const kind = parseMomentInsightKind(
    typeof params.type === "string" ? params.type : undefined,
  );
  const sphere = parseLifeSphereParam(
    typeof params.sphere === "string" ? params.sphere : undefined,
  );

  const {
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
  } = useJourney();

  useEffect(() => {
    if (kind === null || sphere === null) {
      router.back();
    }
  }, [kind, sphere]);

  const entityRows = useMemo(() => {
    if (!kind || !sphere) return [];
    const entities = getEntitiesBySphere(sphere) as BaseEntity[];
    const rows: { entity: BaseEntity; count: number; name: string }[] = [];

    for (const entity of entities) {
      const memories = getMemoriesForEntityInsight(
        sphere,
        entity.id,
        getIdealizedMemoriesByProfileId,
        getIdealizedMemoriesByEntityId,
      );
      let count = 0;
      for (const memory of memories) {
        count += countMetricInMemory(memory, kind);
      }
      if (count > 0) {
        rows.push({
          entity,
          count,
          name: (entity.name || "").trim() || t("insights.momentDrill.unnamedEntity"),
        });
      }
    }

    rows.sort((a, b) => b.count - a.count);
    return rows;
  }, [
    kind,
    sphere,
    getEntitiesBySphere,
    getIdealizedMemoriesByProfileId,
    getIdealizedMemoriesByEntityId,
    t,
  ]);

  const totalCount = useMemo(
    () => entityRows.reduce((s, r) => s + r.count, 0),
    [entityRows],
  );

  const sphereLabel = (() => {
    if (sphere === null) return "";
    switch (sphere) {
      case "relationships":
        return t("spheres.relationships");
      case "career":
        return t("spheres.career");
      case "family":
        return t("spheres.family");
      case "friends":
        return t("spheres.friends");
      case "hobbies":
        return t("spheres.hobbies");
    }
  })();

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
        emptyWrap: {
          paddingVertical: 48 * fontScale,
          alignItems: "center",
        },
      }),
    [fontScale, colorScheme],
  );

  if (kind === null || sphere === null) {
    return null;
  }

  const headerTitle = sphereLabel;

  const openEntity = (entityId: string) => {
    router.push({
      pathname: "/insights-moment-memories",
      params: { type: kind, sphere, entityId },
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
              {entityRows.map((row, index) => {
                const pct =
                  totalCount > 0 ? (row.count / totalCount) * 100 : 0;
                const rowColor = ROW_PALETTE[index % ROW_PALETTE.length];
                return (
                  <TouchableOpacity
                    key={row.entity.id}
                    style={styles.legendItem}
                    onPress={() => openEntity(row.entity.id)}
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
                      >
                        {row.name} ({row.count})
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

            </>
          )}
        </View>
      </ScrollView>
    </TabScreenContainer>
  );
}
