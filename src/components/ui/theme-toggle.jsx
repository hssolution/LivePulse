import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle({ theme, onToggle }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  )
}

