import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React from "react";
import { View } from "react-native";
import Svg, {
  Circle as SvgCircle,
  Defs,
  G,
  RadialGradient,
  Stop,
} from "react-native-svg";

import type { LifeSphere } from "@/utils/JourneyProvider";
import {
  getSphere3DGradientColors,
  getSphereIconColor,
  getSphereShadowColor,
} from "@/utils/sphere-styles";

/** Fixed “mostly sunny” so splash matches main hub pastel / chroma without user data */
const SPLASH_SPHERE_SUNNY_PCT = 72;

/** Softer body vs solid hub orbs — rim + icon stay full strength */
const SPLASH_BODY_OPACITY = 0.9;

/**
 * Splash Insights hub: tinted via `SPLASH_INSIGHTS_HUB_*` gradient + alpha so the radial ball stays
 * darker than orbit spheres; orbit chip chrome in app is unchanged.
 */
const SPLASH_INSIGHTS_HUB_FILL_OPACITY = 0.71;

type ColorScheme = "light" | "dark";

/**
 * Splash Insights center orb: violet family of the hub chip, slightly lifted from the heaviest shade
 * so it doesn’t read muddy (app chip chrome unchanged in `FocusedSferaView`).
 */
const SPLASH_INSIGHTS_HUB_SHADOW = "#8F6BA8";

const SPLASH_INSIGHTS_HUB_ICON: Record<ColorScheme, string> = {
  light: "#F0E6F9",
  dark: "#D8C6EC",
};

const SPLASH_INSIGHTS_HUB_BORDER = "rgba(162,126,178,0.58)";

const SPLASH_INSIGHTS_HUB_GRADIENT: Record<
  ColorScheme,
  { base: string; shadow: string }
> = {
  light: {
    base: "#9E75AE",
    shadow: "#6E4F7A",
  },
  dark: {
    base: "#756092",
    shadow: "#523A61",
  },
};

const SPHERE_ICONS: Record<
  LifeSphere,
  React.ComponentProps<typeof MaterialIcons>["name"]
> = {
  relationships: "favorite",
  career: "work",
  family: "family-restroom",
  friends: "people",
  hobbies: "sports-esports",
};

function rimStroke(colorScheme: ColorScheme): string {
  return colorScheme === "light"
    ? "rgba(13, 13, 13, 0.28)"
    : "rgba(255, 255, 255, 0.52)";
}

export const SplashOrbitOrb = React.memo(function SplashOrbitOrb({
  sphere,
  size,
  colorScheme,
  iconSize,
}: {
  sphere: LifeSphere;
  size: number;
  colorScheme: ColorScheme;
  iconSize: number;
}) {
  const gradient3D = getSphere3DGradientColors(
    sphere,
    SPLASH_SPHERE_SUNNY_PCT,
    colorScheme,
  );
  const iconColor = getSphereIconColor(
    sphere,
    colorScheme,
    SPLASH_SPHERE_SUNNY_PCT,
  );
  const shadowColor = getSphereShadowColor(sphere, colorScheme);
  const uid = `splash-orbit-${sphere}-${colorScheme}`;
  const r = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        justifyContent: "center",
        alignItems: "center",
        overflow: "visible",
        shadowColor,
        shadowOffset: { width: 0, height: colorScheme === "dark" ? 3 : 2 },
        shadowOpacity: colorScheme === "dark" ? 0.5 : 0.28,
        shadowRadius: colorScheme === "dark" ? 10 : 7,
        elevation: 8,
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute" }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id={uid}
            cx="50"
            cy="50"
            r="50"
            fx="32"
            fy="32"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={gradient3D.highlight} stopOpacity="1" />
            <Stop offset="38%" stopColor={gradient3D.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradient3D.shadow} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <G opacity={SPLASH_BODY_OPACITY}>
          <SvgCircle cx="50" cy="50" r="50" fill={`url(#${uid})`} />
        </G>
        <SvgCircle
          cx="50"
          cy="50"
          r="48.4"
          fill="none"
          stroke={rimStroke(colorScheme)}
          strokeWidth="2.35"
        />
      </Svg>
      <MaterialIcons
        name={SPHERE_ICONS[sphere]}
        size={iconSize}
        color={iconColor}
        style={{ zIndex: 1 }}
      />
    </View>
  );
});

/** Center hub = Sfera Insights entry (purple), not theme primary — matches orbit overview center control */
export const SplashHubOrb = React.memo(function SplashHubOrb({
  size,
  colorScheme,
  iconSize,
}: {
  size: number;
  colorScheme: ColorScheme;
  iconSize: number;
}) {
  const uid = `splash-hub-${colorScheme}`;
  const r = size / 2;
  const g = SPLASH_INSIGHTS_HUB_GRADIENT[colorScheme];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        justifyContent: "center",
        alignItems: "center",
        overflow: "visible",
        shadowColor: SPLASH_INSIGHTS_HUB_SHADOW,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
      }}
    >
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{ position: "absolute" }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id={uid}
            cx="50"
            cy="50"
            r="50"
            fx="50"
            fy="50"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0%" stopColor={g.base} stopOpacity="1" />
            <Stop offset="55%" stopColor={g.base} stopOpacity="1" />
            <Stop offset="100%" stopColor={g.shadow} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <G opacity={SPLASH_INSIGHTS_HUB_FILL_OPACITY}>
          <SvgCircle cx="50" cy="50" r="50" fill={`url(#${uid})`} />
        </G>
        <SvgCircle
          cx="50"
          cy="50"
          r="48.4"
          fill="none"
          stroke={SPLASH_INSIGHTS_HUB_BORDER}
          strokeWidth="2.35"
        />
      </Svg>
      <MaterialIcons
        name="insights"
        size={iconSize}
        color={SPLASH_INSIGHTS_HUB_ICON[colorScheme]}
        style={{ zIndex: 1 }}
      />
    </View>
  );
});
