import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLargeDevice } from "@/hooks/use-large-device";
import { ActionSheet } from "@/library/components/action-sheet";
import { ConfirmationModal } from "@/library/components/confirmation-modal";
import { MemoryCard } from "@/library/components/memory-card";
import { useJourney } from "@/utils/JourneyProvider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

export default function IdealizedMemoriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const { maxContentWidth } = useLargeDevice();
  const params = useLocalSearchParams();
  const { getIdealizedMemoriesByProfileId, deleteIdealizedMemory } = useJourney();
  
  const profileId = params.profileId as string | undefined;
  const memories = profileId ? getIdealizedMemoriesByProfileId(profileId) : [];
  const hasMemories = memories.length > 0;

  const [selectedMemory, setSelectedMemory] = useState<typeof memories[0] | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 50,
          marginBottom: 10,
          paddingHorizontal: 20,
        },
        headerButton: {
          width: 48,
          height: 48,
          justifyContent: "center",
          alignItems: "center",
        },
        headerTitle: {
          flex: 1,
          textAlign: "center",
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
          gap: 16,
          alignItems: "center",
        },
        listContentWrapper: {
          ...(typeof maxContentWidth === 'number' ? { maxWidth: maxContentWidth } : {}),
          width: "100%",
          alignSelf: "center",
        },
      }),
    [colorScheme, colors.background, maxContentWidth]
  );

  const handleAddMemory = () => {
    if (profileId) {
      router.push({
        pathname: "/add-idealized-memory",
        params: { profileId },
      });
    } else {
      router.push("/add-idealized-memory");
    }
  };

  const handleMemoryPress = (memoryId: string) => {
    if (profileId) {
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
    if (selectedMemory && profileId) {
      setActionSheetVisible(false);
      router.push({
        pathname: "/add-idealized-memory",
        params: { profileId, memoryId: selectedMemory.id },
      });
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
        await deleteIdealizedMemory(selectedMemory.id);
        setDeleteConfirmVisible(false);
        setSelectedMemory(null);
      } catch (error) {
        console.error("Error deleting memory:", error);
        alert("Failed to delete memory. Please try again.");
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
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <ThemedText size="l" weight="bold" style={styles.headerTitle}>
          Memory
        </ThemedText>

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
              {memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onPress={() => handleMemoryPress(memory.id)}
                  onMorePress={() => handleMorePress(memory)}
                />
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
                No Idealized Memories Yet
              </ThemedText>

              <ThemedText style={styles.description}>
                This is the first step to gaining clarity. Listing your idealized
                memories helps you counter them with reality, turning rumination
                into action.
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
            label: "Edit",
            icon: "edit",
            onPress: handleEditMemory,
          },
          {
            label: "Delete",
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
        title="Delete Memory"
        message={
          selectedMemory
            ? `Are you sure you want to delete "${selectedMemory.title}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={handleCancelDelete}
        destructive
      />
    </View>
  );
}
