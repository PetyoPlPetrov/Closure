import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'video-composer' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const VideoComposer = NativeModules.VideoComposer
  ? NativeModules.VideoComposer
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface VideoComposerOptions {
  framePaths: string[];
  outputPath: string;
  fps?: number;
  width?: number;
  height?: number;
}

/**
 * Creates a video from an array of image frames
 * @param options - Configuration for video creation
 * @returns Promise<string> - Path to the created video file
 */
export async function createVideoFromFrames(
  options: VideoComposerOptions
): Promise<string> {
  if (!VideoComposer || !VideoComposer.createVideo) {
    // Fallback: Save frames to media library and return first frame
    console.warn('VideoComposer native module not available. Falling back to frame export.');
    throw new Error('Video composition not supported. Please use screen recording.');
  }

  const { framePaths, outputPath, fps = 5, width = 1080, height = 1920 } = options;

  return await VideoComposer.createVideo(framePaths, outputPath, fps, width, height);
}

export default {
  createVideoFromFrames,
};
