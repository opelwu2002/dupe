import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        muji: {
          red: '#7F0019',
          bg: '#FAF9F5',
          text: '#222222',
          muted: '#666666',
          border: '#E6E3DC',
          white: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
export default config;
