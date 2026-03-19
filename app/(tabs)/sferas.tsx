/**
 * Sferas tab — shows the main home/entity view.
 * Edit icon in top-left opens the orbital sphere selector overlay.
 */

import { SpheresScreen, SpheresScreenHandle } from "@/app/(tabs)/spheres";
import { HomeScreen } from "@/app/(tabs)/index";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useIconScale } from "@/hooks/use-device-size";
import { emitHomeTabPress } from "@/utils/home-tab-press";
import { onAIModalOpen } from "@/utils/ai-open-modal";
import { onSpheresTabPress } from "@/utils/spheres-tab-press";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NAV_LOG = "[SferasNav]";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SferasScreen() {
  const [editMode, setEditMode] = useState(false);
  const [subViewOpen, setSubViewOpen] = useState(false);
  const spheresRef = useRef<SpheresScreenHandle>(null);
  const [editSubViewOpen, setEditSubViewOpen] = useState(false);
  const editModeRef = useRef(editMode);
  const subViewOpenRef = useRef(subViewOpen);
  editModeRef.current = editMode;
  subViewOpenRef.current = subViewOpen;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  const insets = useSafeAreaInsets();
  const iconScale = useIconScale();
  const segments = useSegments();

  const editButtonScale = useSharedValue(1);
  const backButtonScale = useSharedValue(1);

  const editButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: editButtonScale.value }],
  }));
  const backButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  const pulse = (scale: Animated.SharedValue<number>) => {
    scale.value = withSequence(
      withTiming(1.4, { duration: 120, easing: Easing.out(Easing.ease) }),
      withTiming(0.85, { duration: 100, easing: Easing.in(Easing.ease) }),
      withTiming(1, { duration: 120, easing: Easing.out(Easing.ease) }),
    );
  };

  useEffect(() => {
    console.log(NAV_LOG, "subViewOpen changed", {
      subViewOpen,
      editMode,
      segments: segments?.slice?.(),
    });
  }, [subViewOpen, editMode, segments]);

  useEffect(() => {
    return onAIModalOpen(() => {
      spheresRef.current?.openAIModal();
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log(NAV_LOG, "Sferas tab focused — registering tab-press listener", {
        editMode: editModeRef.current,
        subViewOpen: subViewOpenRef.current,
        segments: segments?.slice?.(),
      });
      const unsubscribe = onSpheresTabPress(() => {
        const inEditMode = editModeRef.current;
        const subOpen = subViewOpenRef.current;
        console.log(NAV_LOG, "Sferas tab pressed (while already on Sferas)", {
          editMode: inEditMode,
          subViewOpen: subOpen,
          willEmitHomeTabPress: !inEditMode && subOpen,
        });
        if (!inEditMode && subOpen) {
          emitHomeTabPress();
        }
      });
      return () => {
        console.log(NAV_LOG, "Sferas tab blurred — unregistering tab-press listener");
        unsubscribe();
      };
    }, []),
  );

  console.log(NAV_LOG, "render", { editMode, subViewOpen, segments: segments?.slice?.() });

  return (
    <View style={styles.container}>
      {/* SpheresScreen is always mounted so its modals (AI etc.) can open from any tab */}
      <View style={editMode ? styles.container : styles.hidden}>
        <SpheresScreen
          ref={spheresRef}
          embedded
          onSubViewOpen={setEditSubViewOpen}
        />
        {editMode && !editSubViewOpen && (
          <AnimatedPressable
            onPress={() => {
              pulse(backButtonScale);
              console.log(NAV_LOG, "Back button pressed → switching to main view", { subViewOpen, segments: segments?.slice?.() });
              setEditMode(false);
            }}
            style={[styles.backButton, { top: insets.top + 12 }, backButtonStyle]}
            accessibilityRole="button"
            accessibilityLabel="Return to view mode"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="visibility"
              size={Math.round(24 * iconScale)}
              color={colors.primaryLight ?? "#64B5F6"}
            />
          </AnimatedPressable>
        )}
      </View>
      {!editMode && (
        <>
          <HomeScreen
            onSubViewOpen={(isOpen) => {
              console.log(NAV_LOG, "HomeScreen onSubViewOpen", { isOpen, editMode, segments: segments?.slice?.() });
              setSubViewOpen(isOpen);
            }}
            onAddMemoriesPress={() => {
              console.log(NAV_LOG, "Add memories pressed → switching to edit view");
              setEditMode(true);
            }}
            embedded
          />
          {!subViewOpen && (
            <AnimatedPressable
              onPress={() => {
                pulse(editButtonScale);
                console.log(NAV_LOG, "Edit button pressed → switching to edit view", { subViewOpen, segments: segments?.slice?.() });
                setEditMode(true);
              }}
              style={[styles.editButton, { top: insets.top + 12 }, editButtonStyle]}
              accessibilityRole="button"
              accessibilityLabel="Edit spheres"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name="edit"
                size={Math.round(24 * iconScale)}
                color={colors.primaryLight ?? "#64B5F6"}
              />
            </AnimatedPressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  editButton: {
    position: "absolute",
    left: 16,
    zIndex: 1001,
    padding: 8,
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 1002,
    elevation: 10,
    padding: 8,
  },
});
