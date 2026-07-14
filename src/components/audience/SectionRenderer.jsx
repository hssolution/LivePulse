import { useEffect, useRef, useState } from 'react'
import { SECTION_REGISTRY, deriveTokens, pageBgStyle, scaleCss, joinCtaLabel } from '@/components/audience/sections/registry'
import { ArrowDown } from 'lucide-react'

/**
 * SectionRenderer — 섹션 기반 디자인의 단일 렌더러 (디자인 에디터 PRD §8)
 *
 * 청중 참가/로비 페이지 · 에디터 캔버스 · 시뮬레이터가 전부 이 컴포넌트를 쓴다.
 * - design: session_designs.published(청중) 또는 draft(에디터)
 * - data: { session, presenters, cues } — 호스트가 주입 (섹션 자체 fetch 금지)
 * - slots: { joinCard } — 인터랙션 노드 주입 (에디터는 비활성 샘플)
 * - editable: 에디터 캔버스 모드 — 클릭 선택·아웃라인·선택 시 스크롤
 * - prepend: 장면 상단 고정 요소 (로비의 "곧 시작합니다" 배너 등)
 * - width:'half' 섹션이 연속되면 넓은 화면(sm+)에서 2열 페어링 (모바일은 1열)
 * - 청중 enter 장면: 참여 카드가 화면 밖이면 sticky 미니 CTA 자동 표시 (E2)
 * - 알 수 없는 섹션 type은 조용히 스킵 (전방 호환)
 */
export default function SectionRenderer({
  design,
  scene = 'enter',
  data = {},
  slots = {},
  editable = false,
  selectedId = null,
  onSelect,
  prepend = null,
}) {
  const tokens = deriveTokens(design?.tokens)
  const sections = design?.scenes?.[scene]?.sections || []

  // ── sticky 미니 CTA (청중 enter 전용): 참여 카드가 뷰포트 밖일 때만 표시 ──
  const joinRef = useRef(null)
  const [joinVisible, setJoinVisible] = useState(true)
  // 청중 화면은 물론 에디터 캔버스에서도 미리 보이도록 (editable 포함) — 참여 카드가 뷰포트 밖이면 하단 고정 CTA
  const showStickyCta = scene === 'enter' && !!slots.joinCard
  const ctaLabel = joinCtaLabel(design)
  useEffect(() => {
    if (!showStickyCta || !joinRef.current) return
    const ob = new IntersectionObserver(([e]) => setJoinVisible(e.isIntersecting), { threshold: 0.2 })
    ob.observe(joinRef.current)
    return () => ob.disconnect()
  }, [showStickyCta, sections.length])

  // ── 렌더 목록 구성: half 연속 쌍을 2열 그룹으로 ──
  const visible = sections.filter((sec) => SECTION_REGISTRY[sec.type] && !sec.hidden)
  const groups = []
  for (let i = 0; i < visible.length; i++) {
    const cur = visible[i]
    const w = (cur.settings?.width || SECTION_REGISTRY[cur.type]?.schema?.width?.default || 'full')
    const nxt = visible[i + 1]
    const nw = nxt && (nxt.settings?.width || SECTION_REGISTRY[nxt.type]?.schema?.width?.default || 'full')
    if (w === 'half' && nw === 'half') {
      groups.push({ pair: [cur, nxt] })
      i++
    } else {
      groups.push({ single: cur })
    }
  }

  const renderOne = (sec) => {
    const def = SECTION_REGISTRY[sec.type]
    const Render = def.render
    const settings = { ...def.defaults, ...sec.settings }
    const isJoin = sec.type === 'joinCard'
    // editable: 빈 상태 섹션이 에디터 캔버스에서 플레이스홀더로 보이게 (청중은 null)
    const body = <Render settings={settings} tokens={tokens} data={data} slots={slots} editable={editable} />

    if (!editable) {
      return (
        <div
          key={sec.id}
          ref={isJoin ? joinRef : undefined}
          className={sec.type === 'hero' ? '' : 'px-4'}
        >
          {body}
        </div>
      )
    }
    const selected = selectedId === sec.id
    // 참여 카드는 editable 에서도 joinRef를 달아 sticky CTA 관찰이 동작하게 함
    if (isJoin) {
      return (
        <div key={sec.id} ref={joinRef}>
          <EditableShell sec={sec} def={def} selected={selected} onSelect={onSelect}>
            {body}
          </EditableShell>
        </div>
      )
    }
    return (
      <EditableShell key={sec.id} sec={sec} def={def} selected={selected} onSelect={onSelect}>
        {body}
      </EditableShell>
    )
  }

  const scrollToJoin = () => {
    joinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      style={{
        ...tokens.cssVars,
        ...pageBgStyle(tokens.pageBg, tokens), // 페이지 전체 배경 (색/이미지/오버레이)
        fontFamily: 'var(--lp-font)',
      }}
      className="lp-audience min-h-screen flex flex-col"
      onClick={editable ? () => onSelect?.(null) : undefined}
    >
      <style>{scaleCss(tokens)}</style>
      {prepend}
      <div className="flex-1 w-full max-w-lg sm:max-w-2xl mx-auto flex flex-col gap-3 pb-8">
        {groups.map((g, i) =>
          g.pair ? (
            <div key={g.pair[0].id + '-pair'} className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start [&>div]:px-0">
              {g.pair.map(renderOne)}
            </div>
          ) : (
            renderOne(g.single)
          )
        )}
      </div>

      {/* 참여 카드가 화면 밖일 때 — 브랜드 색 sticky 미니 CTA (E2, iOS 안전영역 패딩) */}
      {showStickyCta && !joinVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
          style={{ background: 'linear-gradient(transparent, var(--lp-surface) 40%)' }}
        >
          <button
            type="button"
            onClick={scrollToJoin}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 font-bold py-3 rounded-[var(--lp-radius)] shadow-lg"
            style={{ background: 'var(--lp-brand)', color: 'var(--lp-on-brand)' }}
          >
            {ctaLabel} <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/** 에디터 캔버스용 섹션 셸 — 선택 아웃라인 + 선택 시 스크롤 (E2) */
function EditableShell({ sec, def, selected, onSelect, children }) {
  const ref = useRef(null)
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])
  return (
    <div
      ref={ref}
      data-section-id={sec.id}
      className={`relative cursor-pointer ${sec.type === 'hero' ? '' : 'px-4'}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(sec.id)
      }}
      style={selected ? { outline: '2px solid #6366f1', outlineOffset: '-2px' } : undefined}
    >
      {selected && (
        <span className="absolute -top-2 left-3 z-10 text-[10px] font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-full">
          {def.name}
        </span>
      )}
      <div className="pointer-events-none">{children}</div>
    </div>
  )
}
