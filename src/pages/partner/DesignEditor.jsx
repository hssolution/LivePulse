import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Smartphone,
  Monitor,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  PlayCircle,
  GripVertical,
  ArrowUpDown,
  Plus,
  Lock,
  Loader2,
  ArrowRight,
  Upload,
  Link as LinkIcon,
  Rocket,
  Palette,
  X,
  Maximize2,
  History,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  SECTION_REGISTRY,
  SCENE_META,
  sceneSettings,
  deriveTokens,
  DEFAULT_TOKENS,
  FONT_STACKS,
  PAGE_GRADIENTS,
  contrastRatio,
  presetFromTemplate,
  newSectionId,
  SCENE_BAND_SECTIONS,
  joinCtaLabel,
} from '@/components/audience/sections/registry'
import SectionRenderer from '@/components/audience/SectionRenderer'
import SectionBand from '@/components/audience/SectionBand'
import DesignSimulator from '@/components/session/DesignSimulator'
import { BroadcastPreview, QnaPreview, PollPreview } from '@/components/audience/ScreenPreviews'
import PreviewFrame from '@/components/session/PreviewFrame'
import { EndedView } from '@/pages/LiveSession'
import { suggestOverlay } from '@/lib/imageLuminance'

/**
 * 디자인 에디터 (풀스크린 3패널) — /partner/sessions/:id/design
 *
 * 좌: 섹션 리스트(dnd 정렬) · 중: PreviewFrame 캔버스(SectionRenderer editable) ·
 * 우: 인스펙터(registry schema 자동 렌더)
 *
 * - design_draft를 편집 (2초 디바운스 자동저장 → sp_partner_design_s save_draft)
 * - [게시] → publish: design_published에 복사, 청중 참가 페이지에 즉시 적용
 * - undo/redo: JSON 스냅샷 최대 50개 (Ctrl+Z / Ctrl+Shift+Z)
 * - 장면: 참가(enter)·로비(lobby) 편집 지원 — 라이브/종료 칩은 추후
 * - E2: 시작 프리셋 갤러리 · 게시 히스토리 복원(020 restore) · 내 테마(localStorage) ·
 *       히어로 이미지 자동 스크림(suggestOverlay) · 게시 전 참여 카드 위치 경고
 */

const MAX_SECTIONS = 12 // 장면당 최대 섹션 수
const MAX_UNDO = 50

// 브랜드 색 추천 스와치 (프리셋 브랜드 + 무난한 행사 톤)
const BRAND_SWATCHES = ['#5157c9', '#0f172a', '#0d9488', '#e11d48', '#e8641f', '#16a34a']

// 시작 다이얼로그 전용 추천 스와치
const START_SWATCHES = ['#5157c9', '#0f172a', '#0d9488', '#e8641f', '#be185d', '#16a34a']

// 시작 다이얼로그 프리셋 카드 — [템플릿 코드, 이름, 설명]
const START_PRESETS = [
  ['symposium', '학술 심포지엄', '로고·발표자 중심의 정제된 구성'],
  ['conference', '컨퍼런스', '다크 톤 · 2열 정보 배치'],
  ['workshop', '워크숍', '콤팩트한 실습형 구성'],
]

// 내 테마 저장소 (localStorage v1)
const THEMES_KEY = 'lp_my_themes'
const MAX_THEMES = 10
const loadMyThemes = () => {
  try {
    const v = JSON.parse(localStorage.getItem(THEMES_KEY) || '[]')
    return Array.isArray(v) ? v.filter((t) => t?.name && t?.tokens) : []
  } catch {
    return []
  }
}

// 그라데이션 프리셋 — registry bgStyle presets와 동일 키
const GRADIENT_PRESETS = [
  ['brand', '브랜드'],
  ['night', '나이트'],
  ['sunset', '선셋'],
  ['forest', '포레스트'],
  ['custom', '직접 지정'],
]
const gradientCss = (preset, brand, bg) => {
  if (preset === 'custom')
    return `linear-gradient(${bg?.angle ?? 135}deg, ${bg?.from || brand}, ${bg?.to || '#334155'})`
  return (
    {
      brand: `linear-gradient(135deg, ${brand}, ${brand}a6)`,
      night: 'linear-gradient(135deg,#0f172a,#334155)',
      sunset: 'linear-gradient(135deg,#e8641f,#e11d48)',
      forest: 'linear-gradient(135deg,#166534,#0d9488)',
    }[preset] || `linear-gradient(135deg, ${brand}, ${brand}a6)`
  )
}

const pad2 = (n) => String(n).padStart(2, '0')
const formatTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
// 히스토리 표기용 "M/D HH:mm"
const formatHistoryAt = (at) => {
  const d = new Date(at)
  return `${d.getMonth() + 1}/${d.getDate()} ${formatTime(d)}`
}

/* ════════════ 공용 소형 컨트롤 (다크 톤) ════════════ */

const darkInput = 'h-8 text-xs bg-[#1b1f2a] border-[#2a2f3d] text-slate-200 placeholder:text-slate-600'

function FieldLabel({ children }) {
  return <div className="text-[11px] font-semibold text-slate-400 mb-1.5">{children}</div>
}

/** 택1 버튼 그룹 — options는 [value, label] 쌍 배열 */
function Segment({ value, options, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
            String(value) === String(v)
              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
              : 'border-[#2a2f3d] text-slate-400 hover:border-slate-500'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** 컬러 픽커 + 헥스 표시 */
function ColorInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#5157c9'}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 rounded border border-[#2a2f3d] bg-transparent cursor-pointer p-0.5"
      />
      <span className="text-xs text-slate-400 font-mono">{value || ''}</span>
    </div>
  )
}

/**
 * 이미지 필드 — [파일 업로드 | URL 입력] (AssetField 패턴)
 * 업로드: session-assets 버킷의 `${sessionId}/design/…` 경로 → public URL
 */
function ImageInput({ value, onChange, sessionId }) {
  const [mode, setMode] = useState('file')
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${sessionId}/design/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('session-assets')
        .upload(fileName, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('session-assets').getPublicUrl(fileName)
      onChange(urlData.publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('업로드 실패')
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className="relative">
        <img src={value} alt="" className="w-full h-20 object-cover rounded-lg border border-[#2a2f3d]" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center"
          title="이미지 제거"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode('file')}
          className={`px-2 py-0.5 rounded inline-flex items-center gap-1 ${
            mode === 'file' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:bg-[#1b1f2a]'
          }`}
        >
          <Upload className="w-3 h-3" /> 파일
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-2 py-0.5 rounded inline-flex items-center gap-1 ${
            mode === 'url' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:bg-[#1b1f2a]'
          }`}
        >
          <LinkIcon className="w-3 h-3" /> URL
        </button>
      </div>
      {mode === 'file' ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2f3d] hover:border-slate-500 rounded-lg p-3 text-center cursor-pointer transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mx-auto animate-spin text-indigo-400" />
          ) : (
            <>
              <Upload className="w-4 h-4 mx-auto text-slate-500 mb-1" />
              <p className="text-[11px] text-slate-500">클릭해 이미지 업로드</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Input
            type="url"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={`flex-1 ${darkInput}`}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs border-[#2a2f3d] bg-transparent text-slate-300 hover:bg-[#1b1f2a]"
            onClick={() => {
              if (url.trim()) {
                onChange(url.trim())
                setUrl('')
              }
            }}
          >
            적용
          </Button>
        </div>
      )}
    </div>
  )
}

/** image 필드의 배열 버전 — 항목 추가/제거 (sponsors.logos 등) */
function ImageListInput({ value, onChange, max = 8, sessionId }) {
  const list = Array.isArray(value) ? value : []
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="relative">
          <img src={item?.url} alt="" className="w-full h-14 object-contain rounded-lg border border-[#2a2f3d] bg-[#1b1f2a] p-1" />
          <button
            type="button"
            onClick={() => onChange(list.filter((_, j) => j !== i))}
            className="absolute top-1 right-1 h-5 w-5 rounded bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center"
            title="제거"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      {list.length < max ? (
        <ImageInput value={null} onChange={(u) => u && onChange([...list, { url: u }])} sessionId={sessionId} />
      ) : (
        <p className="text-[11px] text-slate-500">최대 {max}개까지 추가할 수 있어요.</p>
      )}
    </div>
  )
}

/** background 복합 필드 — 유형(none/color/gradient/image) + 유형별 하위 컨트롤 */
function BackgroundInput({ value, onChange, brand, sessionId, onImageSet }) {
  const bg = value || { type: 'none' }
  const setType = (type) => {
    if (type === 'color') onChange({ type, color: bg.color || brand })
    else if (type === 'gradient') onChange({ type, preset: bg.preset || 'brand' })
    else if (type === 'image') onChange({ type, url: bg.url || null, overlay: bg.overlay ?? 45 })
    else onChange({ type: 'none' })
  }
  return (
    <div className="space-y-2">
      <Segment
        value={bg.type || 'none'}
        options={[['none', '없음'], ['color', '단색'], ['gradient', '그라데이션'], ['image', '이미지']]}
        onChange={setType}
      />
      {bg.type === 'color' && (
        <ColorInput value={bg.color || brand} onChange={(c) => onChange({ ...bg, color: c })} />
      )}
      {bg.type === 'gradient' && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {GRADIENT_PRESETS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => onChange({ ...bg, preset: key })}
                className={`h-9 flex-1 rounded-lg border-2 transition-all ${
                  (bg.preset || 'brand') === key ? 'border-indigo-400 ring-1 ring-indigo-500/50' : 'border-transparent'
                }`}
                style={{ background: gradientCss(key, brand, bg) }}
              />
            ))}
          </div>
          {bg.preset === 'custom' && (
            <div className="rounded-lg border border-slate-200 p-2.5 space-y-2 bg-slate-50/60">
              <div className="flex gap-2">
                <div className="flex-1">
                  <FieldLabel>시작 색</FieldLabel>
                  <ColorInput value={bg.from || brand} onChange={(c) => onChange({ ...bg, from: c })} />
                </div>
                <div className="flex-1">
                  <FieldLabel>끝 색</FieldLabel>
                  <ColorInput value={bg.to || '#334155'} onChange={(c) => onChange({ ...bg, to: c })} />
                </div>
              </div>
              <div>
                <FieldLabel>방향 · {bg.angle ?? 135}°</FieldLabel>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={bg.angle ?? 135}
                  onChange={(e) => onChange({ ...bg, angle: Number(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
      {bg.type === 'image' && (
        <div className="space-y-2">
          <ImageInput
            value={bg.url}
            onChange={(u) => {
              onChange({ ...bg, url: u })
              // 이미지 URL 새로 설정(업로드 완료·URL 확정) 시 밝기 기반 오버레이 자동 제안 — 1회만
              if (u) onImageSet?.(u)
            }}
            sessionId={sessionId}
          />
          <div>
            <FieldLabel>어둡게 오버레이 · {bg.overlay ?? 45}%</FieldLabel>
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={bg.overlay ?? 45}
              onChange={(e) => onChange({ ...bg, overlay: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════ 좌측: 섹션 리스트 항목 ════════════ */

function SectionRowBody({ sec, def, selected, locked, onSelect, onToggleHidden, onDelete, dragHandle, onMove, moveTitle, onDuplicate }) {
  return (
    <div
      onClick={() => onSelect(sec.id)}
      className={`group flex items-center gap-1.5 rounded-lg border px-2 py-2 cursor-pointer transition-colors ${
        selected
          ? 'border-indigo-500 bg-indigo-500/15'
          : 'border-transparent hover:bg-[#1b1f2a]'
      } ${sec.hidden ? 'opacity-50' : ''}`}
    >
      {locked ? (
        <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" title="항상 마지막에 고정" />
      ) : (
        dragHandle
      )}
      <span className="text-sm shrink-0">{def.icon}</span>
      <span className={`flex-1 min-w-0 truncate text-xs font-semibold ${selected ? 'text-indigo-200' : 'text-slate-300'}`}>
        {def.name}
      </span>
      {!def.required && (
        <>
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate(sec.id)
              }}
              className="p-1 rounded text-slate-500 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title="섹션 복제"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {onMove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMove(sec.id)
              }}
              className="p-1 rounded text-slate-500 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              title={moveTitle}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleHidden(sec.id)
            }}
            className="p-1 rounded text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title={sec.hidden ? '섹션 표시' : '섹션 숨기기'}
          >
            {sec.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(sec.id)
            }}
            className="p-1 rounded text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="섹션 삭제 (Ctrl+Z로 되돌릴 수 있어요)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

function SortableSectionRow(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.sec.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style}>
      <SectionRowBody
        {...props}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 shrink-0"
            title="순서 변경"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        }
      />
    </div>
  )
}

/* ════════════ 우측: 인스펙터 필드 렌더 ════════════ */

function InspectorField({ fieldKey, field, settings, brand, sessionId, onChange, onBgImage }) {
  // showIf가 false면 숨김
  if (field.showIf && !field.showIf(settings)) return null
  const val = settings[fieldKey] !== undefined ? settings[fieldKey] : field.default

  let control = null
  switch (field.type) {
    case 'segment':
      control = <Segment value={val} options={field.options} onChange={(v) => onChange(fieldKey, v)} />
      break
    case 'range':
      control = (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step || 1}
            value={val ?? field.min}
            onChange={(e) => onChange(fieldKey, Number(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-[11px] text-slate-400 w-12 text-right font-mono">
            {val ?? field.min}
            {field.unit || ''}
          </span>
        </div>
      )
      break
    case 'text':
      control = (
        <Input
          value={val || ''}
          maxLength={field.max}
          placeholder={field.placeholder}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={darkInput}
        />
      )
      break
    case 'textarea':
    case 'richtext':
      control = (
        <div className="space-y-1">
          <Textarea
            value={val || ''}
            rows={5}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className="text-xs bg-[#1b1f2a] border-[#2a2f3d] text-slate-200 placeholder:text-slate-600"
          />
          {field.type === 'richtext' && <p className="text-[10px] text-slate-500">HTML 허용 — 링크·굵게 등 태그를 쓸 수 있어요</p>}
        </div>
      )
      break
    case 'toggle':
      // 값이 정의됐으면 그 값(명시적 false 포함), 없으면 기본값 — 기존 식은 val=false를
      // 폴백으로 빠뜨려 기본값 true 필드를 끄면 다시 켜진 것처럼 보이는 버그가 있었음
      control = (
        <Switch
          checked={val === undefined || val === null ? field.default !== false : !!val}
          onCheckedChange={(v) => onChange(fieldKey, v)}
        />
      )
      break
    case 'toggleList': {
      const arr = Array.isArray(val) ? val : field.default || []
      control = (
        <div className="space-y-1.5">
          {field.options.map(([v, label]) => (
            <label key={String(v)} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={arr.includes(v)}
                onChange={(e) =>
                  onChange(fieldKey, e.target.checked ? [...arr, v] : arr.filter((x) => x !== v))
                }
                className="accent-indigo-500"
              />
              {label}
            </label>
          ))}
        </div>
      )
      break
    }
    case 'color':
      control = <ColorInput value={val} onChange={(v) => onChange(fieldKey, v)} />
      break
    case 'image':
      control = <ImageInput value={val} onChange={(v) => onChange(fieldKey, v)} sessionId={sessionId} />
      break
    case 'imageList':
      control = (
        <ImageListInput value={val} onChange={(v) => onChange(fieldKey, v)} max={field.max} sessionId={sessionId} />
      )
      break
    case 'background':
      control = (
        <BackgroundInput
          value={val}
          onChange={(v) => onChange(fieldKey, v)}
          brand={brand}
          sessionId={sessionId}
          onImageSet={onBgImage ? onBgImage(fieldKey) : undefined}
        />
      )
      break
    default:
      return null
  }

  // toggle은 라벨-스위치를 한 줄로
  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400">{field.label}</span>
        {control}
      </div>
    )
  }
  return (
    <div>
      <FieldLabel>{field.label}</FieldLabel>
      {control}
    </div>
  )
}

/* ════════════ 시작 다이얼로그: 프리셋 카드 ════════════ */

/** 미니 목업 카드 — 브랜드 색 히어로 바 + 회색 라인, 색 변경 시 즉시 리컬러 */
function PresetCard({ code, name, desc, brand, onClick }) {
  const dark = code === 'conference'
  const line = dark ? 'bg-slate-600' : 'bg-slate-300'
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-[#2a2f3d] hover:border-indigo-500 hover:bg-indigo-500/10 p-2.5 transition-colors"
    >
      <div className={`rounded-lg overflow-hidden border border-[#2a2f3d] mb-2 ${dark ? 'bg-[#0f172a]' : 'bg-white'}`}>
        {/* 히어로 바 — 선택한 브랜드 색 */}
        <div
          className={`${code === 'workshop' ? 'h-7' : 'h-11'} flex items-center justify-center`}
          style={{ background: dark ? `linear-gradient(135deg,#0f172a,${brand})` : brand }}
        >
          <div className="h-1.5 w-1/2 rounded bg-white/80" />
        </div>
        <div className="p-2 space-y-1.5">
          <div className={`h-1.5 rounded w-3/4 ${line}`} />
          <div className={`h-1.5 rounded w-1/2 ${line}`} />
          {code === 'conference' ? (
            <div className="flex gap-1.5 pt-0.5">
              <div className={`h-4 flex-1 rounded ${line}`} />
              <div className="h-4 flex-1 rounded" style={{ background: brand }} />
            </div>
          ) : (
            <div className="h-4 rounded" style={{ background: brand }} />
          )}
        </div>
      </div>
      <div className="text-xs font-bold text-slate-200">{name}</div>
      <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{desc}</div>
    </button>
  )
}

/* ════════════ 메인 ════════════ */

export default function DesignEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [presenters, setPresenters] = useState([])
  const [cues, setCues] = useState([])

  const [design, setDesign] = useState(null)
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState(null) // 섹션 id | 'tokens' | 'core' | null
  // 장면 — enter·lobby(섹션 편집) | broadcast·qna·poll(기능 화면 설정 편집) | ended(읽기전용)
  // ?scene= 파라미터로 특정 장면을 바로 열 수 있음 (디자인 탭 바로가기 버튼)
  const [scene, setScene] = useState(() => {
    const s = searchParams.get('scene')
    return ['enter', 'lobby', 'broadcast', 'qna', 'poll', 'ended'].includes(s) ? s : 'enter'
  })
  const isSectionScene = scene === 'enter' || scene === 'lobby' // 자유 섹션 트리 편집
  const isBandScene = ['broadcast', 'qna', 'poll', 'ended'].includes(scene) // 핵심 고정 + 상/하단 자유 섹션
  const isCoreScene = ['broadcast', 'qna', 'poll'].includes(scene) // SCENE_META 핵심 설정 인스펙터 있음
  const isEndedScene = scene === 'ended' // 종료 화면 — 핵심부는 읽기전용, 상/하단만 편집
  const [device, setDevice] = useState('mobile')
  const [fullscreen, setFullscreen] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [bandAddTarget, setBandAddTarget] = useState(null) // 'headerSections' | 'footerSections' | null
  const [showSim, setShowSim] = useState(false) // 전체 흐름 시뮬레이션 모달

  // 시작 다이얼로그 (신규 세션 — draft·published 모두 없을 때)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [startBrand, setStartBrand] = useState('#5157c9')

  // 게시 히스토리 (020 — 'get'의 history / published_at)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState([])
  const [publishedAt, setPublishedAt] = useState(null)

  // 내 테마 (localStorage v1)
  const [myThemes, setMyThemes] = useState(loadMyThemes)

  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)

  // 좁은 화면(lg 미만) 안내 배너 — 닫으면 세션당 1회로 끝
  const [showNarrowWarn, setShowNarrowWarn] = useState(true)

  // undo/redo — JSON 스냅샷 스택 (ref: 렌더 없이 동기 갱신, 렌더는 design 변경이 유발)
  const designRef = useRef(null)
  const undoRef = useRef([])
  const redoRef = useRef([])
  const versionRef = useRef(0) // 서버 디자인 버전 — 낙관적 잠금 (019)
  const dirtyRef = useRef(false) // dirty 미러 — beforeunload/unmount/나가기 등 이벤트 핸들러에서 최신값 참조
  const inFlightRef = useRef(null) // 진행 중 saveDraft Promise — 저장 직렬화(version_conflict 오탐 방지)
  const queuedRef = useRef(false) // 저장 진행 중 추가 저장 요청 표시 — 완료 후 재실행
  const assetsRef = useRef({}) // 시작 다이얼로그·로비 기본 구성용 에셋 맵
  const tplCodeRef = useRef(null) // 세션 템플릿 코드

  /* ---------- 데이터 로드 (마운트 1회) ---------- */
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: ses, error } = await supabase.from('sessions').select('*').eq('id', id).single()
      if (cancelled) return
      if (error || !ses) {
        setLoading(false)
        return
      }

      const tasks = [
        supabase.from('session_assets').select('*').eq('session_id', id),
        supabase
          .from('session_presenters')
          .select('*')
          .eq('session_id', id)
          .eq('status', 'confirmed')
          .order('display_order'),
        supabase.rpc('sp_partner_cues_q', { p_session_id: id }),
        ses.template_id
          ? supabase.from('session_templates').select('code').eq('id', ses.template_id).single()
          : Promise.resolve({ data: null }),
        // 019: 초안은 sessions 컬럼이 아니라 session_designs 테이블 — RPC 'get'으로
        supabase.rpc('sp_partner_design_s', { p_session_id: id, p_action: 'get' }),
      ]
      const [assetsRes, presRes, cuesRes, tplRes, designRes] = await Promise.all(tasks)
      if (cancelled) return

      const assetsMap = {}
      ;(assetsRes.data || []).forEach((a) => {
        assetsMap[a.field_key] = { value: a.value, url: a.url }
      })

      const publicCues = (Array.isArray(cuesRes.data) ? cuesRes.data : [])
        .filter((c) => c.is_public !== false)
        .map((c) => ({
          id: c.id,
          title: c.public_title || c.title,
          cue_type: c.cue_type,
          planned_start_at: c.planned_start_at,
          duration_min: c.duration_min,
          display_order: c.display_order,
          presenter_name: c.presenter_name,
        }))

      // 020: 'get'은 { draft, published, version, published_at, history } 반환
      const initial =
        designRes.data?.draft || presetFromTemplate(tplRes.data?.code, assetsMap)
      versionRef.current = designRes.data?.version || 0 // 낙관적 잠금 기준
      assetsRef.current = assetsMap
      tplCodeRef.current = tplRes.data?.code || null
      setHistory(Array.isArray(designRes.data?.history) ? designRes.data.history : [])
      setPublishedAt(designRes.data?.published_at || null)
      // 신규(초안·게시본 모두 없음) → 프리셋 갤러리 시작 다이얼로그
      if (!designRes.data?.draft && !designRes.data?.published) setShowStartDialog(true)

      setSession(ses)
      setPresenters(presRes.data || [])
      setCues(publicCues)
      setDesign(initial)
      designRef.current = initial
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  /* ---------- 변경 커널: 스냅샷 push → design 갱신 → dirty ---------- */
  const mutate = useCallback((fn) => {
    const prev = designRef.current
    if (!prev) return
    const next = typeof fn === 'function' ? fn(prev) : fn
    if (next === prev) return
    undoRef.current.push(JSON.stringify(prev))
    if (undoRef.current.length > MAX_UNDO) undoRef.current.shift()
    redoRef.current = []
    designRef.current = next
    setDesign(next)
    dirtyRef.current = true
    setDirty(true)
  }, [])

  const undo = useCallback(() => {
    const snap = undoRef.current.pop()
    if (!snap) return
    redoRef.current.push(JSON.stringify(designRef.current))
    const parsed = JSON.parse(snap)
    designRef.current = parsed
    setDesign(parsed)
    dirtyRef.current = true
    setDirty(true)
  }, [])

  const redo = useCallback(() => {
    const snap = redoRef.current.pop()
    if (!snap) return
    undoRef.current.push(JSON.stringify(designRef.current))
    const parsed = JSON.parse(snap)
    designRef.current = parsed
    setDesign(parsed)
    dirtyRef.current = true
    setDirty(true)
  }, [])

  // Ctrl+Z / Ctrl+Shift+Z (입력 필드 포커스 중엔 브라우저 텍스트 undo에 양보)
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  /* ---------- 자동저장: 변경 2초 디바운스 (직렬화 — 동시 실행 금지) ---------- */
  const saveDraft = useCallback(async () => {
    // 이미 저장 진행 중이면 완료 후 재실행 예약 — 같은 version으로 겹쳐 쏘는 오탐 방지
    if (inFlightRef.current) {
      queuedRef.current = true
      return inFlightRef.current
    }

    const saveOnce = async () => {
      const d = designRef.current
      if (!d) return
      setSaving(true)
      try {
        const params = { p_session_id: id, p_action: 'save_draft', p_design: d }
        let { data, error } = await supabase.rpc('sp_partner_design_s', {
          ...params,
          p_version: versionRef.current, // 낙관적 잠금 (019)
        })
        // version_conflict → 서버 버전으로 재동기화 후 1회 자동 재시도
        if (data?.error === 'version_conflict' && data.server_version != null) {
          versionRef.current = data.server_version
          ;({ data, error } = await supabase.rpc('sp_partner_design_s', {
            ...params,
            p_version: versionRef.current,
          }))
        }
        if (data?.error === 'version_conflict') {
          toast.error('다른 곳에서 수정되었습니다 — 새로고침 후 다시 편집해주세요')
          return
        }
        if (error || !data?.success) {
          toast.error('초안 저장 실패')
          return
        }
        versionRef.current = data.version ?? versionRef.current
        // 저장 중 추가 편집이 없었을 때만 dirty 해제
        if (designRef.current === d) {
          dirtyRef.current = false
          setDirty(false)
        }
        setLastSavedAt(new Date())
      } finally {
        setSaving(false)
      }
    }

    const p = (async () => {
      do {
        queuedRef.current = false
        await saveOnce()
      } while (queuedRef.current) // 저장 중 요청된 재저장 소화
    })().finally(() => {
      inFlightRef.current = null
    })
    inFlightRef.current = p
    return p
  }, [id])

  useEffect(() => {
    if (!dirty || !design) return
    const t = setTimeout(saveDraft, 2000)
    return () => clearTimeout(t)
  }, [design, dirty, saveDraft])

  /* ---------- 자동저장 flush — 새로고침/탭 닫기 경고 + unmount 시 미저장분 저장 ---------- */
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirtyRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(
    () => () => {
      // SPA 내 라우트 이동 등 unmount — 미저장분 fire-and-forget 저장
      if (dirtyRef.current) saveDraft()
    },
    [saveDraft]
  )

  /* ---------- 게시 ---------- */
  const handlePublish = async () => {
    // 참여 카드가 첫 화면 밖(인덱스 3 이상)일 가능성 경고
    const enterSections = designRef.current?.scenes?.enter?.sections || []
    const joinIdx = enterSections.findIndex((s) => s.type === 'joinCard')
    let msg = '현재 디자인을 게시할까요? 청중 참가 페이지에 즉시 적용됩니다.'
    if (joinIdx >= 3) {
      msg =
        '⚠ 참여 카드가 페이지 아래쪽에 있어요. 청중이 버튼을 못 찾으면 참여율이 떨어질 수 있어요(화면 밖일 땐 하단 고정 버튼이 자동 표시됩니다).\n\n' +
        msg
    }
    if (!confirm(msg)) return
    // 진행 중인 자동저장을 먼저 소화 — 게시가 구버전 version으로 겹쳐 나가는 오탐 방지
    if (inFlightRef.current) await inFlightRef.current
    if (dirtyRef.current) await saveDraft()
    const { data, error } = await supabase.rpc('sp_partner_design_s', {
      p_session_id: id,
      p_action: 'publish',
      p_design: designRef.current,
      p_version: versionRef.current,
    })
    if (data?.error === 'version_conflict') {
      toast.error('다른 곳에서 수정되었습니다 — 새로고침 후 다시 시도해주세요')
      return
    }
    if (data?.error === 'join_card_required') {
      toast.error('참여 카드 섹션이 반드시 1개 표시되어야 해요')
      return
    }
    if (error || !data?.success) {
      toast.error('게시 실패')
      return
    }
    versionRef.current = data.version ?? versionRef.current
    dirtyRef.current = false
    setDirty(false)
    setLastSavedAt(new Date())
    toast.success('게시했습니다 — 청중 참가 페이지에 적용됩니다')
    // 히스토리 목록 갱신 (직전 게시본이 히스토리로 이동 — restore 인덱스 정확성 유지)
    supabase
      .rpc('sp_partner_design_s', { p_session_id: id, p_action: 'get' })
      .then(({ data: g }) => {
        if (!g) return
        setHistory(Array.isArray(g.history) ? g.history : [])
        setPublishedAt(g.published_at || null)
      })
  }

  /* ---------- 게시 히스토리 복원 (020 restore) ---------- */
  const restoreHistory = async (index) => {
    if (!confirm('이 게시본을 초안으로 복원할까요? 현재 초안은 덮어써집니다. (Ctrl+Z로 되돌릴 수 있어요)')) return
    const { data, error } = await supabase.rpc('sp_partner_design_s', {
      p_session_id: id,
      p_action: 'restore',
      p_history_index: index,
    })
    if (error || !data?.draft) {
      toast.error('복원 실패')
      return
    }
    mutate(() => data.draft) // mutate 경유 — Ctrl+Z로 복원 전 초안으로 되돌리기 가능
    versionRef.current = data.version ?? versionRef.current
    setShowHistory(false)
    setSelectedId(null)
    toast.success('이전 게시본을 초안으로 복원했어요 — 게시해야 청중에 반영됩니다')
  }

  /* ---------- 시작 다이얼로그: 프리셋/빈 페이지로 초기화 ---------- */
  const initDesign = (d) => {
    designRef.current = d
    undoRef.current = []
    redoRef.current = []
    setDesign(d)
    dirtyRef.current = true
    setDirty(true) // 자동저장으로 초안 생성
    setScene('enter')
    setSelectedId(null)
    setShowStartDialog(false)
  }

  const startWithPreset = (code) => {
    const d = presetFromTemplate(code, assetsRef.current)
    // 선택한 브랜드 색으로 프리셋 토큰 덮어쓰기
    initDesign({ ...d, tokens: { ...d.tokens, brand: startBrand } })
  }

  const startBlank = () => {
    // 최소 구성 — 히어로 + 참여 카드
    initDesign({
      version: 1,
      tokens: { ...DEFAULT_TOKENS, brand: startBrand },
      scenes: {
        enter: {
          sections: [
            { id: newSectionId(), type: 'hero', settings: {} },
            { id: newSectionId(), type: 'joinCard', settings: {} },
          ],
        },
      },
    })
  }

  /* ---------- 장면 전환 — 로비 구성이 없으면 기본 구성 생성 ---------- */
  const switchScene = (next) => {
    if (next === scene) return
    const cur = designRef.current
    if (next === 'lobby' && cur && !cur.scenes?.lobby?.sections?.length) {
      // 프리셋의 로비 기본 구성(hero compact + schedule + presenters) 차용
      // undo 스택·dirty에 넣지 않음(mutate 미경유) — Ctrl+Z로 로비 장면이 통째로 사라지거나
      // 열어보기만 했는데 자동저장되는 부작용 방지. 실제 편집(mutate) 시점부터 저장 대상.
      const preset = presetFromTemplate(tplCodeRef.current, assetsRef.current)
      const withLobby = { ...cur, scenes: { ...cur.scenes, lobby: preset.scenes.lobby } }
      designRef.current = withLobby
      setDesign(withLobby)
    }
    setScene(next)
    setSelectedId(null)
  }

  /* ---------- 내 테마 (localStorage v1) ---------- */
  const persistThemes = (next) => {
    setMyThemes(next)
    try {
      localStorage.setItem(THEMES_KEY, JSON.stringify(next))
    } catch {
      /* 저장 공간 부족 등은 무시 */
    }
  }

  const saveMyTheme = () => {
    const name = prompt('테마 이름을 입력하세요', '내 테마')
    if (!name || !name.trim()) return
    const theme = { name: name.trim().slice(0, 20), tokens: { ...DEFAULT_TOKENS, ...designRef.current?.tokens } }
    // 동명 테마는 교체, 최신이 앞으로, 최대 10개
    const next = [theme, ...myThemes.filter((t) => t.name !== theme.name)].slice(0, MAX_THEMES)
    persistThemes(next)
    toast.success(`'${theme.name}' 테마를 저장했어요`)
  }

  const applyMyTheme = (t) => mutate((d) => ({ ...d, tokens: { ...t.tokens } }))
  const deleteMyTheme = (name) => persistThemes(myThemes.filter((t) => t.name !== name))

  /* ---------- 히어로 이미지 자동 스크림 — URL 새로 설정 시 1회 제안 ---------- */
  const handleBgImageSet = (sectionId, sceneKey) => (fieldKey) => async (url) => {
    const v = await suggestOverlay(url)
    if (v == null) return // 측정 불가(CORS 등) — 기본값 유지
    let applied = false
    mutate((d) => {
      const secs = d.scenes?.[sceneKey]?.sections || []
      const target = secs.find((s) => s.id === sectionId)
      // 측정하는 동안 URL이 바뀌었으면 무시 (자동은 URL 변경 시 1회만)
      if (!target || target.settings?.[fieldKey]?.url !== url) return d
      applied = true
      return {
        ...d,
        scenes: {
          ...d.scenes,
          [sceneKey]: {
            ...d.scenes[sceneKey],
            sections: secs.map((s) =>
              s.id === sectionId
                ? { ...s, settings: { ...s.settings, [fieldKey]: { ...s.settings[fieldKey], overlay: v } } }
                : s
            ),
          },
        },
      }
    })
    if (applied) toast.success(`이미지 밝기에 맞춰 오버레이를 ${v}%로 조정했어요`)
  }

  /* ---------- 섹션 조작 — 현재 장면(scene) 대상 ---------- */
  // 렌더 파생 값 — 리스트/다이얼로그 표시용 (변경은 아래 mutateSections로 designRef 최신본 기준)
  const sections = design?.scenes?.[scene]?.sections || []
  const locked = sections.filter((s) => SECTION_REGISTRY[s.type]?.lockedLast)
  const sortable = sections.filter((s) => !SECTION_REGISTRY[s.type]?.lockedLast)

  // 함수형 갱신 커널 — 렌더 시점 배열을 캡처하지 않아 비동기 업로드 완료 콜백에서도
  // 최신 designRef 기준으로 동작 (스테일 클로저로 인한 다른 편집 롤백 방지)
  const mutateSections = useCallback(
    (sceneKey, updater) =>
      mutate((d) => {
        const secs = d.scenes?.[sceneKey]?.sections || []
        const next = updater(secs)
        if (next === secs) return d // no-op
        return {
          ...d,
          scenes: { ...d.scenes, [sceneKey]: { ...d.scenes?.[sceneKey], sections: next } },
        }
      }),
    [mutate]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    mutateSections(scene, (secs) => {
      const lockedSecs = secs.filter((s) => SECTION_REGISTRY[s.type]?.lockedLast)
      const sortableSecs = secs.filter((s) => !SECTION_REGISTRY[s.type]?.lockedLast)
      const oldIndex = sortableSecs.findIndex((s) => s.id === active.id)
      const newIndex = sortableSecs.findIndex((s) => s.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return secs
      // lockedLast(joinCard)는 항상 마지막에 고정
      return [...arrayMove(sortableSecs, oldIndex, newIndex), ...lockedSecs]
    })
  }

  const toggleHidden = (sectionId) =>
    mutateSections(scene, (secs) =>
      secs.some((s) => s.id === sectionId)
        ? secs.map((s) => (s.id === sectionId ? { ...s, hidden: !s.hidden } : s))
        : secs
    )

  const deleteSection = (sectionId) => {
    mutateSections(scene, (secs) =>
      secs.some((s) => s.id === sectionId) ? secs.filter((s) => s.id !== sectionId) : secs
    )
    if (selectedId === sectionId) setSelectedId(null)
  }

  const addSection = (type) => {
    const newSec = { id: newSectionId(), type, settings: {} }
    mutateSections(scene, (secs) => {
      if (secs.length >= MAX_SECTIONS) return secs
      const lockedSecs = secs.filter((s) => SECTION_REGISTRY[s.type]?.lockedLast)
      const sortableSecs = secs.filter((s) => !SECTION_REGISTRY[s.type]?.lockedLast)
      // joinCard(고정 마지막) 앞에 삽입
      return [...sortableSecs, newSec, ...lockedSecs]
    })
    setSelectedId(newSec.id)
    setShowAddDialog(false)
  }

  /* ---------- 기능 화면 상/하단 자유 섹션 밴드 (headerSections / footerSections) ---------- */
  const BAND_MAX = 6
  const headerSecs = design?.scenes?.[scene]?.headerSections || []
  const footerSecs = design?.scenes?.[scene]?.footerSections || []

  const mutateBand = useCallback(
    (sceneKey, band, updater) =>
      mutate((d) => {
        const arr = d.scenes?.[sceneKey]?.[band] || []
        const next = updater(arr)
        if (next === arr) return d
        return { ...d, scenes: { ...d.scenes, [sceneKey]: { ...d.scenes?.[sceneKey], [band]: next } } }
      }),
    [mutate]
  )

  const addBandSection = (band, type) => {
    const newSec = { id: newSectionId(), type, settings: {} }
    mutateBand(scene, band, (arr) => (arr.length >= BAND_MAX ? arr : [...arr, newSec]))
    setSelectedId(newSec.id)
    setBandAddTarget(null)
  }
  const deleteBandSection = (band, sectionId) => {
    mutateBand(scene, band, (arr) => arr.filter((s) => s.id !== sectionId))
    if (selectedId === sectionId) setSelectedId(null)
  }
  const toggleBandHidden = (band, sectionId) =>
    mutateBand(scene, band, (arr) => arr.map((s) => (s.id === sectionId ? { ...s, hidden: !s.hidden } : s)))
  const duplicateBandSection = (band, sectionId) => {
    let newId = null
    mutateBand(scene, band, (arr) => {
      if (arr.length >= BAND_MAX) return arr
      const idx = arr.findIndex((s) => s.id === sectionId)
      if (idx < 0) return arr
      newId = newSectionId()
      const copy = { ...arr[idx], id: newId, settings: { ...arr[idx].settings } }
      const next = [...arr]
      next.splice(idx + 1, 0, copy)
      return next
    })
    if (newId) setSelectedId(newId)
    else toast.error(`섹션이 가득 찼어요 (최대 ${BAND_MAX}개)`)
  }
  const updateBandSetting = (sceneKey, band, sectionId) => (key, value) =>
    mutateBand(sceneKey, band, (arr) =>
      arr.some((s) => s.id === sectionId)
        ? arr.map((s) => (s.id === sectionId ? { ...s, settings: { ...s.settings, [key]: value } } : s))
        : arr
    )
  const handleBandDragEnd = (band) => (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    mutateBand(scene, band, (arr) => {
      const oldI = arr.findIndex((s) => s.id === active.id)
      const newI = arr.findIndex((s) => s.id === over.id)
      if (oldI < 0 || newI < 0) return arr
      return arrayMove(arr, oldI, newI)
    })
  }
  // 상↔하단 이동 (설정 보존) — 단일 mutate로 원자적 처리(중간 상태·유실 방지, undo 1회)
  const moveBandSection = (fromBand, sectionId) => {
    const toBand = fromBand === 'headerSections' ? 'footerSections' : 'headerSections'
    const target = toBand === 'headerSections' ? headerSecs : footerSecs
    if (target.length >= BAND_MAX) {
      toast.error(`${toBand === 'headerSections' ? '상단' : '하단'} 섹션이 가득 찼어요 (최대 ${BAND_MAX}개)`)
      return
    }
    mutate((d) => {
      const from = d.scenes?.[scene]?.[fromBand] || []
      const to = d.scenes?.[scene]?.[toBand] || []
      const moved = from.find((s) => s.id === sectionId)
      if (!moved || to.length >= BAND_MAX) return d // 유실 방지: 가득 차면 이동 취소
      return {
        ...d,
        scenes: {
          ...d.scenes,
          [scene]: {
            ...d.scenes?.[scene],
            [fromBand]: from.filter((s) => s.id !== sectionId),
            [toBand]: [...to, moved],
          },
        },
      }
    })
  }

  // 기능 화면(무대·폰Q&A·폰투표·종료) 최초 진입 시 상/하단 기본 섹션 시드 — 로비 프리셋과 동일한 비-dirty 방식.
  // (로고·행사명·해시태그·스폰서 슬롯을 미리 넣어두고, 사용자가 채우거나 숨기거나 삭제)
  // headerSections/footerSections 키가 아예 없을 때만 1회 — 사용자가 모두 지운 뒤엔 재시드 안 함
  useEffect(() => {
    if (!design || !['broadcast', 'qna', 'poll', 'ended'].includes(scene)) return
    const sc = design.scenes?.[scene]
    if (sc?.headerSections !== undefined || sc?.footerSections !== undefined) return
    const seeded = {
      ...design,
      scenes: {
        ...design.scenes,
        [scene]: {
          ...sc,
          headerSections: [
            { id: newSectionId(), type: 'banner', settings: {} }, // 상단 로고/이미지
            { id: newSectionId(), type: 'text', settings: {} }, // 상단 텍스트(회사명·행사명 등)
          ],
          footerSections: [
            { id: newSectionId(), type: 'text', settings: {} }, // 하단 텍스트(안내·해시태그 등)
            { id: newSectionId(), type: 'banner', settings: {} }, // 하단 이미지(스폰서 로고 등)
          ],
        },
      },
    }
    designRef.current = seeded
    setDesign(seeded)
  }, [design, scene])

  const updateTokens = (key, value) =>
    mutate((d) => ({ ...d, tokens: { ...DEFAULT_TOKENS, ...d.tokens, [key]: value } }))

  // 기능 화면(broadcast/qna/poll) 설정 갱신 — design.scenes[sceneKey].settings[key]
  // 함수형(mutate) — 비동기 업로드 완료 시에도 최신 designRef 기준으로 병합
  const updateSceneSettings = (sceneKey) => (key, value) =>
    mutate((d) => ({
      ...d,
      scenes: {
        ...d.scenes,
        [sceneKey]: {
          ...d.scenes?.[sceneKey],
          settings: { ...d.scenes?.[sceneKey]?.settings, [key]: value },
        },
      },
    }))

  // sceneKey는 콜백 생성 시점에 명시 전달 — 비동기 완료 시 장면이 바뀌어도 원래 장면에 적용
  const updateSetting = (sectionId, sceneKey) => (key, value) =>
    mutateSections(sceneKey, (secs) =>
      // 섹션이 삭제됐으면 no-op — 비동기 업로드 완료가 삭제된 섹션을 부활시키지 않도록
      secs.some((s) => s.id === sectionId)
        ? secs.map((s) => (s.id === sectionId ? { ...s, settings: { ...s.settings, [key]: value } } : s))
        : secs
    )

  /* ---------- 파생 값 ---------- */
  const tokens = { ...DEFAULT_TOKENS, ...design?.tokens }
  // 선택 섹션 — 참가/로비는 scene.sections, 기능화면은 header/footerSections 밴드에서 탐색
  const selectedBand =
    selectedId && selectedId !== 'tokens' && selectedId !== 'core'
      ? headerSecs.some((s) => s.id === selectedId)
        ? 'headerSections'
        : footerSecs.some((s) => s.id === selectedId)
          ? 'footerSections'
          : null
      : null
  const selectedSection =
    selectedId && selectedId !== 'tokens' && selectedId !== 'core'
      ? selectedBand
        ? (selectedBand === 'headerSections' ? headerSecs : footerSecs).find((s) => s.id === selectedId)
        : sections.find((s) => s.id === selectedId)
      : null
  const selectedDef = selectedSection ? SECTION_REGISTRY[selectedSection.type] : null

  const saveStatusText = saving
    ? '저장 중…'
    : dirty
      ? '● 미저장'
      : lastSavedAt
        ? `${formatTime(lastSavedAt)} 초안 저장됨`
        : ''

  /* ---------- 렌더 ---------- */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#14161d]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    )
  }
  if (!session || !design) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#14161d] text-slate-400 text-sm">
        세션을 찾을 수 없습니다.
        <Button variant="outline" onClick={() => navigate('/partner/sessions')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 세션 목록으로
        </Button>
      </div>
    )
  }

  // 캔버스 참여 카드 샘플 (비활성 — brand 토큰색, 참여 버튼 문구 반영)
  const sampleJoinCard = (
    <button
      type="button"
      disabled
      className="w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 opacity-90 cursor-default"
      style={{ background: 'var(--lp-brand)', color: 'var(--lp-on-brand)' }}
    >
      {joinCtaLabel(design)} <ArrowRight className="w-4 h-4" />
    </button>
  )

  return (
    <div
      className="flex flex-col bg-[#14161d] text-slate-200"
      // 관리자 보기 배너(sticky)가 떠 있으면 그만큼 빼서 body 스크롤바가 생기지 않게 함
      style={{ height: 'calc(100vh - var(--view-as-banner-height, 0px))' }}
    >
      {/* ═══ 좁은 화면 경고 배너 (lg 미만) ═══ */}
      {showNarrowWarn && (
        <div className="lg:hidden shrink-0 flex items-center gap-2 px-3 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-300 text-xs font-semibold">
          <span className="flex-1 leading-snug">
            ⚠ 에디터는 넓은 화면에 최적화되어 있어요 — PC에서 편집을 권장합니다
          </span>
          <button
            type="button"
            onClick={() => setShowNarrowWarn(false)}
            className="p-1 rounded hover:bg-amber-500/20 text-amber-300 shrink-0"
            title="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ═══ 상단 바 ═══ */}
      <header className="h-12 shrink-0 flex items-center gap-3 px-3 border-b border-[#232733] bg-[#181b24]">
        <button
          type="button"
          onClick={async () => {
            // 미저장 변경분 flush 후 이동 — 마지막 편집 유실 방지
            if (dirtyRef.current) await saveDraft()
            navigate(`/partner/sessions/${id}`)
          }}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> 나가기
        </button>
        <div className="w-px h-5 bg-[#232733]" />
        <div className="text-sm font-bold truncate max-w-[220px]" title={session.title}>
          {session.title}
        </div>

        {/* 장면 칩 — 참가·로비(섹션 편집) | 무대·폰Q&A·폰투표·종료(핵심 고정 + 상/하단 섹션 편집) */}
        <div className="flex items-center gap-1 ml-2">
          {[
            ['enter', '참가'],
            ['lobby', '로비'],
            '|',
            ['broadcast', '송출'],
            ['qna', '폰 Q&A'],
            ['poll', '폰 투표'],
            ['ended', '종료'],
          ].map((chip, i) => {
            if (chip === '|') return <div key={`d${i}`} className="w-px h-4 bg-[#2a2f3d] mx-0.5" />
            const [key, label] = chip
            const meta = SCENE_META[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchScene(key)}
                title={meta ? `${meta.name} — 상/하단 섹션 편집` : undefined}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  scene === key
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                    : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-[#1b1f2a]'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* 기기 토글 */}
        <div className="flex gap-0.5 bg-[#1b1f2a] rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-md ${device === 'mobile' ? 'bg-indigo-500/25 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
            title="모바일 (375px)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-md ${device === 'desktop' ? 'bg-indigo-500/25 text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
            title="데스크톱/PC (100%)"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300"
            title="전체화면 미리보기"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* undo / redo */}
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={undo}
            disabled={undoRef.current.length === 0}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={redoRef.current.length === 0}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            title="다시 실행 (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* 저장 상태 */}
        <span className={`text-[11px] w-28 text-right ${dirty && !saving ? 'text-amber-400' : 'text-slate-500'}`}>
          {saveStatusText}
        </span>

        {/* 게시 히스토리 — 이전 게시본을 초안으로 복원 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={`p-1.5 rounded-md ${showHistory ? 'bg-indigo-500/25 text-indigo-300' : 'text-slate-400 hover:text-slate-200'}`}
            title="게시 히스토리"
          >
            <History className="w-4 h-4" />
          </button>
          {showHistory && (
            <>
              {/* 바깥 클릭 시 닫기 */}
              <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-[#2a2f3d] bg-[#181b24] shadow-2xl p-2">
                <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400">
                  게시 히스토리
                  {publishedAt && (
                    <span className="block font-normal text-slate-500 mt-0.5">
                      현재 게시본 · {formatHistoryAt(publishedAt)} 게시
                    </span>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="px-2 py-3 text-[11px] text-slate-500 leading-relaxed">
                    이전 게시본이 아직 없어요 — 게시할 때마다 여기에 쌓여요.
                  </p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => restoreHistory(i)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-indigo-500/15 hover:text-indigo-200 transition-colors"
                        title="이 게시본을 초안으로 복원"
                      >
                        {i + 1}번째 · {formatHistoryAt(h.at)} 게시본
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowSim(true)}
          title="참가→로비→라이브→송출→종료를 실제 화면처럼 순차 시뮬레이션"
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
        >
          <PlayCircle className="w-3.5 h-3.5" /> 시뮬레이션
        </button>
        <a
          href={`/join/${session.code}?preview=true&design=draft`}
          target="_blank"
          rel="noopener noreferrer"
          title="편집 중인 초안을 새 탭에서 확인"
          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[#2a2f3d] text-slate-300 hover:bg-[#1b1f2a] transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> 새 탭
        </a>
        <Button size="sm" onClick={handlePublish} className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white">
          <Rocket className="w-3.5 h-3.5 mr-1" /> 게시
        </Button>
      </header>

      {/* ═══ 본문 3패널 ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─ 좌측: 테마 + 섹션 리스트 ─ */}
        <aside className="w-56 shrink-0 border-r border-[#232733] bg-[#181b24] flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* 테마 항목 */}
            <div
              onClick={() => setSelectedId('tokens')}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 cursor-pointer transition-colors ${
                selectedId === 'tokens' ? 'border-indigo-500 bg-indigo-500/15' : 'border-transparent hover:bg-[#1b1f2a]'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" style={{ color: tokens.brand }} />
              <span className={`text-xs font-semibold ${selectedId === 'tokens' ? 'text-indigo-200' : 'text-slate-300'}`}>
                브랜드 테마
              </span>
            </div>

            {/* 기능 화면(무대·폰Q&A·폰투표·종료) — 핵심부는 고정, 상/하단은 자유 섹션 편집 */}
            {isBandScene && SCENE_META[scene] && (
              <div className="mt-2 space-y-1">
                {/* ── 상단 섹션 밴드 ── */}
                <div className="flex items-center justify-between px-2 pt-2 pb-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">상단 섹션</span>
                  <button
                    type="button"
                    onClick={() => setBandAddTarget('headerSections')}
                    disabled={headerSecs.length >= BAND_MAX}
                    className="p-0.5 rounded text-slate-500 hover:text-indigo-300 disabled:opacity-30"
                    title="상단에 섹션 추가"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {headerSecs.length === 0 && (
                  <p className="px-2 text-[10px] text-slate-600 leading-snug">+ 로 로고·텍스트·이미지를 넣어보세요</p>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBandDragEnd('headerSections')}>
                  <SortableContext items={headerSecs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {headerSecs.map((sec) => {
                        const def = SECTION_REGISTRY[sec.type]
                        if (!def) return null
                        return (
                          <SortableSectionRow
                            key={sec.id}
                            sec={sec}
                            def={def}
                            selected={selectedId === sec.id}
                            locked={false}
                            onSelect={setSelectedId}
                            onToggleHidden={(id) => toggleBandHidden('headerSections', id)}
                            onDelete={(id) => deleteBandSection('headerSections', id)}
                            onDuplicate={(id) => duplicateBandSection('headerSections', id)}
                            onMove={(id) => moveBandSection('headerSections', id)}
                            moveTitle="하단으로 이동"
                          />
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* ── 핵심 기능부 (고정) ── */}
                <div
                  onClick={() => setSelectedId('core')}
                  className={`mt-1 flex items-center gap-1.5 rounded-lg border px-2 py-2 cursor-pointer transition-colors ${
                    selectedId === 'core' || (!selectedSection && selectedId !== 'tokens')
                      ? 'border-indigo-500 bg-indigo-500/15'
                      : 'border-[#2a2f3d] bg-[#1b1f2a] hover:bg-[#20242f]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" title="핵심 기능부 — 위치 고정" />
                  <span className="text-sm shrink-0">{SCENE_META[scene].icon}</span>
                  <span className="flex-1 min-w-0 truncate text-xs font-semibold text-slate-200">
                    {SCENE_META[scene].name}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 shrink-0">{isEndedScene ? '고정' : '핵심'}</span>
                </div>

                {/* ── 하단 섹션 밴드 ── */}
                <div className="flex items-center justify-between px-2 pt-2 pb-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">하단 섹션</span>
                  <button
                    type="button"
                    onClick={() => setBandAddTarget('footerSections')}
                    disabled={footerSecs.length >= BAND_MAX}
                    className="p-0.5 rounded text-slate-500 hover:text-indigo-300 disabled:opacity-30"
                    title="하단에 섹션 추가"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {footerSecs.length === 0 && (
                  <p className="px-2 text-[10px] text-slate-600 leading-snug">+ 로 안내·해시태그·스폰서를 넣어보세요</p>
                )}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBandDragEnd('footerSections')}>
                  <SortableContext items={footerSecs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      {footerSecs.map((sec) => {
                        const def = SECTION_REGISTRY[sec.type]
                        if (!def) return null
                        return (
                          <SortableSectionRow
                            key={sec.id}
                            sec={sec}
                            def={def}
                            selected={selectedId === sec.id}
                            locked={false}
                            onSelect={setSelectedId}
                            onToggleHidden={(id) => toggleBandHidden('footerSections', id)}
                            onDelete={(id) => deleteBandSection('footerSections', id)}
                            onDuplicate={(id) => duplicateBandSection('footerSections', id)}
                            onMove={(id) => moveBandSection('footerSections', id)}
                            moveTitle="상단으로 이동"
                          />
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

                <p className="px-2 pt-2 text-[10px] text-slate-600 leading-snug">
                  {isEndedScene
                    ? '종료 안내·홈 버튼은 진행 안정성을 위해 고정이에요. 상/하단 섹션만 편집됩니다.'
                    : '핵심 기능부의 세부 설정은 '}
                  {!isEndedScene && <b className="text-slate-400">핵심</b>}
                  {!isEndedScene && ' 항목을 눌러 오른쪽에서 조정하세요.'}
                </p>
              </div>
            )}

            {isSectionScene && (
            <div className="px-2 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {scene === 'enter' ? '참가 페이지 섹션' : '로비 페이지 섹션'}
            </div>
            )}

            {isSectionScene && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortable.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                  {sortable.map((sec) => {
                    const def = SECTION_REGISTRY[sec.type]
                    if (!def) return null
                    return (
                      <SortableSectionRow
                        key={sec.id}
                        sec={sec}
                        def={def}
                        selected={selectedId === sec.id}
                        locked={false}
                        onSelect={setSelectedId}
                        onToggleHidden={toggleHidden}
                        onDelete={deleteSection}
                      />
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
            )}

            {/* lockedLast(joinCard) — 드래그 제외, 항상 마지막 고정 */}
            {isSectionScene && locked.map((sec) => {
              const def = SECTION_REGISTRY[sec.type]
              if (!def) return null
              return (
                <SectionRowBody
                  key={sec.id}
                  sec={sec}
                  def={def}
                  selected={selectedId === sec.id}
                  locked
                  onSelect={setSelectedId}
                  onToggleHidden={toggleHidden}
                  onDelete={deleteSection}
                />
              )
            })}
          </div>

          {isSectionScene && (
          <div className="p-2 border-t border-[#232733]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddDialog(true)}
              disabled={sections.length >= MAX_SECTIONS}
              className="w-full h-8 text-xs border-[#2a2f3d] bg-transparent text-slate-300 hover:bg-[#1b1f2a] hover:text-slate-100"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> 섹션 추가
            </Button>
            {sections.length >= MAX_SECTIONS && (
              <p className="text-[10px] text-slate-500 mt-1 text-center">장면당 최대 {MAX_SECTIONS}개</p>
            )}
          </div>
          )}
        </aside>

        {/* ─ 중앙: 캔버스 ─ (전체화면이면 화면 전체를 덮는 오버레이) */}
        <main
          className={`bg-[#0e1015] p-4 flex justify-center overflow-hidden ${
            fullscreen ? 'fixed inset-x-0 bottom-0 z-50 pt-14' : 'flex-1 min-w-0'
          }`}
          // 전체화면 오버레이는 관리자 배너 아래에서 시작 (배너가 오버레이를 가리지 않게)
          style={fullscreen ? { top: 'var(--view-as-banner-height, 0px)' } : undefined}
          onClick={() => setSelectedId(null)}
        >
          {fullscreen && (
            <div
              className="fixed left-0 right-0 h-12 bg-[#14161d] border-b border-[#232733] flex items-center justify-between px-4 z-10"
              style={{ top: 'var(--view-as-banner-height, 0px)' }}
            >
              <span className="text-xs font-semibold text-slate-300">전체화면 미리보기 · {device === 'mobile' ? '모바일' : 'PC/프로젝터'}</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 bg-[#1b1f2a] rounded-lg p-0.5">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDevice('mobile') }} className={`p-1.5 rounded-md ${device === 'mobile' ? 'bg-indigo-500/25 text-indigo-300' : 'text-slate-500'}`} title="모바일"><Smartphone className="w-4 h-4" /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setDevice('desktop') }} className={`p-1.5 rounded-md ${device === 'desktop' ? 'bg-indigo-500/25 text-indigo-300' : 'text-slate-500'}`} title="PC/프로젝터"><Monitor className="w-4 h-4" /></button>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFullscreen(false) }} className="p-1.5 rounded-md text-slate-400 hover:text-white bg-[#1b1f2a]" title="닫기"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}
          <PreviewFrame
            className="h-full bg-white rounded-lg shadow-2xl border-0 transition-all duration-300"
            style={{ width: device === 'mobile' ? '375px' : '100%' }}
          >
            {isBandScene ? (
              // 기능 화면: 핵심부 고정 + 상/하단 자유 섹션 밴드 실시간 미리보기
              (() => {
                const dtok = deriveTokens(design?.tokens)
                const bandData = { session, presenters, cues }
                const hBand = (
                  <SectionBand
                    editable
                    sections={headerSecs}
                    tokens={dtok}
                    data={bandData}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )
                const fBand = (
                  <SectionBand
                    editable
                    sections={footerSecs}
                    tokens={dtok}
                    data={bandData}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                )
                const common = { tokens: dtok, headerBand: hBand, footerBand: fBand }
                return scene === 'broadcast' ? (
                  <BroadcastPreview settings={sceneSettings(design, 'broadcast')} {...common} />
                ) : scene === 'qna' ? (
                  <QnaPreview settings={sceneSettings(design, 'qna')} {...common} />
                ) : scene === 'poll' ? (
                  <PollPreview settings={sceneSettings(design, 'poll')} {...common} />
                ) : (
                  // 종료: 핵심 안내는 고정(EndedView), 상/하단만 밴드 편집
                  <div className="lp-audience flex flex-col min-h-screen" style={dtok.cssVars}>
                    {hBand}
                    <div className="flex-1">
                      <EndedView
                        session={session}
                        navigate={() => {}}
                        template={null}
                        assets={{}}
                        embedded
                        designTokens={design?.tokens}
                      />
                    </div>
                    {fBand}
                  </div>
                )
              })()
            ) : (
              // 참가·로비: 섹션 편집 캔버스. 빈 곳 클릭 시 선택 해제
              <div style={{ minHeight: '100vh' }} onClick={() => setSelectedId(null)}>
                <SectionRenderer
                  design={design}
                  scene={scene}
                  editable
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  data={{ session, presenters, cues }}
                  slots={{ joinCard: sampleJoinCard }}
                />
              </div>
            )}
          </PreviewFrame>
        </main>

        {/* ─ 우측: 인스펙터 ─ */}
        <aside className="w-72 shrink-0 border-l border-[#232733] bg-[#181b24] overflow-y-auto">
          {selectedId === 'tokens' ? (
            /* 브랜드 테마 편집 — 라벨은 DEFAULT_TOKENS 키(brand/surface/radius/density)와 일치 */
            <div className="p-4 space-y-5">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" /> 브랜드 테마
              </div>
              <div>
                <FieldLabel>브랜드 색 (brand)</FieldLabel>
                <ColorInput value={tokens.brand} onChange={(v) => updateTokens('brand', v)} />
                <div className="flex gap-1.5 mt-2">
                  {BRAND_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateTokens('brand', c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        tokens.brand === c ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
                {/* 접근성 — 버튼 텍스트(on-brand) 대비 경고 (WCAG AA 4.5:1) */}
                {(() => {
                  const onBrand = contrastRatio(tokens.brand, '#ffffff') >= contrastRatio(tokens.brand, '#1b2130') ? '#ffffff' : '#1b2130'
                  const ratio = contrastRatio(tokens.brand, onBrand)
                  return ratio < 4.5 ? (
                    <p className="mt-2 text-[10px] text-amber-400 leading-relaxed">
                      ⚠ 이 색은 버튼 위 글자 대비가 낮아요 ({ratio.toFixed(1)}:1). 조금 더 진하거나 연한 색을 권장해요.
                    </p>
                  ) : null
                })()}
              </div>
              <div>
                <FieldLabel>화면 톤 (surface)</FieldLabel>
                <Segment
                  value={tokens.surface}
                  options={[['light', '라이트'], ['dark', '다크']]}
                  onChange={(v) => updateTokens('surface', v)}
                />
              </div>
              <div>
                <FieldLabel>모서리 (radius)</FieldLabel>
                <Segment
                  value={tokens.radius}
                  options={[['flat', '각짐'], ['default', '기본'], ['round', '둥글']]}
                  onChange={(v) => updateTokens('radius', v)}
                />
              </div>
              <div>
                <FieldLabel>여백 밀도 (density)</FieldLabel>
                <Segment
                  value={tokens.density}
                  options={[['compact', '콤팩트'], ['default', '기본'], ['roomy', '넉넉']]}
                  onChange={(v) => updateTokens('density', v)}
                />
              </div>

              {/* ── 타이포그래피 (제목/본문 2트랙) ── */}
              <div className="pt-4 border-t border-[#232733] space-y-4">
                <div className="text-[11px] font-semibold text-slate-400">타이포그래피</div>

                <div>
                  <FieldLabel>본문 폰트</FieldLabel>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(FONT_STACKS)
                      .filter(([, f]) => f.body)
                      .map(([key, f]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateTokens('font', key)}
                          className={`text-left px-2.5 py-1.5 rounded-md text-sm border transition-colors ${
                            (tokens.font || 'pretendard') === key
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                              : 'border-[#2a2f3d] text-slate-300 hover:border-slate-500'
                          }`}
                          style={{ fontFamily: f.stack }}
                        >
                          {f.label} <span className="opacity-60">· 가나다 AaBb</span>
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>제목 폰트</FieldLabel>
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      type="button"
                      onClick={() => updateTokens('titleFont', 'inherit')}
                      className={`text-left px-2.5 py-1.5 rounded-md text-sm border transition-colors ${
                        (tokens.titleFont || 'inherit') === 'inherit'
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                          : 'border-[#2a2f3d] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      본문과 동일
                    </button>
                    {Object.entries(FONT_STACKS)
                      .filter(([, f]) => f.title)
                      .map(([key, f]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateTokens('titleFont', key)}
                          className={`text-left px-2.5 py-1.5 rounded-md text-sm border transition-colors ${
                            tokens.titleFont === key
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                              : 'border-[#2a2f3d] text-slate-300 hover:border-slate-500'
                          }`}
                          style={{ fontFamily: f.stack }}
                        >
                          {f.label} <span className="opacity-60">· 제목미리보기</span>
                          {!f.body && <span className="ml-1 text-[10px] text-amber-400/80">임팩트</span>}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>글자 크기 (본문 기준)</FieldLabel>
                  <Segment
                    value={tokens.fontScale || 'default'}
                    options={[['sm', '작게'], ['default', '기본'], ['lg', '크게']]}
                    onChange={(v) => updateTokens('fontScale', v)}
                  />
                </div>
                <div>
                  <FieldLabel>본문 행간</FieldLabel>
                  <Segment
                    value={tokens.lineHeight || 'default'}
                    options={[['compact', '좁게'], ['default', '기본'], ['relaxed', '넓게']]}
                    onChange={(v) => updateTokens('lineHeight', v)}
                  />
                </div>
                <div>
                  <FieldLabel>제목 자간</FieldLabel>
                  <Segment
                    value={tokens.titleSpacing || 'normal'}
                    options={[['tight', '좁게'], ['normal', '기본'], ['wide', '넓게']]}
                    onChange={(v) => updateTokens('titleSpacing', v)}
                  />
                </div>
              </div>

              {/* ── 페이지 배경 ── */}
              <div className="pt-4 border-t border-[#232733] space-y-3">
                <div className="text-[11px] font-semibold text-slate-400">페이지 배경</div>
                <Segment
                  value={tokens.pageBg?.type || 'none'}
                  options={[['none', '없음'], ['color', '단색'], ['gradient', '그라데이션'], ['image', '이미지']]}
                  onChange={(v) =>
                    updateTokens('pageBg', v === 'none' ? null : { ...(tokens.pageBg || {}), type: v })
                  }
                />
                {tokens.pageBg?.type === 'color' && (
                  <ColorInput
                    value={tokens.pageBg.color || '#f8fafc'}
                    onChange={(v) => updateTokens('pageBg', { ...tokens.pageBg, color: v })}
                  />
                )}
                {tokens.pageBg?.type === 'gradient' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(PAGE_GRADIENTS).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateTokens('pageBg', { ...tokens.pageBg, preset: key })}
                          className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                            (tokens.pageBg.preset || 'brandSoft') === key
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                              : 'border-[#2a2f3d] text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {tokens.pageBg.preset === 'custom' && (
                      <div className="rounded-lg border border-[#2a2f3d] p-2.5 space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <FieldLabel>시작 색</FieldLabel>
                            <ColorInput
                              value={tokens.pageBg.from || tokens.brand || '#4f46e5'}
                              onChange={(c) => updateTokens('pageBg', { ...tokens.pageBg, from: c })}
                            />
                          </div>
                          <div className="flex-1">
                            <FieldLabel>끝 색</FieldLabel>
                            <ColorInput
                              value={tokens.pageBg.to || '#f8fafc'}
                              onChange={(c) => updateTokens('pageBg', { ...tokens.pageBg, to: c })}
                            />
                          </div>
                        </div>
                        <div>
                          <FieldLabel>방향 · {tokens.pageBg.angle ?? 180}°</FieldLabel>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="15"
                            value={tokens.pageBg.angle ?? 180}
                            onChange={(e) => updateTokens('pageBg', { ...tokens.pageBg, angle: Number(e.target.value) })}
                            className="w-full accent-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {tokens.pageBg?.type === 'image' && (
                  <div className="space-y-2">
                    <ImageInput
                      value={tokens.pageBg.url}
                      onChange={(url) => updateTokens('pageBg', { ...tokens.pageBg, url })}
                      sessionId={session.id}
                    />
                    {tokens.pageBg.url && (
                      <div>
                        <FieldLabel>어둡게 (오버레이 {tokens.pageBg.overlay ?? 40}%)</FieldLabel>
                        <input
                          type="range"
                          min="0"
                          max="60"
                          step="5"
                          value={tokens.pageBg.overlay ?? 40}
                          onChange={(e) => updateTokens('pageBg', { ...tokens.pageBg, overlay: Number(e.target.value) })}
                          className="w-full accent-indigo-500"
                        />
                        <p className="text-[10px] text-slate-500">텍스트가 잘 보이도록 배경을 어둡게 덮어요</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                브랜드 색 하나로 버튼·포인트·파생 색이 자동 계산돼요. 폰트·크기·배경은 모든 섹션에 일괄 적용됩니다.
              </p>

              {/* 내 테마 — localStorage 저장/적용 (v1) */}
              <div className="pt-4 border-t border-[#232733] space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">내 테마</div>
                {myThemes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {myThemes.map((t) => (
                      <span
                        key={t.name}
                        className="inline-flex items-center gap-0.5 rounded-full border border-[#2a2f3d] pl-1.5 pr-1 py-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => applyMyTheme(t)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-indigo-300 transition-colors"
                          title="이 테마 적용 (Ctrl+Z로 되돌릴 수 있어요)"
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ background: t.tokens?.brand }}
                          />
                          {t.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMyTheme(t.name)}
                          className="p-0.5 rounded-full text-slate-600 hover:text-rose-400 transition-colors"
                          title="테마 삭제"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveMyTheme}
                  className="w-full h-8 text-xs border-[#2a2f3d] bg-transparent text-slate-300 hover:bg-[#1b1f2a] hover:text-slate-100"
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> 현재 테마 저장
                </Button>
                <p className="text-[10px] text-slate-500">이 브라우저에 저장돼요 (최대 {MAX_THEMES}개)</p>
              </div>
            </div>
          ) : isCoreScene && SCENE_META[scene] && !selectedSection ? (
            /* 기능 화면 핵심부 설정 — SCENE_META schema 자동 렌더 (섹션 인스펙터와 동일 컴포넌트 재사용) */
            <div className="p-4 space-y-4">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>{SCENE_META[scene].icon}</span> {SCENE_META[scene].name}
              </div>
              {(() => {
                const settings = sceneSettings(design, scene)
                const onChange = updateSceneSettings(scene)
                return Object.entries(SCENE_META[scene].schema).map(([key, field]) => (
                  <InspectorField
                    key={key}
                    fieldKey={key}
                    field={field}
                    settings={settings}
                    brand={tokens.brand}
                    sessionId={session.id}
                    onChange={onChange}
                  />
                ))
              })()}
              <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-[#232733]">
                💡 {SCENE_META[scene].previewNote}
              </p>
            </div>
          ) : selectedSection && selectedDef ? (
            /* 섹션 설정 — registry schema 자동 렌더 */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>{selectedDef.icon}</span> {selectedDef.name}
                </div>
                {selectedDef.required && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    이 섹션은 필수예요
                  </span>
                )}
              </div>
              {(() => {
                const settings = { ...selectedDef.defaults, ...selectedSection.settings }
                const onChange = selectedBand
                  ? updateBandSetting(scene, selectedBand, selectedSection.id)
                  : updateSetting(selectedSection.id, scene)
                return Object.entries(selectedDef.schema).map(([key, field]) => (
                  <InspectorField
                    key={key}
                    fieldKey={key}
                    field={field}
                    settings={settings}
                    brand={tokens.brand}
                    sessionId={session.id}
                    onChange={onChange}
                    onBgImage={handleBgImageSet(selectedSection.id, scene)}
                  />
                ))
              })()}
              {selectedDef.note && (
                <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-[#232733]">
                  💡 {selectedDef.note}
                </p>
              )}
            </div>
          ) : isEndedScene ? (
            <div className="p-6 text-center text-xs text-slate-500 leading-relaxed space-y-3">
              <p>
                종료 화면의 <b className="text-slate-300">핵심 안내·홈 버튼</b>은 진행 안정성을 위해 고정이에요.
                <br />
                상/하단 섹션을 추가해 감사 인사·후속 링크·스폰서를 넣어보세요.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedId('tokens')}
                className="h-8 text-xs border-[#2a2f3d] bg-transparent text-slate-300 hover:bg-[#1b1f2a] hover:text-slate-100"
              >
                <Palette className="w-3.5 h-3.5 mr-1" /> 브랜드 테마 편집
              </Button>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 leading-relaxed">
              캔버스에서 섹션을 클릭하거나
              <br />
              좌측 리스트에서 항목을 선택하세요.
            </div>
          )}
        </aside>
      </div>

      {/* ═══ 섹션 추가 다이얼로그 ═══ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md bg-[#181b24] border-[#232733] text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">섹션 추가</DialogTitle>
            <DialogDescription className="text-slate-500">
              {scene === 'enter' ? '참가' : '로비'} 페이지에 추가할 섹션을 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {/* joinCard는 enter 전용(required — 항상 존재, 라이브러리 비노출) · 로비에서도 비노출 */}
            {Object.entries(SECTION_REGISTRY)
              .filter(([type, def]) => !def.required && !(scene !== 'enter' && type === 'joinCard'))
              .map(([type, def]) => {
                const count = sections.filter((s) => s.type === type).length
                const maxed =
                  (def.maxPerScene && count >= def.maxPerScene) || sections.length >= MAX_SECTIONS
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={maxed}
                    onClick={() => addSection(type)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      maxed
                        ? 'border-[#232733] opacity-40 cursor-not-allowed'
                        : 'border-[#2a2f3d] hover:border-indigo-500 hover:bg-indigo-500/10'
                    }`}
                  >
                    <div className="text-lg mb-1">{def.icon}</div>
                    <div className="text-xs font-bold text-slate-200">{def.name}</div>
                    {def.note && <div className="text-[10px] text-slate-500 mt-1 leading-snug">{def.note}</div>}
                    {def.maxPerScene && count >= def.maxPerScene && (
                      <div className="text-[10px] text-amber-500 mt-1">최대 {def.maxPerScene}개</div>
                    )}
                  </button>
                )
              })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ 기능 화면 밴드 섹션 추가 다이얼로그 ═══ */}
      <Dialog open={!!bandAddTarget} onOpenChange={(v) => !v && setBandAddTarget(null)}>
        <DialogContent className="sm:max-w-md bg-[#181b24] border-[#232733] text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {bandAddTarget === 'headerSections' ? '상단' : '하단'} 섹션 추가
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {SCENE_META[scene]?.name} 핵심부 {bandAddTarget === 'headerSections' ? '위' : '아래'}에 넣을 섹션을 골라요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {SCENE_BAND_SECTIONS.map((type) => {
              const def = SECTION_REGISTRY[type]
              if (!def) return null
              // maxPerScene(hero·schedule·presenters=1)는 상/하단 합산 기준으로 제한
              const count = [...headerSecs, ...footerSecs].filter((s) => s.type === type).length
              const maxed = def.maxPerScene && count >= def.maxPerScene
              return (
                <button
                  key={type}
                  type="button"
                  disabled={maxed}
                  onClick={() => addBandSection(bandAddTarget, type)}
                  className={`text-left rounded-xl border p-3 transition-colors ${
                    maxed
                      ? 'border-[#232733] opacity-40 cursor-not-allowed'
                      : 'border-[#2a2f3d] hover:border-indigo-500 hover:bg-indigo-500/10'
                  }`}
                >
                  <div className="text-lg mb-1">{def.icon}</div>
                  <div className="text-xs font-bold text-slate-200">{def.name}</div>
                  {def.note && <div className="text-[10px] text-slate-500 mt-1 leading-snug">{def.note}</div>}
                  {maxed && <div className="text-[10px] text-amber-500 mt-1">이미 추가됨</div>}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ 전체 흐름 시뮬레이션 모달 (풀스크린) ═══ */}
      {showSim && (
        <div className="fixed inset-0 z-[80] bg-white dark:bg-slate-900 flex flex-col">
          <DesignSimulator
            session={session}
            design={design}
            presenters={presenters}
            cues={cues}
            template={null}
            assets={{}}
            onClose={() => setShowSim(false)}
          />
        </div>
      )}

      {/* ═══ 시작 다이얼로그 — 신규 세션 프리셋 갤러리 ═══ */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="sm:max-w-lg bg-[#181b24] border-[#232733] text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-slate-100">어떤 분위기로 시작할까요?</DialogTitle>
            <DialogDescription className="text-slate-500">
              브랜드 색을 고르면 프리셋 미리보기가 그 색으로 바뀌어요. 시작 후 얼마든지 수정할 수 있어요.
            </DialogDescription>
          </DialogHeader>

          {/* 브랜드 색 선택 — 카드 3개가 즉시 리컬러 */}
          <div>
            <FieldLabel>브랜드 색</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={startBrand}
                onChange={(e) => setStartBrand(e.target.value)}
                className="h-8 w-12 rounded border border-[#2a2f3d] bg-transparent cursor-pointer p-0.5"
              />
              <div className="flex gap-1.5">
                {START_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStartBrand(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      startBrand === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 프리셋 카드 3종 */}
          <div className="grid grid-cols-3 gap-2">
            {START_PRESETS.map(([code, name, desc]) => (
              <PresetCard key={code} code={code} name={name} desc={desc} brand={startBrand} onClick={() => startWithPreset(code)} />
            ))}
          </div>

          <button
            type="button"
            onClick={startBlank}
            className="mx-auto text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
          >
            빈 페이지로 시작 (히어로 + 참여 카드만)
          </button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
