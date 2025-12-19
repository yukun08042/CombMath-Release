import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import generouted from '@generouted/react-router/plugin'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 允许外部访问
    port: 5173,        // 端口
    open: true,        // 可选，自动打开浏览器
  },
  plugins: [
    react(), 
    tsconfigPaths(), 
    generouted(), 
  ],
  build: {
    rollupOptions: {
      output:{
        
      }
    }
  }
});
