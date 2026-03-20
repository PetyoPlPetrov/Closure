import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLargeDevice } from "@/hooks/use-large-device";
import { ActionSheet } from "@/library/components/action-sheet";
import { ConfirmationModal } from "@/library/components/confirmation-modal";
import { MemoryCard } from "@/library/components/memory-card";
import { TabScreenContainer } from "@/library/components/tab-screen-container";
import { useJourney, type LifeSphere } from "@/utils/JourneyProvider";
import { useMomentNotifications } from "@/utils/MomentNotificationProvider";
import { useTranslate } from "@/utils/languages/use-translate";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function IdealizedMemoriesScreen() {
  console.log('[idealized-memories.tsx] 📝 MEMORIES LIST SCREEN RENDERED');
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { maxContentWidth } = useLargeDevice();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  console.log('[idealized-memories.tsx] Params:', params);
  const { getIdealizedMemoriesByProfileId, getIdealizedMemoriesByEntityId, deleteIdealizedMemory } = useJourney();
  const { deleteSummariesByMemoryId } = useMomentNotifications();
  const t = useTranslate();
  
  // Support both old (profileId) and new (entityId + sphere) parameters
  const profileId = params.profileId as string | undefined;
  const entityId = params.entityId as string | undefined;
  const sphere = params.sphere as LifeSphere | undefined;
  
  // Determine which mode we're in: new (entityId + sphere) or old (profileId)
  const isNewMode = !!(entityId && sphere);
  
  // Get memories - use new API if entityId and sphere are provided, otherwise use profileId
  const memories = isNewMode
    ? getIdealizedMemoriesByEntityId(entityId!, sphere!)
    : profileId
    ? getIdealizedMemoriesByProfileId(profileId)
    : [];
  const hasMemories = memories.length > 0;

  const [selectedMemory, setSelectedMemory] = useState<typeof memories[0] | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 50,
          paddingTop: 20,
          marginBottom: 10,
          paddingHorizontal: Math.max(16, Math.min(20, SCREEN_WIDTH * 0.05)), // Responsive padding: 5% of screen width, min 16px, max 20px
          minHeight: 48,
          width: '100%',
        },
        headerButton: {
          minWidth: 44,
          minHeight: 44,
          justifyContent: "center",
          alignItems: "center",
          flexShrink: 0,
        },
        headerTitle: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 8,
          minWidth: 0, // Allow flex item to shrink below content size
        },
        centerContent: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          width: "100%",
        },
        centerContentWrapper: {
          ...(typeof maxContentWidth === 'number' ? { maxWidth: maxContentWidth } : {}),
          width: "100%",
          alignItems: "center",
        },
        iconCircle: {
          width: 80,
          height: 80,
          borderRadius: 40,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 22,
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(14, 165, 233, 0.5)"
              : "rgba(125, 211, 252, 0.3)",
        },
        title: {
          fontSize: 20,
          marginBottom: 10,
        },
        description: {
          opacity: 0.8,
          textAlign: "center",
          fontSize: 14,
          lineHeight: 20,
        },
        fab: {
          position: "absolute",
          bottom: 26,
          right: 26,
          width: 62,
          height: 62,
          borderRadius: 31,
          justifyContent: "center",
          alignItems: "center",
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
        },
        listContent: {
          padding: 16,
          paddingBottom: 100,
          alignItems: "center",
        },
        listContentWrapper: {
          ...(typeof maxContentWidth === 'number' ? { maxWidth: maxContentWidth } : {}),
          width: "100%",
          alignSelf: "center",
        },
        memoryCardSpacing: {
          marginBottom: 16, // Add gap between memory cards
        },
      }),
    [colorScheme, colors.background, maxContentWidth]
  );

  const handleAddMemory = () => {
    console.log('[idealized-memories.tsx] ➕ NAVIGATING to add-idealized-memory (new memory)');
    if (isNewMode && entityId && sphere) {
      // New signature: use entityId and sphere
      console.log('[idealized-memories.tsx] Using entityId:', entityId, 'sphere:', sphere);
      router.push({
        pathname: "/add-idealized-memory",
        params: { entityId, sphere },
      });
    } else if (profileId) {
      // Old signature: use profileId for backward compatibility
      console.log('[idealized-memories.tsx] Using profileId:', profileId);
      router.push({
        pathname: "/add-idealized-memory",
        params: { profileId },
      });
    } else {
      console.log('[idealized-memories.tsx] No params');
      router.push("/add-idealized-memory");
    }
  };

  const handleMemoryPress = (memoryId: string) => {
    console.log('[idealized-memories.tsx] 👆 NAVIGATING to add-idealized-memory (edit memory)');
    console.log('[idealized-memories.tsx] memoryId:', memoryId);
    if (isNewMode && entityId && sphere) {
      console.log('[idealized-memories.tsx] Using entityId:', entityId, 'sphere:', sphere);
      router.push({
        pathname: "/add-idealized-memory",
        params: { entityId, sphere, memoryId, viewOnly: 'true' },
      });
    } else if (profileId) {
      console.log('[idealized-memories.tsx] Using profileId:', profileId);
      router.push({
        pathname: "/add-idealized-memory",
        params: { profileId, memoryId },
      });
    }
  };

  const handleMorePress = (memory: typeof memories[0]) => {
    setSelectedMemory(memory);
    setActionSheetVisible(true);
  };

  const handleEditMemory = () => {
    if (selectedMemory) {
      setActionSheetVisible(false);
      if (isNewMode && entityId && sphere) {
        router.push({
          pathname: "/add-idealized-memory",
          params: { entityId, sphere, memoryId: selectedMemory.id },
        });
      } else if (profileId) {
        router.push({
          pathname: "/add-idealized-memory",
          params: { profileId, memoryId: selectedMemory.id },
        });
      }
      setSelectedMemory(null);
    }
  };

  const handleDeletePress = () => {
    setActionSheetVisible(false);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedMemory) {
      try {
        await deleteSummariesByMemoryId(selectedMemory.id);
        await deleteIdealizedMemory(selectedMemory.id);
        setDeleteConfirmVisible(false);
        setSelectedMemory(null);
      } catch (error) {
        alert(t('memory.error.deleteFailed'));
        setDeleteConfirmVisible(false);
        setSelectedMemory(null);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmVisible(false);
    setSelectedMemory(null);
  };

  return (
    <TabScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          console.log('[idealized-memories.tsx] 🔙 BACK ARROW PRESSED');
          const returnTo = params.returnTo as string | undefined;
          const returnToId = params.returnToId as string | undefined;

          // Navigate back to spheres tab with the appropriate sphere selected
          // This ensures the tab bar shows the correct active tab
          if (returnTo && sphere) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to spheres with sphere:', sphere);
            router.navigate({
              pathname: '/(tabs)/spheres',
              params: { selectedSphere: sphere }
            });
          } else if (sphere) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to spheres with sphere:', sphere);
            router.navigate({
              pathname: '/(tabs)/spheres',
              params: { selectedSphere: sphere }
            });
          } else if (returnTo === 'edit-family-member' && returnToId) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to edit-family-member');
            router.navigate({
              pathname: '/edit-family-member',
              params: { memberId: returnToId }
            });
          } else if (returnTo === 'edit-job' && returnToId) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to edit-job');
            router.navigate({
              pathname: '/edit-job',
              params: { jobId: returnToId }
            });
          } else if (returnTo === 'edit-friend' && returnToId) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to edit-friend');
            router.navigate({
              pathname: '/edit-friend',
              params: { friendId: returnToId }
            });
          } else if (returnTo === 'edit-hobby' && returnToId) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to edit-hobby');
            router.navigate({
              pathname: '/edit-hobby',
              params: { hobbyId: returnToId }
            });
          } else if (returnTo === 'edit-profile' && returnToId) {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to edit-profile');
            router.navigate({
              pathname: '/edit-profile',
              params: { profileId: returnToId }
            });
          } else {
            console.log('[idealized-memories.tsx] 🔙 NAVIGATING back to home');
            router.navigate('/(tabs)/');
          }
        }} style={styles.headerButton} hitSlop={12}>
          <MaterialIcons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitle}>
          <ThemedText size="l" weight="bold" numberOfLines={1} style={{ textAlign: "center" }}>
            {t('memory.title')}
          </ThemedText>
        </View>

        <View style={styles.headerButton} />
      </View>

      {hasMemories ? (
        <>
          {/* Memory List */}
          <ScrollView
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.listContentWrapper}>
              {memories.map((memory, index) => (
                <View key={memory.id} style={index < memories.length - 1 ? styles.memoryCardSpacing : undefined}>
                  <MemoryCard
                    memory={memory}
                    onPress={() => handleMorePress(memory)}
                    onMorePress={() => handleMorePress(memory)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Floating + button */}
          <TouchableOpacity
            onPress={handleAddMemory}
            style={[styles.fab, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Empty State */}
          <View style={styles.centerContent}>
            <View style={styles.centerContentWrapper}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="psychology" size={42} color={colors.primary} />
              </View>

              <ThemedText size="sm" weight="bold" style={styles.title}>
                {t('memory.emptyState.title')}
              </ThemedText>

              <ThemedText style={styles.description}>
                {t('memory.emptyState.description')}
              </ThemedText>
            </View>
          </View>

          {/* Floating + button */}
          <TouchableOpacity
            onPress={handleAddMemory}
            style={[styles.fab, { backgroundColor: colors.primary }]}
          >
            <MaterialIcons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* Action Sheet */}
      <ActionSheet
        visible={actionSheetVisible}
        title={selectedMemory ? selectedMemory.title : ""}
        options={[
          {
            label: t('memory.actionSheet.edit'),
            icon: "edit",
            onPress: handleEditMemory,
          },
          {
            label: t('memory.actionSheet.delete'),
            icon: "delete",
            onPress: handleDeletePress,
            destructive: true,
          },
        ]}
        onCancel={() => {
          setActionSheetVisible(false);
          setSelectedMemory(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={deleteConfirmVisible && !!selectedMemory}
        title={t('memory.delete.confirm')}
        message={
          selectedMemory
            ? t('memory.delete.confirm.message.withTitle').replace('{title}', selectedMemory.title)
            : ""
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={handleDeleteConfirm}
        onCancel={handleCancelDelete}
        destructive
      />
      </View>
    </TabScreenContainer>
  );
}
