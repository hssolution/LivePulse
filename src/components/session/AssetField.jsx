import { useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Upload, Link as LinkIcon, AlertTriangle } from 'lucide-react'

/**
 * 에셋(이미지) 필드 카드
 *
 * - 드래그앤드롭 + 클릭 업로드
 * - 파일 / URL 입력 모드 토글 (둘 다 이미지의 value 슬롯에 저장 → iframe 미리보기 반영)
 * - 권장 폭(max_width) 대비 경고(비차단) + 필드 키 기반 비율 힌트
 *
 * @param {object}   field        템플릿 필드 (field_key/field_name/is_required/max_width/description)
 * @param {string}   value        현재 저장된 이미지 URL (assets[key].value)
 * @param {string}   urlValue     URL 입력 모드의 임시 입력값
 * @param {function} onUploadFile (file) => void  파일 업로드
 * @param {function} onUrlChange  (url) => void   URL 입력 변경
 * @param {function} onUrlSave    () => void      URL을 이미지 value로 저장
 * @param {function} onDelete     () => void      이미지 제거
 */
export default function AssetField({
  field,
  value,
  urlValue,
  onUploadFile,
  onUrlChange,
  onUrlSave,
  onDelete,
}) {
  const [mode, setMode] = useState('file') // 'file' | 'url'
  const [dragOver, setDragOver] = useState(false)
  const [warn, setWarn] = useState('')
  const inputRef = useRef(null)

  const ratioHint = /banner/i.test(field.field_key)
    ? '가로형 배너'
    : /logo/i.test(field.field_key)
      ? '정사각/가로 로고'
      : null

  const validateAndUpload = (file) => {
    if (!file) return
    setWarn('')
    // 권장 폭 대비 검증 (비차단) — 너무 작으면 경고만
    if (field.max_width) {
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth < field.max_width * 0.5) {
          setWarn(`업로드 폭이 ${img.naturalWidth}px로 권장(${field.max_width}px)보다 작아 흐릿할 수 있어요.`)
        }
      }
      img.src = URL.createObjectURL(file)
    }
    onUploadFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) validateAndUpload(file)
  }

  return (
    <Card className="mb-3">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">
            {field.field_name}
            {field.is_required && <span className="text-rose-500 ml-1">*</span>}
          </Label>
          {field.max_width && (
            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
              권장 최대 {field.max_width}px{ratioHint ? ` · ${ratioHint}` : ''}
            </span>
          )}
        </div>
        {field.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{field.description}</p>
        )}

        {value ? (
          /* 저장된 이미지 썸네일 + 삭제 */
          <div className="relative">
            <img src={value} alt="" className="w-full h-24 object-cover rounded-lg border" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            {/* 모드 토글 */}
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                  mode === 'file'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Upload className="w-3 h-3" /> 파일
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                  mode === 'url'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LinkIcon className="w-3 h-3" /> URL
              </button>
            </div>

            {mode === 'file' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  이미지를 끌어다 놓거나 클릭해 업로드
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => validateAndUpload(e.target.files?.[0])}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://"
                  value={urlValue || ''}
                  onChange={(e) => onUrlChange(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Button variant="outline" size="sm" onClick={onUrlSave}>
                  적용
                </Button>
              </div>
            )}
          </>
        )}

        {warn && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            {warn}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
