import React, { useContext } from 'react';
import { ThemeContext } from '../ThemeContext';

export default function ThemedIcon({ name, size = 28, alt = '', style = {}, className = '' }) {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  // SVGs are in public/icons, e.g. /icons/__calendar.svg
  // We'll use <img> for simplicity and apply filter for dark mode
  const src = `/icons/${name}.svg`;
  const filter = isDark ? 'invert(1) brightness(1.2)' : 'none';
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ filter, display: 'block', ...style }}
      className={className}
      draggable={false}
    />
  );
} 