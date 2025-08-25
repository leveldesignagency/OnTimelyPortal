import React, { useContext } from 'react';
import { ThemeContext } from '../ThemeContext';

export default function ThemedIcon({ name, size = 28, alt = '', style = {}, className = '' }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  
  // Runtime detection: prefer actual runtime over build-time env flags
  const isElectronRuntime = typeof window !== 'undefined' && (window.electron || window.location.protocol === 'file:');
  // Use relative path for Electron packaged runtime, absolute for web/dev server
  const src = isElectronRuntime ? `./icons/${name}.svg` : `/icons/${name}.svg`;
  
  const filter = isDark ? 'invert(1) brightness(1.2)' : 'none';
  return (
    <img
      src={src}
      alt={alt || name}
      width={size}
      height={size}
      style={{ filter, display: 'block', ...style }}
      className={className}
      draggable={false}
    />
  );
} 