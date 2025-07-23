import tailwindConfig from "./tailwind.config.js";

export default {
  presets: [tailwindConfig],
  content: [
    "./client/sidebar/components/**/*.{js,ts,tsx}",
    "./client/shared/components/**/*.{js,ts,tsx}",
    "./node_modules/@hypothesis/annotation-ui/lib/**/*.{js,ts,tsx}",
    "./node_modules/@hypothesis/frontend-shared/lib/**/*.{js,ts,tsx}",
  ],
};
