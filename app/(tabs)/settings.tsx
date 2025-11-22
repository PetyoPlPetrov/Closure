import { StyleSheet } from 'react-native';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { ThemedText } from '@/components/themed-text';

export default function SettingsScreen() {
  return (
    <TabScreenContainer 
      contentStyle={styles.content}
    >
      <ThemedText size="xl" weight="bold" style={styles.title}>Settings</ThemedText>
      <ThemedText>Settings screen coming soon...</ThemedText>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 20,
  },
});

