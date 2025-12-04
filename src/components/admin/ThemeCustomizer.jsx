import { useState, useEffect } from 'react'
import { Palette, Moon, Sun, Type, RotateCcw, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { useAdminTheme } from '@/context/AdminThemeContext'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

export function ThemeCustomizer() {
  const { theme, updateTheme, resetTheme, setTheme } = useAdminTheme()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [originalTheme, setOriginalTheme] = useState(theme)

  const presetThemes = [
    { id: 'A', name: t('theme.preset.A'), description: t('theme.preset') + ' A', color: 'bg-blue-600' },
    { id: 'B', name: t('theme.preset.B'), description: t('theme.preset') + ' B', color: 'bg-purple-600' },
    { id: 'C', name: t('theme.preset.C'), description: t('theme.preset') + ' C', color: 'bg-teal-500' },
    { id: 'D', name: t('theme.preset.D'), description: t('theme.preset') + ' D', color: 'bg-gray-600' },
  ]

  const fontSizes = [
    { id: 'small', name: t('theme.small'), size: '14px' },
    { id: 'medium', name: t('theme.medium'), size: '16px' },
    { id: 'large', name: t('theme.large'), size: '18px' },
  ]

  // 창이 열릴 때 현재 테마를 원본으로 저장
  useEffect(() => {
    if (open) {
      setOriginalTheme(theme)
    }
  }, [open, theme])

  // 실시간으로 테마 변경 (미리보기)
  const handleThemeChange = (updates) => {
    setTheme(prev => ({ ...prev, ...updates }))
  }

  // 적용: DB에 저장하고 창 닫기
  const handleApply = async () => {
    await updateTheme(theme)
    setOpen(false)
  }

  // 취소: 원래 테마로 되돌리고 창 닫기
  const handleCancel = () => {
    setTheme(originalTheme)
    setOpen(false)
  }

  // 초기화: 기본 설정으로 변경 (실시간 미리보기)
  const handleReset = () => {
    const defaultTheme = {
      mode: 'light',
      preset: 'D',
      customColors: {},
      fontSize: 'medium'
    }
    setTheme(defaultTheme)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen} modal={false}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title={t('theme.title')}>
          <Palette className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[500px] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{t('theme.title')}</SheetTitle>
          <SheetDescription>
            {t('theme.title')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* 다크/라이트 모드 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {theme.mode === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {t('theme.mode')}
            </Label>
            <div className="flex gap-2">
              <Button
                variant={theme.mode === 'light' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleThemeChange({ mode: 'light' })}
              >
                <Sun className="h-4 w-4 mr-2" />
                {t('theme.light')}
              </Button>
              <Button
                variant={theme.mode === 'dark' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => handleThemeChange({ mode: 'dark' })}
              >
                <Moon className="h-4 w-4 mr-2" />
                {t('theme.dark')}
              </Button>
            </div>
          </div>

          {/* 프리셋 테마 선택 */}
          <div className="space-y-2">
            <Label>{t('theme.preset')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {presetThemes.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleThemeChange({ preset: preset.id })}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-2 transition-all hover:border-primary",
                    theme.preset === preset.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-full shrink-0", preset.color)} />
                  <div className="text-left">
                    <div className="font-medium text-sm">{preset.name}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 폰트 크기 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              {t('theme.fontSize')}
            </Label>
            <div className="flex gap-2">
              {fontSizes.map((size) => (
                <Button
                  key={size.id}
                  variant={theme.fontSize === size.id ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleThemeChange({ fontSize: size.id })}
                >
                  {size.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-col gap-2 pt-6 border-t">
          {/* 초기화 버튼 */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('theme.resetToDefault')}
          </Button>

          {/* 적용/취소 버튼 */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleApply}
            >
              <Check className="h-4 w-4 mr-2" />
              {t('common.apply')}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
