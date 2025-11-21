import { useThemeColor } from '@/hooks/use-theme-color';
import { Text, type TextProps } from 'react-native';


export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};
const ThemedText = ({lightColor,darkColor}:ThemedTextProps) => {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');


  return <Text style={[{color}]}>Text</Text>;
};

export default ThemedText;