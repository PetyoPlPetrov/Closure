
import * as React from 'react';

export const ThemeContext = React.createContext<
  ReactNavigation.Theme | undefined
>(undefined);

ThemeContext.displayName = 'ThemeContext';

type Props = {
  value: ReactNavigation.Theme | undefined;
  children: React.ReactNode;
};

export function ThemeProvider({ value, children }: Props) {
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
