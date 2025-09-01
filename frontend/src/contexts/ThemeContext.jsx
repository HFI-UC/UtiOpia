import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const getSystemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  const [theme, setTheme] = useState(() => {
    // 从localStorage获取保存的主题，默认为'light'
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'system') {
      return getSystemTheme();
    }
    return savedTheme || 'light';
  });

  const [isLiquidGlass, setIsLiquidGlass] = useState(() => {
    // 从localStorage获取liquid glass状态，默认为false
    const saved = localStorage.getItem('liquidGlass');
    return saved === 'true';
  });

  // 跟随系统的当前主题（用于 liquid 模式或主题=system 的解析）
  const [systemTheme, setSystemTheme] = useState(getSystemTheme());

  useEffect(() => {
    // 持久化设置
    localStorage.setItem('theme', theme);
    localStorage.setItem('liquidGlass', String(isLiquidGlass));

    // 解析最终主题：liquid 或 system 情况下跟随 systemTheme
  const resolved = (isLiquidGlass || localStorage.getItem('theme') === 'system') ? systemTheme : theme;
  const root = document.documentElement;
  root.classList.remove('light', 'dark', 'ios-glass');
  if (isLiquidGlass) root.classList.add('ios-glass');
    root.classList.add(resolved);
  }, [theme, isLiquidGlass, systemTheme]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const sys = e.matches ? 'dark' : 'light';
      setSystemTheme(sys);
      // 若处于系统主题或 liquid 模式时，触发外观刷新
      if (localStorage.getItem('theme') === 'system') {
        setTheme(sys);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleLiquidGlass = () => {
  setIsLiquidGlass(prev => !prev);
  };

  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    } else {
      setTheme(newTheme);
    }
    setIsLiquidGlass(false);
  };

  // 对外暴露解析后的主题（light/dark）
  const resolvedTheme = (isLiquidGlass || theme === 'system') ? systemTheme : theme;

  const value = {
    theme,
    isLiquidGlass,
    resolvedTheme,
    toggleTheme,
    toggleLiquidGlass,
    setSpecificTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export { useTheme, ThemeProvider };
