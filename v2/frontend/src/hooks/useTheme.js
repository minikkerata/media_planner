import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'system';
  });
  const [uiStyle, setUiStyle] = useState(() => {
    return localStorage.getItem('app_ui_style') || 'old';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    
    const applyTheme = (currentTheme) => {
      let activeTheme = currentTheme;
      if (uiStyle === 'old') {
        document.documentElement.removeAttribute('data-theme');
        activeTheme = 'dark';
      } else {
        if (currentTheme === 'light') {
          document.documentElement.setAttribute('data-theme', 'light');
        } else if (currentTheme === 'dark') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          // System theme
          if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.documentElement.setAttribute('data-theme', 'light');
            activeTheme = 'light';
          } else {
            document.documentElement.removeAttribute('data-theme');
            activeTheme = 'dark';
          }
        }
      }

      // Update browser tab favicon dynamically based on theme
      const faviconLink = document.querySelector('link[rel="icon"]');
      if (faviconLink) {
        faviconLink.href = activeTheme === 'light' ? '/logo_light.svg' : '/logo_dark.svg';
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, uiStyle]);

  useEffect(() => {
    localStorage.setItem('app_ui_style', uiStyle);
    document.documentElement.setAttribute('data-ui-style', uiStyle);
  }, [uiStyle]);

  return { theme, setTheme, uiStyle, setUiStyle };
}
