import type { Translations } from "@/utils/languages/translations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type GuideBullet = {
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  descriptionKey: keyof Translations;
};

export type GuideSection = {
  id: "overview" | "tools" | "notifications" | "customizations" | "account";
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  descriptionKey: keyof Translations;
  gifSource: string;
  bullets: GuideBullet[];
};

export const SECTIONS: GuideSection[] = [
  {
    id: "overview",
    icon: "explore",
    titleKey: "guide.section.overview.title",
    descriptionKey: "guide.section.overview.description",
    gifSource: "welcome",
    bullets: [
      {
        icon: "school",
        titleKey: "guide.bullet.pastLessons.title",
        descriptionKey: "guide.bullet.pastLessons.description",
      },
      {
        icon: "wb-sunny",
        titleKey: "guide.bullet.sunnyMoments.title",
        descriptionKey: "guide.bullet.sunnyMoments.description",
      },
      {
        icon: "trending-up",
        titleKey: "guide.bullet.livingForward.title",
        descriptionKey: "guide.bullet.livingForward.description",
      },
    ],
  },
  {
    id: "tools",
    icon: "build",
    titleKey: "guide.section.tools.title",
    descriptionKey: "guide.section.tools.description",
    gifSource: "wheel",
    bullets: [
      {
        icon: "public",
        titleKey: "guide.bullet.universeLessons.title",
        descriptionKey: "guide.bullet.universeLessons.description",
      },
      {
        icon: "assignment",
        titleKey: "guide.bullet.dailyExam.title",
        descriptionKey: "guide.bullet.dailyExam.description",
      },
      {
        icon: "donut-large",
        titleKey: "guide.bullet.insightsWheel.title",
        descriptionKey: "guide.bullet.insightsWheel.description",
      },
      {
        icon: "rotate-right",
        titleKey: "guide.bullet.entityWheel.title",
        descriptionKey: "guide.bullet.entityWheel.description",
      },
    ],
  },
  {
    id: "notifications",
    icon: "notifications",
    titleKey: "guide.section.notifications.title",
    descriptionKey: "guide.section.notifications.description",
    gifSource: "notifications",
    bullets: [
      {
        icon: "alarm",
        titleKey: "guide.bullet.entityReminders.title",
        descriptionKey: "guide.bullet.entityReminders.description",
      },
      {
        icon: "touch-app",
        titleKey: "guide.bullet.momentNudges.title",
        descriptionKey: "guide.bullet.momentNudges.description",
      },
      {
        icon: "event",
        titleKey: "guide.bullet.eventReminders.title",
        descriptionKey: "guide.bullet.eventReminders.description",
      },
    ],
  },
  {
    id: "customizations",
    icon: "palette",
    titleKey: "guide.section.customizations.title",
    descriptionKey: "guide.section.customizations.description",
    gifSource: "momentsColors",
    bullets: [
      {
        icon: "auto-awesome",
        titleKey: "guide.bullet.cosmicLook.title",
        descriptionKey: "guide.bullet.cosmicLook.description",
      },
      {
        icon: "color-lens",
        titleKey: "guide.bullet.momentColors.title",
        descriptionKey: "guide.bullet.momentColors.description",
      },
      {
        icon: "animation",
        titleKey: "guide.bullet.animationSettings.title",
        descriptionKey: "guide.bullet.animationSettings.description",
      },
    ],
  },
  {
    id: "account",
    icon: "manage-accounts",
    titleKey: "guide.section.account.title",
    descriptionKey: "guide.section.account.description",
    gifSource: "recap",
    bullets: [
      {
        icon: "edit",
        titleKey: "guide.bullet.manualEdit.title",
        descriptionKey: "guide.bullet.manualEdit.description",
      },
      {
        icon: "backup",
        titleKey: "guide.bullet.backupRestore.title",
        descriptionKey: "guide.bullet.backupRestore.description",
      },
    ],
  },
];
