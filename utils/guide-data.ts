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
    | "customizations";
  icon: keyof typeof MaterialIcons.glyphMap;
  titleKey: keyof Translations;
  descriptionKey: keyof Translations;
  /** Legacy field kept for typing; guide UI is video-first. */
  gifSource: string;
  bullets: GuideBullet[];
  /**
   * Embedded walkthrough at the top (`youtube.com/watch`, `/shorts/…`, `youtu.be/…`).
   * Omit until the clip is published; the app shows a “coming soon” slot instead.
   */
  introYoutubeUrl?: string;
};

/** When a clip is ready, set `introYoutubeUrl` on that row (watch URL, Short, or youtu.be). */

export const SECTIONS: GuideSection[] = [
  {
    id: "overview",
    icon: "explore",
    titleKey: "guide.section.overview.title",
    descriptionKey: "guide.section.overview.description",
    gifSource: "welcome",
    introYoutubeUrl: "https://youtube.com/shorts/GGzuCQF6f7Y",
    bullets: [],
  },
  {
    id: "recordingMemories",
    icon: "note-add",
    titleKey: "guide.section.recordingMemories.title",
    descriptionKey: "guide.section.recordingMemories.description",
    gifSource: "memories",
    introYoutubeUrl: "https://youtube.com/shorts/hULsN9Qubqk",
    bullets: [],
  },
  {
    id: "tools",
    icon: "build",
    titleKey: "guide.section.tools.title",
    descriptionKey: "guide.section.tools.description",
    introYoutubeUrl: "https://youtube.com/shorts/66MjbVSiACc",
    gifSource: "wheel",
    bullets: [],
  },
  {
    id: "notifications",
    icon: "notifications",
    titleKey: "guide.section.notifications.title",
    descriptionKey: "guide.section.notifications.description",
    gifSource: "notifications",
    introYoutubeUrl: "https://youtube.com/shorts/EAUvAGlycd8",
    bullets: [],
  },
  {
    id: "customizations",
    icon: "palette",
    titleKey: "guide.section.customizations.title",
    descriptionKey: "guide.section.customizations.description",
    introYoutubeUrl: "https://youtube.com/shorts/jLFuu13vgA0",
    gifSource: "momentsColors",
    bullets: [],
  },
];
