import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 소스맵 활성화 - 배포 환경에서도 원본 코드로 디버깅 가능
    // ⚠️ 테스트 완료 후 'hidden' 또는 false로 변경 권장 (보안)
    sourcemap: true,
  },
})
