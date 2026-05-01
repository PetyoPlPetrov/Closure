import type { Translations } from "@/utils/languages/translations";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type GuideBullet = {
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  descriptionKey: keyof Translations;
  /** Where to tap in the app to reach this feature (shown under the title). */
  menuPathKey: keyof Translations;
  hideMedia?: boolean;
  imageSource?: ReturnType<typeof require>;
  imageAlignment?: "top" | "center" | "bottom";
  imageOffsetY?: number;
  imageScale?: number; // 0-1, uses contain with scaled dimensions
  videoSource?: ReturnType<typeof require>;
};

export type GuideSection = {
  id:
    | "overview"
    | "recordingMemories"
    | "tools"
    | "notifications"
    | "customizations"
    | "account";
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  descriptionKey: keyof Translations;
  gifSource: string;
  bullets: GuideBullet[];
  /** Embedded how-to player at the top of this guide section (e.g. Missions, Recording Memories). */
  introYoutubeUrl?: string;
};

export const SECTIONS: GuideSection[] = [
  {
    id: "overview",
    icon: "explore",
    titleKey: "guide.section.overview.title",
    descriptionKey: "guide.section.overview.description",
    gifSource: "welcome",
    introYoutubeUrl: "https://www.youtube.com/shorts/ljj-C41fnGE",
    bullets: [],
  },
  {
    id: "recordingMemories",
    icon: "note-add",
    titleKey: "guide.section.recordingMemories.title",
    descriptionKey: "guide.section.recordingMemories.description",
    gifSource: "memories",
    introYoutubeUrl: "https://www.youtube.com/shorts/hbnzgDlFpzM",
    bullets: [],
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
        menuPathKey: "guide.bullet.universeLessons.menuPath",
        imageSource: require("@/assets/images/Universe.gif"),
      },
      {
        icon: "assignment",
        titleKey: "guide.bullet.dailyExam.title",
        descriptionKey: "guide.bullet.dailyExam.description",
        menuPathKey: "guide.bullet.dailyExam.menuPath",
        imageSource: require("@/assets/images/Exam.gif"),
      },
      {
        icon: "donut-large",
        titleKey: "guide.bullet.insightsWheel.title",
        descriptionKey: "guide.bullet.insightsWheel.description",
        menuPathKey: "guide.bullet.insightsWheel.menuPath",
        imageSource: require("@/assets/images/insights.gif"),
      },
      {
        icon: "pie-chart",
        titleKey: "guide.bullet.sferasBalance.title",
        descriptionKey: "guide.bullet.sferasBalance.description",
        menuPathKey: "guide.bullet.sferasBalance.menuPath",
        videoSource: require("@/assets/videos/guide-balance.mp4"),
      },
      {
        icon: "rotate-right",
        titleKey: "guide.bullet.entityWheel.title",
        descriptionKey: "guide.bullet.entityWheel.description",
        menuPathKey: "guide.bullet.entityWheel.menuPath",
        imageSource: require("@/assets/images/EntityWheelOfLife.gif"),
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
        menuPathKey: "guide.bullet.entityReminders.menuPath",
        imageSource: require("@/EntityReminder.png"),
      },
      {
        icon: "touch-app",
        titleKey: "guide.bullet.momentNudges.title",
        descriptionKey: "guide.bullet.momentNudges.description",
        menuPathKey: "guide.bullet.momentNudges.menuPath",
      },
      {
        icon: "event",
        titleKey: "guide.bullet.eventReminders.title",
        descriptionKey: "guide.bullet.eventReminders.description",
        menuPathKey: "guide.bullet.eventReminders.menuPath",
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
        menuPathKey: "guide.bullet.cosmicLook.menuPath",
      },
      {
        icon: "color-lens",
        titleKey: "guide.bullet.momentColors.title",
        descriptionKey: "guide.bullet.momentColors.description",
        menuPathKey: "guide.bullet.momentColors.menuPath",
      },
      {
        icon: "animation",
        titleKey: "guide.bullet.animationSettings.title",
        descriptionKey: "guide.bullet.animationSettings.description",
        menuPathKey: "guide.bullet.animationSettings.menuPath",
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
        menuPathKey: "guide.bullet.manualEdit.menuPath",
      },
      {
        icon: "backup",
        titleKey: "guide.bullet.backupRestore.title",
        descriptionKey: "guide.bullet.backupRestore.description",
        menuPathKey: "guide.bullet.backupRestore.menuPath",
      },
    ],
  },
];
