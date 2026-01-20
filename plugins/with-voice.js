const { withPlugins, withInfoPlist, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo config plugin for @react-native-voice/voice
 * Adds required permissions and configurations
 */
const withVoice = (config) => {
  // iOS: Add speech recognition and microphone permissions
  config = withInfoPlist(config, (config) => {
    config.modResults.NSSpeechRecognitionUsageDescription = 
      config.modResults.NSSpeechRecognitionUsageDescription || 
      'This app uses speech recognition to convert your voice input into text for the AI assistant feature.';
    config.modResults.NSMicrophoneUsageDescription = 
      config.modResults.NSMicrophoneUsageDescription || 
      'This app needs access to your microphone to record your voice for speech-to-text conversion in the AI assistant feature.';
    return config;
  });

  // Android: Add RECORD_AUDIO permission (should already be there, but ensure it)
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    if (!androidManifest.usesPermissions) {
      androidManifest.usesPermissions = [];
    }

    const hasRecordAudio = androidManifest.usesPermissions.some(
      (perm) => perm.$['android:name'] === 'android.permission.RECORD_AUDIO'
    );

    if (!hasRecordAudio) {
      androidManifest.usesPermissions.push({
        $: { 'android:name': 'android.permission.RECORD_AUDIO' },
      });
    }

    return config;
  });

  return config;
};

module.exports = withVoice;
