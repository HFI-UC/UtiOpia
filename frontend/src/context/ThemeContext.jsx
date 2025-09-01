import React, { createContext, useContext, useEffect, useState } from 'react';

// A simple context provider that manages the current UI theme.  The theme
// string can be one of three values: 'light', 'dark' or 'liquid'.  The
// default is loaded from localStorage if available, otherwise it falls back
// to 'light'.  Whenever the theme changes this component updates the
// document element's class list to ensure that the appropriate CSS rules
// take effect and persists the choice back to localStorage.  Consumers can
// call `setTheme` or `toggleTheme` to change the active theme.

const ThemeContext = createContext({
  theme: 'light',
  setTheme: (theme) => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  // Initialize state from localStorage so the user's preference persists
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch (err) {
      // If localStorage isn't available (e.g. in SSR), default to light
      return 'light';
    }
  });

  // When the theme changes update the root element's class names.  We
  // remove any previously set theme classes before applying the new one to
  // prevent old variables from leaking into the new theme.  The theme
  // string itself is also stored in localStorage so future sessions start
  // with the same mode.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'liquid');
    root.classList.add(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (err) {
      // ignore errors writing to localStorage (e.g. private browsing)
    }
  }, [theme]);

  // Cycle through the available themes: light → dark → liquid → light
  const toggleTheme = () => {
    setTheme((current) => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'liquid';
        default:
          return 'light';
      }
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to consume the ThemeContext.  Components can call this hook
// instead of importing and using useContext directly.  If a component is
// used outside of a ThemeProvider an error will be thrown to aid
// debugging.
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};