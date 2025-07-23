import tailwindConfig from './tailwind.config.js';

export default {
  presets: [tailwindConfig],
  content: [
    './client/annotator/components/**/*.{js,ts,tsx}',
    './client/shared/components/**/*.{js,ts,tsx}',
    './node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}',
    // This module references `sidebar-frame` and related classes
    './client/annotator/sidebar.{js,ts,tsx}',
  ],
};
