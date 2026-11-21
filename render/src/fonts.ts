import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import '@fontsource/heebo/800.css';
import '@fontsource/heebo/900.css';
import { useEffect, useState } from 'react';
import { continueRender, delayRender } from 'remotion';

// Sample text makes the browser fetch the right unicode-range subset for each script.
const LOADS: [string, string][] = [
  ...[600, 700, 800, 900].map((w): [string, string] => [`${w} 40px Inter`, 'Aa0']),
  ...[600, 700].map((w): [string, string] => [`${w} 40px "IBM Plex Sans Arabic"`, 'الأسواق']),
  ...[600, 700, 800, 900].map((w): [string, string] => [`${w} 40px Heebo`, 'השוק']),
];

/** Block rendering until all fonts are loaded so no frame uses a fallback font. */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('Loading fonts'));
  useEffect(() => {
    Promise.all(LOADS.map(([font, text]) => document.fonts.load(font, text)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};
