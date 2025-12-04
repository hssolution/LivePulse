import { useMemo, useState } from 'react'
import parse from 'html-react-parser'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import { Image, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * HTML 콘텐츠를 안전하게 렌더링하는 컴포넌트
 * - DOMPurify로 XSS 공격 방지
 * - 이미지 크기 제한 및 스타일링
 * - 컴팩트 모드 지원 (미리보기용)
 * 
 * @param {Object} props
 * @param {string} props.html - 렌더링할 HTML 문자열
 * @param {string} props.className - 추가 클래스명
 * @param {boolean} props.compact - 컴팩트 모드 (미리보기용, 이미지 숨김)
 * @param {number} props.maxLines - 최대 줄 수 (line-clamp)
 * @param {number} props.maxImageHeight - 이미지 최대 높이 (px)
 * @param {boolean} props.expandable - 펼치기/접기 지원
 * @param {number} props.previewLength - 미리보기 텍스트 길이 (expandable 시)
 */
export function HtmlContent({ 
  html = '', 
  className,
  compact = false,
  maxLines,
  maxImageHeight = 200,
  expandable = false,
  previewLength = 100
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  /**
   * HTML에 이미지가 포함되어 있는지 확인
   */
  const hasImages = useMemo(() => {
    return /<img\s/i.test(html)
  }, [html])

  /**
   * 첫 번째 이미지 URL 추출 (툴팁 미리보기용)
   */
  const firstImageUrl = useMemo(() => {
    if (!html) return null
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
    return match ? match[1] : null
  }, [html])

  /**
   * 미리보기용 텍스트 추출
   */
  const previewText = useMemo(() => {
    if (!html) return ''
    return extractTextFromHtml(html, previewLength)
  }, [html, previewLength])

  /**
   * 전체 콘텐츠가 미리보기보다 긴지 확인
   */
  const needsExpand = useMemo(() => {
    if (!expandable) return false
    const fullText = extractTextFromHtml(html, 10000)
    return fullText.length > previewLength || hasImages
  }, [html, expandable, previewLength, hasImages])

  /**
   * HTML 정제 및 파싱
   */
  const content = useMemo(() => {
    if (!html || html === '<p></p>') return null
    
    // DOMPurify로 XSS 방지
    const cleanHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img',
        'span', 'div'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'style'],
      ALLOW_DATA_ATTR: false,
    })
    
    // html-react-parser로 React 엘리먼트로 변환
    return parse(cleanHtml, {
      replace: (domNode) => {
        // 이미지 처리
        if (domNode.name === 'img') {
          const src = domNode.attribs?.src
          const alt = domNode.attribs?.alt || ''
          
          // 컴팩트 모드에서는 이미지 대신 플레이스홀더 표시
          if (compact) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                📷 {alt || '이미지'}
              </span>
            )
          }
          
          // 일반 모드: 이미지 렌더링 (크기 제한)
          return (
            <img 
              src={src} 
              alt={alt}
              className="max-w-full rounded-md my-2 cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxHeight: `${maxImageHeight}px`, objectFit: 'contain' }}
              onClick={() => window.open(src, '_blank')}
              loading="lazy"
            />
          )
        }
        
        // 링크 처리 (새 탭에서 열기)
        if (domNode.name === 'a') {
          const href = domNode.attribs?.href
          return (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {domNode.children?.[0]?.data || href}
            </a>
          )
        }
      }
    })
  }, [html, compact, maxImageHeight])

  if (!content) return null

  // 펼치기/접기 모드
  if (expandable) {
    // 텍스트가 실제로 잘렸는지 확인 (이미지 유무와 별개로)
    const fullText = extractTextFromHtml(html, 100000)
    const isTextTruncated = fullText.length > previewLength

    return (
      <div className={cn("html-content-expandable", className)}>
        {!isExpanded ? (
          // 접힌 상태: 미리보기
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-foreground">
                {previewText}
                {isTextTruncated && '...'}
              </span>
              {hasImages && firstImageUrl && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs cursor-pointer hover:bg-blue-500/20 transition-colors">
                        <Image className="h-3 w-3" />
                        이미지
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-1 max-w-[300px]">
                      <img 
                        src={firstImageUrl} 
                        alt="미리보기" 
                        className="max-w-full max-h-[200px] rounded object-contain"
                      />
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {hasImages && !firstImageUrl && (
                <span className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs">
                  <Image className="h-3 w-3" />
                  이미지
                </span>
              )}
            </div>
            {needsExpand && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(true)
                }}
                className="flex-shrink-0 text-xs text-primary hover:underline flex items-center gap-0.5"
              >
                펼치기
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          // 펼친 상태: 전체 내용
          <div>
            <div 
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "prose-p:my-1 prose-headings:my-2",
                "prose-img:my-2 prose-img:rounded-md",
                "prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r",
                "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
                "prose-pre:bg-slate-900 prose-pre:text-slate-100",
              )}
            >
              {content}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(false)
              }}
              className="mt-2 text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              접기
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // 기본 모드
  return (
    <div 
      className={cn(
        "html-content prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-1 prose-headings:my-2",
        "prose-img:my-2 prose-img:rounded-md",
        "prose-blockquote:border-l-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm",
        "prose-pre:bg-slate-900 prose-pre:text-slate-100",
        maxLines && `line-clamp-${maxLines}`,
        compact && "text-sm",
        className
      )}
    >
      {content}
    </div>
  )
}

/**
 * HTML 콘텐츠에서 텍스트만 추출 (미리보기용)
 * @param {string} html - HTML 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string} - 텍스트
 */
export function extractTextFromHtml(html, maxLength = 100) {
  if (!html) return ''
  
  // HTML 태그 제거 (이미지는 빈 문자열로 대체)
  const text = html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export default HtmlContent

