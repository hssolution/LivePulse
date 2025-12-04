import { useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
  Upload,
  Eye,
  FileCode
} from 'lucide-react'
import { useState } from 'react'

/**
 * 리치 텍스트 에디터 툴바 버튼
 */
function ToolbarButton({ 
  onClick, 
  isActive = false, 
  disabled = false, 
  children, 
  title 
}) {
  return (
    <Toggle
      size="sm"
      pressed={isActive}
      onPressedChange={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 p-0 rounded-md transition-all duration-150",
        "hover:bg-muted hover:scale-105",
        "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        "data-[state=on]:shadow-sm data-[state=on]:scale-105",
        "disabled:opacity-40 disabled:hover:scale-100"
      )}
    >
      {children}
    </Toggle>
  )
}

/**
 * 툴바 구분선
 */
function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-1.5 h-5 bg-border/60" />
}

/**
 * 리치 텍스트 에디터 컴포넌트
 * 
 * @param {Object} props
 * @param {string} props.value - HTML 콘텐츠
 * @param {function} props.onChange - 콘텐츠 변경 콜백
 * @param {string} props.placeholder - 플레이스홀더 텍스트
 * @param {boolean} props.enableImage - 이미지 업로드 활성화 여부
 * @param {number} props.minHeight - 최소 높이 (px)
 * @param {number} props.maxHeight - 최대 높이 (px) - 초과 시 스크롤
 * @param {string} props.className - 추가 클래스명
 * @param {boolean} props.disabled - 비활성화 여부
 * @param {boolean} props.simple - 간단 모드 (기본 포맷팅만)
 */
export function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  enableImage = true,
  minHeight = 150,
  maxHeight = 400,
  className,
  disabled = false,
  simple = false
}) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  const editorRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [sourceCode, setSourceCode] = useState('')

  /**
   * 이미지 업로드 핸들러
   * @param {File} file - 업로드할 이미지 파일
   * @param {Object} editorInstance - 에디터 인스턴스 (선택적)
   */
  const handleImageUpload = useCallback(async (file, editorInstance = null) => {
    if (!file || !user) return

    // 파일 유효성 검사
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error(t('editor.invalidImageType'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('editor.imageTooLarge'))
      return
    }

    setUploading(true)
    try {
      // 파일명 생성: userId/timestamp_randomstring.ext
      const fileExt = file.name?.split('.').pop() || file.type.split('/')[1] || 'png'
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('editor-images')
        .upload(fileName, file)

      if (error) throw error

      // Public URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('editor-images')
        .getPublicUrl(fileName)

      // 에디터에 이미지 삽입 (editorRef 또는 전달받은 인스턴스 사용)
      const targetEditor = editorInstance || editorRef.current
      targetEditor?.chain().focus().setImage({ src: publicUrl }).run()
      toast.success(t('editor.imageUploaded'))
    } catch (error) {
      console.error('Image upload error:', error)
      toast.error(t('editor.imageUploadFailed'))
    } finally {
      setUploading(false)
    }
  }, [user, t])

  /**
   * Tiptap 에디터 설정
   */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: simple ? false : { levels: [1, 2, 3] },
        codeBlock: simple ? false : {},
        blockquote: simple ? false : {},
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // 빈 에디터는 빈 문자열로 처리
      const isEmpty = editor.isEmpty
      onChange?.(isEmpty ? '' : html)
    },
    editorProps: {
      /**
       * 클립보드에서 붙여넣기 처리 (Ctrl+V)
       */
      handlePaste: (view, event) => {
        if (!enableImage) return false
        
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              // editorRef.current를 통해 업로드
              handleImageUpload(file, editorRef.current)
              return true
            }
          }
        }
        return false
      },
      /**
       * 드래그 앤 드롭 이미지 처리
       */
      handleDrop: (view, event) => {
        if (!enableImage) return false
        
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false

        const imageFile = Array.from(files).find(file => file.type.startsWith('image/'))
        if (imageFile) {
          event.preventDefault()
          handleImageUpload(imageFile, editorRef.current)
          return true
        }
        return false
      },
    },
  })

  /**
   * 에디터 인스턴스를 ref에 저장
   */
  useEffect(() => {
    if (editor) {
      editorRef.current = editor
    }
  }, [editor])

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file, editor)
    }
    // 같은 파일 다시 선택 가능하도록 초기화
    e.target.value = ''
  }, [handleImageUpload, editor])

  /**
   * 링크 추가/수정 핸들러
   */
  const handleSetLink = useCallback(() => {
    if (!linkUrl) {
      editor?.chain().focus().unsetLink().run()
    } else {
      // URL에 프로토콜이 없으면 추가
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setLinkPopoverOpen(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  /**
   * 링크 팝오버 열릴 때 현재 링크 URL 가져오기
   */
  const handleLinkPopoverOpen = useCallback((open) => {
    if (open) {
      const previousUrl = editor?.getAttributes('link').href || ''
      setLinkUrl(previousUrl)
    }
    setLinkPopoverOpen(open)
  }, [editor])

  /**
   * HTML 소스 보기 토글
   */
  const handleToggleSource = useCallback(() => {
    if (showSource) {
      // 소스 모드 → 에디터 모드: HTML 적용
      editor?.commands.setContent(sourceCode, false)
      setShowSource(false)
    } else {
      // 에디터 모드 → 소스 모드: 현재 HTML 가져오기
      const html = editor?.getHTML() || ''
      // HTML 포맷팅 (가독성 향상)
      const formatted = html
        .replace(/></g, '>\n<')
        .replace(/(<\/[^>]+>)([^<])/g, '$1\n$2')
      setSourceCode(formatted)
      setShowSource(true)
    }
  }, [editor, showSource, sourceCode])

  /**
   * 소스 코드 변경 핸들러
   */
  const handleSourceChange = useCallback((e) => {
    setSourceCode(e.target.value)
  }, [])

  if (!editor) {
    return null
  }

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden bg-background shadow-sm",
      "ring-1 ring-border/50 transition-all duration-200",
      "focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      {/* 툴바 */}
      <div className={cn(
        "flex flex-wrap items-center gap-0.5 p-1.5 border-b",
        "bg-gradient-to-b from-muted/50 to-muted/30",
        showSource && "bg-gradient-to-b from-amber-50/50 to-amber-100/30 dark:from-amber-950/30 dark:to-amber-900/20"
      )}>
        {/* 실행취소/다시실행 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title={t('editor.undo')}
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title={t('editor.redo')}
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* 텍스트 포맷팅 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title={t('editor.bold')}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title={t('editor.italic')}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title={t('editor.underline')}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title={t('editor.strikethrough')}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title={t('editor.code')}
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        {!simple && (
          <>
            <ToolbarDivider />

            {/* 제목 */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title={t('editor.heading1')}
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title={t('editor.heading2')}
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title={t('editor.heading3')}
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* 리스트 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title={t('editor.bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title={t('editor.orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        {!simple && (
          <>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title={t('editor.quote')}
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* 정렬 */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title={t('editor.alignLeft')}
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title={t('editor.alignCenter')}
            >
              <AlignCenter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title={t('editor.alignRight')}
            >
              <AlignRight className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}

        <ToolbarDivider />

        {/* 링크 */}
        <Popover open={linkPopoverOpen} onOpenChange={handleLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('link')}
              className="h-8 w-8 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              title={t('editor.link')}
            >
              <LinkIcon className="h-4 w-4" />
            </Toggle>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="link-url">{t('editor.linkUrl')}</Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSetLink()
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSetLink}>
                  {editor.isActive('link') ? t('editor.updateLink') : t('editor.addLink')}
                </Button>
                {editor.isActive('link') && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run()
                      setLinkPopoverOpen(false)
                    }}
                  >
                    <Unlink className="h-4 w-4 mr-1" />
                    {t('editor.removeLink')}
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 이미지 */}
        {enableImage && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            <ToolbarButton
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || showSource}
              title={t('editor.insertImage')}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </ToolbarButton>
          </>
        )}

        {/* HTML 소스 보기 */}
        {!simple && (
          <>
            <ToolbarDivider />
            <ToolbarButton
              onClick={handleToggleSource}
              isActive={showSource}
              title={t('editor.viewSource')}
            >
              <FileCode className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* 에디터 본문 또는 소스 코드 */}
      {showSource ? (
        <div className="relative">
          {/* 소스 모드 표시 배지 */}
          <div className="absolute top-2 right-2 z-10">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <FileCode className="h-3 w-3" />
              HTML
            </span>
          </div>
          <textarea
            value={sourceCode}
            onChange={handleSourceChange}
            className={cn(
              "w-full p-4 pr-16 font-mono text-sm resize-none focus:outline-none",
              "bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950",
              "text-slate-700 dark:text-slate-300",
              "leading-relaxed tracking-tight",
              "scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600",
              "scrollbar-track-transparent hover:scrollbar-thumb-slate-400"
            )}
            style={{ 
              minHeight, 
              maxHeight,
              overflowY: 'auto'
            }}
            spellCheck={false}
            placeholder="<p>HTML 코드를 입력하세요...</p>"
          />
        </div>
      ) : (
        <div 
          className="editor-content-wrapper overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
          style={{ maxHeight }}
        >
          <EditorContent 
            editor={editor} 
            className="prose prose-sm dark:prose-invert max-w-none"
            style={{ minHeight }}
          />
        </div>
      )}

      {/* 에디터 스타일 */}
      <style>{`
        /* 스크롤바 스타일 */
        .editor-content-wrapper::-webkit-scrollbar,
        textarea::-webkit-scrollbar {
          width: 8px;
        }
        .editor-content-wrapper::-webkit-scrollbar-track,
        textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        .editor-content-wrapper::-webkit-scrollbar-thumb,
        textarea::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 4px;
        }
        .editor-content-wrapper::-webkit-scrollbar-thumb:hover,
        textarea::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }

        /* ProseMirror 기본 스타일 */
        .ProseMirror {
          padding: 1rem;
          min-height: ${minHeight}px;
          outline: none;
          line-height: 1.7;
        }
        
        /* 플레이스홀더 */
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground) / 0.6);
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        
        /* 이미지 스타일 */
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 0.75rem 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ProseMirror img:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        
        /* 인용문 스타일 */
        .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--primary) / 0.5);
          padding-left: 1rem;
          margin: 1rem 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
          background: hsl(var(--muted) / 0.3);
          border-radius: 0 0.5rem 0.5rem 0;
          padding: 0.75rem 1rem;
        }
        
        /* 인라인 코드 스타일 */
        .ProseMirror code {
          background: linear-gradient(135deg, hsl(var(--muted)), hsl(var(--muted) / 0.8));
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          color: hsl(var(--primary));
        }
        
        /* 코드 블록 스타일 */
        .ProseMirror pre {
          background: linear-gradient(135deg, hsl(222 47% 11%), hsl(222 47% 15%));
          color: #e2e8f0;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 0.875em;
          line-height: 1.6;
        }
        .ProseMirror pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        
        /* 리스트 스타일 */
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .ProseMirror li {
          margin: 0.25rem 0;
        }
        .ProseMirror ul li::marker {
          color: hsl(var(--primary));
        }
        .ProseMirror ol li::marker {
          color: hsl(var(--primary));
          font-weight: 600;
        }
        
        /* 제목 스타일 */
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          font-weight: 700;
          line-height: 1.3;
          color: hsl(var(--foreground));
        }
        .ProseMirror h1 { 
          font-size: 1.75rem; 
          margin: 1.5rem 0 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid hsl(var(--border));
        }
        .ProseMirror h2 { 
          font-size: 1.375rem; 
          margin: 1.25rem 0 0.5rem;
        }
        .ProseMirror h3 { 
          font-size: 1.125rem; 
          margin: 1rem 0 0.5rem;
        }
        /* 링크 스타일 */
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: none;
          cursor: pointer;
          border-bottom: 1px solid hsl(var(--primary) / 0.3);
          padding-bottom: 1px;
          transition: all 0.15s ease;
        }
        .ProseMirror a:hover {
          border-bottom-color: hsl(var(--primary));
          background: hsl(var(--primary) / 0.1);
          border-radius: 2px;
        }
        
        /* 취소선 스타일 */
        .ProseMirror s {
          text-decoration-color: hsl(var(--destructive) / 0.5);
        }
        
        /* 선택 스타일 */
        .ProseMirror ::selection {
          background: hsl(var(--primary) / 0.2);
        }
        
        /* 단락 간격 */
        .ProseMirror p {
          margin: 0.5rem 0;
        }
        .ProseMirror p:first-child {
          margin-top: 0;
        }
        .ProseMirror p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  )
}

export default RichTextEditor

