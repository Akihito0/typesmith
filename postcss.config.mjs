// Next.js only reads a postcss config from the project root, so this file
// stays put and points tailwind at config/.
export default {
  plugins: {
    tailwindcss: { config: "./config/tailwind.config.ts" },
    autoprefixer: {},
  },
};
