import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Check } from 'lucide-react'

/**
 * 언어 선택 컴포넌트
 * 
 * @param {Object} props
 * @param {string} props.variant - 버튼 스타일 ('default' | 'ghost' | 'outline')
 * @param {string} props.size - 버튼 크기 ('default' | 'sm' | 'icon')
 * @param {boolean} props.showLabel - 현재 언어명 표시 여부
 * @param {string} props.className - 추가 클래스
 */
export function LanguageSelector({ 
  variant = 'ghost', 
  size = 'sm',
  showLabel = false,
  className = ''
}) {
  const { language, setLanguage, languages } = useLanguage()

  // 현재 언어 정보
  const currentLang = languages.find(l => l.code === language)

  // 언어 목록이 없으면 기본 언어 표시 (클릭은 가능)
  const displayLanguages = languages.length > 0 
    ? languages 
    : [
        { code: 'ko', native_name: '한국어' },
        { code: 'en', native_name: 'English' }
      ]

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Globe className="h-4 w-4" />
          {showLabel && currentLang && (
            <span className="ml-2">{currentLang.native_name}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {displayLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{lang.native_name}</span>
            {language === lang.code && (
              <Check className="h-4 w-4 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * 언어 선택 (컴팩트 버전 - 아이콘만)
 */
export function LanguageSelectorIcon({ className = '' }) {
  return <LanguageSelector variant="ghost" size="icon" className={className} />
}

/**
 * 언어 선택 (라벨 포함)
 */
export function LanguageSelectorWithLabel({ className = '' }) {
  return <LanguageSelector variant="outline" size="sm" showLabel className={className} />
}

export default LanguageSelector

