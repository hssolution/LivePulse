import { useEffect, useRef } from 'react'
import { SECTION_REGISTRY, deriveTokens, scaleCss, SCENE_BAND_SECTIONS } from '@/components/audience/sections/registry'

/**
 * SectionBand — 기능 화면(무대·폰Q&A·폰투표)의 상단/하단 자유 섹션 밴드.
 *
 * SectionRenderer가 "페이지 전체(min-h-screen)"를 그리는 반면, SectionBand는
 * 핵심 기능부(질문 카드·투표·Q&A) 위/아래에 끼우는 "밴드"만 그린다.
 * - 참가/로비의 섹션과 동일한 SECTION_REGISTRY.render 를 재사용 (배너·텍스트·스폰서 등)
 * - 청중 라이브 화면과 에디터 캔버스·미리보기가 모두 이 컴포넌트를 공유
 * - editable: 에디터 캔버스 모드 — 클릭 선택·아웃라인
 * - tokens 미주입 시 design.tokens 로 파생 (라이브 화면 편의)
 */
export default function SectionBand({
  sections = [],
  design = null,
  tokens: tokensProp = null,
  data = {},
  editable = false,
  selectedId = null,
  onSelect,
  className = '',
}) {
  const tokens = tokensProp || deriveTokens(design?.tokens)
  const visible = sections.filter(
    (sec) => SECTION_REGISTRY[sec.type] && SCENE_BAND_SECTIONS.includes(sec.type) && (editable || !sec.hidden)
  )
  if (!visible.length) return null

  const widthOf = (sec) =>
    sec.settings?.width || SECTION_REGISTRY[sec.type]?.schema?.width?.default || 'full'

  // 연속된 '1/2' 섹션은 넓은 화면(sm+)에서 2열 페어로 묶는다 (SectionRenderer와 동일 규칙)
  const groups = []
  for (let i = 0; i < visible.length; i++) {
    const cur = visible[i]
    const nxt = visible[i + 1]
    if (widthOf(cur) === 'half' && nxt && widthOf(nxt) === 'half') {
      groups.push({ pair: [cur, nxt] })
      i++
    } else {
      groups.push({ single: cur })
    }
  }

  const renderOne = (sec, paired = false) => {
    const def = SECTION_REGISTRY[sec.type]
    const Render = def.render
    const settings = { ...def.defaults, ...sec.settings }
    // 페어(2열 그리드) 안에선 그리드가 폭을 잡으므로 개별 half 폭 제한 생략.
    // 짝 없는 단독 half 는 50% 폭 중앙정렬.
    const halfStyle =
      !paired && widthOf(sec) === 'half' ? { maxWidth: '50%', marginLeft: 'auto', marginRight: 'auto' } : undefined
    const body = <Render settings={settings} tokens={tokens} data={data} editable={editable} />
    if (!editable) {
      return (
        <div key={sec.id} className="px-4" style={halfStyle}>
          {body}
        </div>
      )
    }
    return (
      <EditableShell key={sec.id} sec={sec} def={def} selected={selectedId === sec.id} style={halfStyle} onSelect={onSelect}>
        {body}
      </EditableShell>
    )
  }

  return (
    <div
      style={{ ...tokens.cssVars, fontFamily: 'var(--lp-font)' }}
      className={`lp-audience w-full max-w-lg sm:max-w-2xl mx-auto flex flex-col gap-3 py-3 ${className}`}
    >
      <style>{scaleCss(tokens)}</style>
      {groups.map((g) =>
        g.pair ? (
          <div
            key={g.pair[0].id + '-pair'}
            className="px-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start [&>div]:px-0"
          >
            {g.pair.map((s) => renderOne(s, true))}
          </div>
        ) : (
          renderOne(g.single)
        )
      )}
    </div>
  )
}

/** 에디터 캔버스용 셸 — 선택 아웃라인 (SectionRenderer의 EditableShell 축약판) */
function EditableShell({ sec, def, selected, onSelect, children, style }) {
  const ref = useRef(null)
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])
  return (
    <div
      ref={ref}
      data-section-id={sec.id}
      className="relative cursor-pointer px-4"
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(sec.id)
      }}
      style={{ ...style, ...(selected ? { outline: '2px solid #6366f1', outlineOffset: '-2px' } : null) }}
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
