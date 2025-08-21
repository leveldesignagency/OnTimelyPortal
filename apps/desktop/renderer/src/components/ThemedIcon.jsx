import React, { useContext } from 'react';
import { ThemeContext } from '../ThemeContext';

export default function ThemedIcon({ name, size = 28, alt = '', style = {}, className = '' }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  // Check if we're running in Electron (desktop app) or web
  const isElectron = window.electron || process.env.VITE_TARGET === 'electron';
  
  // Use relative path for Electron builds, absolute for web
  const src = isElectron ? `./icons/${name}.svg` : `/icons/${name}.svg`;
  
  const filter = isDark ? 'invert(1) brightness(1.2)' : 'none';
  return (
    <img
      src={src}
      alt={size}
      width={size}
      height={size}
      style={{ filter, display: 'block', ...style }}
      className={className}
      draggable={false}
    />
  );
} 