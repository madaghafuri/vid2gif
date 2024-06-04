import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  base: "/vid2gif/",
});
