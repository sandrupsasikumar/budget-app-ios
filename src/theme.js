import { createContext, useContext } from 'react';

export const light = {
  mode: 'light',
  bg: '#F3F5F4',
  card: '#FFFFFF',
  raised: '#F7F9F8',
  text: '#16211D',
  muted: '#68776F',
  line: '#E3E9E6',
  accent: '#1F7A5A',
  accentText: '#FFFFFF',
  accentSoft: '#DCF0E6',
  good: '#24935F',
  warn: '#C98F00',
  bad: '#C8402F',
  track: '#E6ECE9',
  income: '#2F6FB5',
  input: '#FFFFFF',
};

export const dark = {
  mode: 'dark',
  bg: '#0E1412',
  card: '#17201D',
  raised: '#1D2824',
  text: '#E8EFEC',
  muted: '#93A39C',
  line: '#26332E',
  accent: '#3FB287',
  accentText: '#08130F',
  accentSoft: '#1D3A2F',
  good: '#45C08A',
  warn: '#E7B23A',
  bad: '#F0715F',
  track: '#26332E',
  income: '#6EA8F0',
  input: '#121A17',
};

export const ThemeContext = createContext(light);
export const useTheme = () => useContext(ThemeContext);

export const statusColor = (c, s) =>
  s === 'Over budget' ? c.bad : s === 'Near limit' ? c.warn : s === 'On track' ? c.good : c.muted;

export const radius = 16;
