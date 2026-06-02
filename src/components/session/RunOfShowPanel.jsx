import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  FileText,
  BarChart3,
  MessageCircle,
  Megaphone,
  Plus,
  Play,
  Radio,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

/**
 * 강연 진행 플랜 (큐시트 / Run-of-show)
 * - 강사별로 (강연자료/설문/Q&A/안내) 큐를 순서대로 구성
 * - 큐 클릭 = 선택·미리보기 (송출 X)
 * - live=true 일 때 각 큐의 "송출" 버튼으로만 청중 화면에 올라감
 *
 * props:
 *  - sessionId
 *  - live (boolean)            : 콕핏(true)이면 송출 버튼 노출, 준비 편집(false)이면 미노출
 *  - selectedCueId             : 현재 선택된 큐 (미리보기용)
 *  - currentCueId              : 현재 송출 중인 큐 (sessions.current_cue_id)
 *  - onSelect(cue)             : 큐 선택 콜백
 *  - onBroadcast()             : 송출 후 부모 갱신 트리거 (옵션)
 */

function stripHtml(s) {
  if (!s) return ''
  const div = document.createElement('div')
  div.innerHTML = s
  return div.textContent || div.innerText || ''
}

/** Date → "09:05" (24시간) */
function fmtClock(date) {
  if (!date || isNaN(date.getTime())) return '--:--'
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** 분 → "15분" / "1시간 5분" */
function fmtDuration(min) {
  if (!min || min <= 0) return null
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}시간 ${m}분`
  if (h) return `${h}시간`
  return `${m}분`
}

const CUE_META = {
  pdf: { label: '강연자료', icon: FileText, color: 'text-indigo-500', chip: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40' },
  survey: { label: '설문', icon: BarChart3, color: 'text-emerald-500', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  qna: { label: 'Q&A', icon: MessageCircle, color: 'text-sky-500', chip: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  notice: { label: '안내', icon: Megaphone, color: 'text-amber-500', chip: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
}

function cueSummary(cue) {
  if (cue.cue_type === 'pdf') return `${cue.lecture_title || '자료 미지정'}${cue.lecture_page_count ? '' : ''} · p.${cue.start_page || 1}`
  if (cue.cue_type === 'survey') return stripHtml(cue.poll_question) || '설문 미지정'
  if (cue.cue_type === 'qna') return cue.qna_category_name ? `카테고리: ${cue.qna_category_name}` : '전체 질문'
  if (cue.cue_type === 'notice') return cue.notice_text || '안내 문구 없음'
  return ''
}

function SortableCueCard({ cue, index, time, showPresenterHeader, live, editable, selected, broadcasting, onSelect, onBroadcast, onEdit, onDelete }) {
  const meta = CUE_META[cue.cue_type] || CUE_META.notice
  const Icon = meta.icon
  const durationLabel = fmtDuration(cue.duration_min)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cue.id, disabled: !editable })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style}>
      {showPresenterHeader && (
        <div className="px-1 pt-3 pb-1 text-xs font-bold text-slate-400 dark:text-slate-500">
          {cue.presenter_name || '공통 · 미지정'}
        </div>
      )}
      <div
        onClick={() => onSelect?.(cue)}
        className={`group rounded-xl border p-2.5 flex items-center gap-2 cursor-pointer transition-colors ${
          broadcasting
            ? 'border-rose-400 bg-rose-50/60 dark:bg-rose-950/30 dark:border-rose-700'
            : selected
              ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 dark:border-indigo-700'
              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        {editable && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 shrink-0"
            title="순서 변경"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        {(time?.start || durationLabel) && (
          <span className="shrink-0 w-12 text-right leading-tight">
            {time?.start && (
              <span className="block text-xs font-bold tabular-nums text-slate-700 dark:text-slate-200">{fmtClock(time.start)}</span>
            )}
            {durationLabel && (
              <span className="block text-[10px] text-slate-400 dark:text-slate-500">{durationLabel}</span>
            )}
          </span>
        )}
        <span className={`shrink-0 ${meta.color}`}><Icon className="w-4 h-4" /></span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.chip}`}>{meta.label}</span>
            {cue.title && <span className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">{cue.title}</span>}
            {broadcasting && <span className="text-[10px] font-bold text-rose-600 dark:text-rose-300 flex items-center gap-0.5"><Radio className="w-3 h-3" /> 송출 중</span>}
          </span>
          <span className="block text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{cueSummary(cue)}</span>
        </span>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {live && (
            <Button
              type="button"
              size="sm"
              onClick={() => onBroadcast?.(cue)}
              className={broadcasting
                ? 'h-7 px-2 bg-rose-500 hover:bg-rose-600 text-white'
                : 'h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white'}
              title="이 큐 송출하기"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="ml-1 text-xs">송출</span>
            </Button>
          )}
          {editable && (
            <>
              <button type="button" onClick={() => onEdit?.(cue)} className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" title="편집">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => onDelete?.(cue)} className="p-1.5 rounded text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" title="삭제">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  id: null,
  cue_type: 'pdf',
  presenter_id: 'none',
  title: '',
  lecture_file_id: 'none',
  start_page: 1,
  poll_id: 'none',
  qna_category_id: 'none',
  notice_text: '',
  duration_min: '',
}

export default function RunOfShowPanel({ sessionId, live = false, editable = true, selectedCueId = null, currentCueId = null, onSelect, onBroadcast }) {
  const [cues, setCues] = useState([])
  const [baseStartAt, setBaseStartAt] = useState(null)
  const [presenters, setPresenters] = useState([])
  const [lectures, setLectures] = useState([])
  const [polls, setPolls] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const loadCues = useCallback(async () => {
    if (!sessionId) return
    const { data } = await supabase.rpc('sp_partner_cues_q', { p_session_id: sessionId })
    setCues(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [sessionId])

  const loadRefs = useCallback(async () => {
    if (!sessionId) return
    const [sess, pr, lec, pl, cat] = await Promise.all([
      // 기준 시작시각 = 세션 예정 시작(start_at). 큐별 시작시각은 여기에 소요시간 누적으로 계산.
      supabase.from('sessions').select('start_at').eq('id', sessionId).maybeSingle(),
      // 강사 = 세션에 등록된 발표자(session_presenters). cue.presenter_id FK가 이걸 가리킴.
      supabase
        .from('session_presenters')
        .select('id, display_name, manual_name, display_order')
        .eq('session_id', sessionId)
        .order('display_order'),
      supabase.rpc('sp_partner_lectures_q', { p_session_id: sessionId }),
      supabase.rpc('sp_partner_polls_q', { p_session_id: sessionId }),
      supabase.rpc('sp_partner_qna_categories_q', { p_session_id: sessionId }),
    ])
    setBaseStartAt(sess.data?.start_at ? new Date(sess.data.start_at) : null)
    setPresenters(Array.isArray(pr.data) ? pr.data : [])
    setLectures(Array.isArray(lec.data) ? lec.data : [])
    setPolls(Array.isArray(pl.data) ? pl.data : (pl.data?.polls || []))
    setCategories(Array.isArray(cat.data) ? cat.data : [])
  }, [sessionId])

  useEffect(() => {
    loadCues()
    loadRefs()
  }, [loadCues, loadRefs])

  /* ---------- 큐별 시작/종료 시각 누적 계산 (파생값) ----------
   * 시작시각 = baseStartAt + 앞 큐들의 duration_min 합. 종료시각 = 시작 + 자기 duration_min.
   * duration 미설정(NULL) 큐는 0분으로 취급 → 다음 큐가 같은 시각에 시작.       */
  const timeline = useMemo(() => {
    let offset = 0 // 분
    return cues.map((cue) => {
      const dur = Number(cue.duration_min) || 0
      const start = baseStartAt ? new Date(baseStartAt.getTime() + offset * 60000) : null
      offset += dur
      const end = baseStartAt && dur > 0 ? new Date(baseStartAt.getTime() + offset * 60000) : null
      return { start, end }
    })
  }, [cues, baseStartAt])

  const totalMin = useMemo(
    () => cues.reduce((sum, c) => sum + (Number(c.duration_min) || 0), 0),
    [cues]
  )
  const planEnd = baseStartAt && totalMin > 0 ? new Date(baseStartAt.getTime() + totalMin * 60000) : null

  const presenterName = (id) => {
    const p = presenters.find((x) => x.id === id)
    return p ? (p.display_name || p.manual_name) : null
  }

  /* ---------- 송출 ---------- */
  const handleBroadcast = async (cue) => {
    const { data, error } = await supabase.rpc('sp_partner_cue_broadcast_s', {
      p_session_id: sessionId,
      p_cue_id: cue.id,
    })
    if (error || !data?.success) {
      toast.error('송출 실패')
      return
    }
    toast.success('청중 화면에 송출했습니다')
    onSelect?.(cue)
    onBroadcast?.(cue)
  }

  /* ---------- 다이얼로그 ---------- */
  const openCreate = () => { setForm(EMPTY_FORM); setShowDialog(true) }
  const openEdit = (cue) => {
    setForm({
      id: cue.id,
      cue_type: cue.cue_type,
      presenter_id: cue.presenter_id || 'none',
      title: cue.title || '',
      lecture_file_id: cue.lecture_file_id || 'none',
      start_page: cue.start_page || 1,
      poll_id: cue.poll_id || 'none',
      qna_category_id: cue.qna_category_id || 'none',
      notice_text: cue.notice_text || '',
      duration_min: cue.duration_min ?? '',
    })
    setShowDialog(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const params = {
        p_action: form.id ? 'update' : 'create',
        p_session_id: sessionId,
        p_cue_id: form.id,
        p_presenter_id: form.presenter_id === 'none' ? null : form.presenter_id,
        p_cue_type: form.cue_type,
        p_title: form.title?.trim() || null,
        p_lecture_file_id: form.cue_type === 'pdf' && form.lecture_file_id !== 'none' ? form.lecture_file_id : null,
        p_start_page: form.cue_type === 'pdf' ? Number(form.start_page) || 1 : null,
        p_poll_id: form.cue_type === 'survey' && form.poll_id !== 'none' ? form.poll_id : null,
        p_qna_category_id: form.cue_type === 'qna' && form.qna_category_id !== 'none' ? form.qna_category_id : null,
        p_notice_text: form.cue_type === 'notice' ? (form.notice_text?.trim() || null) : null,
        p_duration_min: form.duration_min === '' || form.duration_min == null ? null : Math.max(0, Number(form.duration_min) || 0),
      }
      const { data, error } = await supabase.rpc('sp_partner_cue_s', params)
      if (error || !data?.success) throw new Error(data?.message || 'save failed')
      toast.success(form.id ? '큐를 수정했습니다' : '큐를 추가했습니다')
      setShowDialog(false)
      loadCues()
    } catch (err) {
      console.error(err)
      toast.error('저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cue) => {
    if (!confirm('이 큐를 삭제할까요?')) return
    const { data, error } = await supabase.rpc('sp_partner_cue_s', {
      p_action: 'delete', p_session_id: sessionId, p_cue_id: cue.id,
    })
    if (error || !data?.success) { toast.error('삭제 실패'); return }
    setCues((prev) => prev.filter((c) => c.id !== cue.id))
  }

  const handleDragEnd = async (event) => {
    if (!editable) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cues.findIndex((c) => c.id === active.id)
    const newIndex = cues.findIndex((c) => c.id === over.id)
    const next = arrayMove(cues, oldIndex, newIndex)
    setCues(next)
    const orders = next.map((c, i) => ({ id: c.id, display_order: i }))
    const { error } = await supabase.rpc('sp_partner_cue_s', {
      p_action: 'reorder', p_session_id: sessionId, p_orders: orders,
    })
    if (error) { toast.error('순서 저장 실패'); loadCues() }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Play className="w-4 h-4 text-indigo-600 fill-current" /> 진행 플랜
          </h2>
          {baseStartAt && totalMin > 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 tabular-nums">
              <Clock className="w-3 h-3" /> {fmtClock(baseStartAt)} 시작 · 총 {fmtDuration(totalMin)}
              {planEnd && <> · {fmtClock(planEnd)} 종료</>}
            </p>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{editable ? '강사별 순서를 짜세요' : '큐를 선택해 송출하세요'}</p>
          )}
        </div>
        {editable && (
          <Button type="button" size="sm" variant="outline" onClick={openCreate} className="h-8">
            <Plus className="w-4 h-4 mr-1" /> 큐
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
        ) : cues.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 dark:text-slate-500">
            아직 큐가 없습니다.<br />{editable ? '"+ 큐"로 강연 순서를 추가하세요.' : '준비 → 진행 순서에서 먼저 구성하세요.'}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cues.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {cues.map((cue, i) => (
                  <SortableCueCard
                    key={cue.id}
                    cue={cue}
                    index={i}
                    time={timeline[i]}
                    showPresenterHeader={i === 0 || cues[i - 1].presenter_id !== cue.presenter_id}
                    live={live}
                    editable={editable}
                    selected={selectedCueId === cue.id}
                    broadcasting={currentCueId === cue.id}
                    onSelect={onSelect}
                    onBroadcast={handleBroadcast}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 큐 추가/편집 다이얼로그 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? '큐 편집' : '큐 추가'}</DialogTitle>
            <DialogDescription>강연 진행 순서의 한 단계를 구성합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 종류 */}
            <div className="space-y-1.5">
              <Label>종류</Label>
              <Select value={form.cue_type} onValueChange={(v) => setForm((f) => ({ ...f, cue_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">강연자료 (PDF)</SelectItem>
                  <SelectItem value="survey">설문</SelectItem>
                  <SelectItem value="qna">Q&amp;A 세그먼트</SelectItem>
                  <SelectItem value="notice">안내 (인트로/휴식)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 강사 */}
            <div className="space-y-1.5">
              <Label>강사 (선택)</Label>
              <Select value={form.presenter_id} onValueChange={(v) => setForm((f) => ({ ...f, presenter_id: v }))}>
                <SelectTrigger><SelectValue placeholder="공통 / 미지정" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">공통 / 미지정</SelectItem>
                  {presenters.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name || p.manual_name || '강사'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 제목 + 소요시간 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1.5">
                <Label>제목 (선택)</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="예: 오프닝, Q&A 1" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> 소요(분)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.duration_min}
                  onChange={(e) => setForm((f) => ({ ...f, duration_min: e.target.value }))}
                  placeholder="예: 15"
                />
              </div>
            </div>

            {/* 종류별 입력 */}
            {form.cue_type === 'pdf' && (
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1.5">
                  <Label>강연자료</Label>
                  <Select value={form.lecture_file_id} onValueChange={(v) => setForm((f) => ({ ...f, lecture_file_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="자료 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">선택 안 함</SelectItem>
                      {lectures.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.title} ({l.page_count || '?'}p)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>시작 p.</Label>
                  <Input type="number" min={1} value={form.start_page} onChange={(e) => setForm((f) => ({ ...f, start_page: e.target.value }))} />
                </div>
              </div>
            )}

            {form.cue_type === 'survey' && (
              <div className="space-y-1.5">
                <Label>설문</Label>
                <Select value={form.poll_id} onValueChange={(v) => setForm((f) => ({ ...f, poll_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="설문 선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안 함</SelectItem>
                    {polls.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{stripHtml(p.question) || '설문'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.cue_type === 'qna' && (
              <div className="space-y-1.5">
                <Label>카테고리 필터 (선택)</Label>
                <Select value={form.qna_category_id} onValueChange={(v) => setForm((f) => ({ ...f, qna_category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="전체 질문" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">전체 질문</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.cue_type === 'notice' && (
              <div className="space-y-1.5">
                <Label>안내 문구</Label>
                <Textarea value={form.notice_text} onChange={(e) => setForm((f) => ({ ...f, notice_text: e.target.value }))} placeholder="예: 잠시 후 계속됩니다 (휴식 10분)" rows={3} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {form.id ? '저장' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
