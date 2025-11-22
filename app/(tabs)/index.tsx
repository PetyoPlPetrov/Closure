import { ThemedText } from '@/components/themed-text';
import { TabScreenContainer } from '@/library/components/tab-screen-container';
import { StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <TabScreenContainer>
      <ThemedText style={styles.text}>Hello!!!</ThemedText>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  text: {
    margin: 100,
  },
});
