/**
 * ScreenPreviews — 기능 화면(무대 송출·폰 Q&A·폰 투표) 경량 미리보기 3종
 *
 * 디자인 에디터(DesignEditor)의 설정 장면(broadcast/qna/poll) 캔버스 전용.
 * 실제 청중 화면의 룩을 샘플 데이터로 충실히 모사한다 — 편집 즉시 반영이 목적이라
 * 자체 fetch 없이 { settings, tokens }만 소비한다.
 *   - settings = registry.sceneSettings(design, sceneKey)  (defaults + 저장값 병합)
 *   - tokens   = registry.deriveTokens(design.tokens)      (cssVars·brand·isDark 파생)
 *
 * 각 루트는 tokens.cssVars를 주입하고 className "lp-audience"로 폰트/스케일을 상속한다
 * (SectionRenderer와 동일 규약). 부모가 PreviewFrame(iframe)으로 감싸 세로 스크롤을 제공한다.
 */

/* ── 무대 배경 style (registry bgStyle 규칙과 동일) ── */
function sceneBgStyle(bg, tokens) {
  if (!bg || bg.type === 'none') return { background: '#0f172a' }
  if (bg.type === 'color') return { background: bg.color || tokens.brand }
  if (bg.type === 'image' && bg.url) {
    const ov = (bg.overlay ?? 45) / 100
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,${ov}), rgba(0,0,0,${ov})), url(${bg.url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  if (bg.preset === 'custom') {
    return { background: `linear-gradient(${bg.angle ?? 135}deg, ${bg.from || tokens.brand}, ${bg.to || '#334155'})` }
  }
  const rgb = tokens.cssVars?.['--lp-brand-rgb'] || '81,87,201'
  const presets = {
    brand: `linear-gradient(135deg, ${tokens.brand}, rgba(${rgb},0.65))`,
    night: 'linear-gradient(135deg,#0f172a,#334155)',
    sunset: 'linear-gradient(135deg,#e8641f,#e11d48)',
    forest: 'linear-gradient(135deg,#166534,#0d9488)',
  }
  return { background: presets[bg.preset] || presets.brand }
}

/** 공통 루트 — cssVars 주입 + lp-audience 폰트/스케일 상속 (SectionRenderer의 scaleCss 축약) */
function PreviewRoot({ tokens, style, className = '', children }) {
  const scale = tokens.cssVars?.['--lp-font-scale'] || '1'
  const scaleCss = `
    .lp-audience { font-size: calc(16px * ${scale}); }
    .lp-audience .text-xs{font-size:.75em;line-height:var(--lp-line-h)}
    .lp-audience .text-sm{font-size:.875em;line-height:var(--lp-line-h)}
    .lp-audience .text-base{font-size:1em;line-height:var(--lp-line-h)}
    .lp-audience .text-lg{font-size:1.125em}
    .lp-audience .text-xl{font-size:1.25em}
    .lp-audience h1, .lp-audience h2, .lp-audience h3, .lp-audience .lp-h {
      font-family: var(--lp-font-title);
      letter-spacing: var(--lp-title-spacing);
      line-height: 1.25;
    }
  `
  return (
    <div
      className={`lp-audience ${className}`}
      style={{ ...tokens.cssVars, fontFamily: 'var(--lp-font)', minHeight: '100vh', ...style }}
    >
      <style>{scaleCss}</style>
      {children}
    </div>
  )
}

/* ════════════ 무대 송출 (Q&A) ════════════ */
const BROADCAST_QUESTION = 'AI 도입 초기에 구성원 저항을 줄이는 가장 효과적인 방법은?'

export function BroadcastPreview({ settings: s, tokens, headerBand = null, footerBand = null }) {
  const align = s.align || 'center'
  const itemsAlign = { left: 'flex-start', center: 'center', right: 'flex-end' }[align] || 'center'
  const fontPx = Math.round((s.fontSize || 150) * 0.5) // 미리보기는 0.5배 축소
  const metaPx = Math.max(11, Math.round(fontPx * 0.28))
  const color = s.fontColor || '#ffffff'
  const hasCard = !!(s.cardBg || s.cardBorder)

  const cardStyle = hasCard
    ? {
        background: s.cardBg || 'transparent',
        border: s.cardBorder ? `2px solid ${s.cardBorder}` : 'none',
        borderRadius: 'var(--lp-radius)',
        padding: '24px 28px',
      }
    : null

  return (
    <PreviewRoot
      tokens={tokens}
      style={{ ...sceneBgStyle(s.bg, tokens), display: 'flex', flexDirection: 'column' }}
    >
      {headerBand}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: itemsAlign,
            gap: 16,
            maxWidth: '92%',
            ...cardStyle,
          }}
        >
          {s.showCategory && (
            <span
              style={{
                fontSize: metaPx,
                fontWeight: 700,
                padding: '4px 12px',
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.16)',
                color,
                letterSpacing: '0.02em',
              }}
            >
              조직문화
            </span>
          )}
          <div
            style={{
              fontSize: fontPx,
              lineHeight: 1.25,
              fontWeight: 800,
              fontFamily: 'var(--lp-font-title)',
              color,
              textAlign: align,
            }}
          >
            {BROADCAST_QUESTION}
          </div>
          {(s.showAuthor || s.showLikes) && (
            <div
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                fontSize: metaPx,
                color,
                opacity: 0.82,
              }}
            >
              {s.showAuthor && <span>— 이참가</span>}
              {s.showLikes && <span>👍 12</span>}
            </div>
          )}
        </div>
      </div>
      {footerBand}
    </PreviewRoot>
  )
}

/* ════════════ 폰 Q&A 탭 ════════════ */
const QNA_SAMPLES = [
  { q: 'AI 도입 초기에 구성원 저항을 줄이는 가장 효과적인 방법은?', author: '이참가', category: '조직문화', likes: 12 },
  { q: '데이터가 부족한 팀은 어디서부터 시작해야 하나요?', author: '김현장', category: '전략', likes: 8 },
  { q: '도입 성과를 경영진에 설득할 때 어떤 지표가 설득력 있었나요?', author: '박실무', category: '성과측정', likes: 5 },
]

export function QnaPreview({ settings: s, tokens, headerBand = null, footerBand = null }) {
  const questions = QNA_SAMPLES
  const flat = s.cardStyle === 'flat'

  return (
    <PreviewRoot tokens={tokens} style={{ background: 'var(--lp-surface)' }}>
      {headerBand}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px 40px' }}>
        {s.headerText && (
          <div
            className="text-sm"
            style={{
              padding: '12px 14px',
              marginBottom: 14,
              borderRadius: 'var(--lp-radius)',
              background: 'var(--lp-brand-tint)',
              color: 'var(--lp-brand)',
              fontWeight: 600,
            }}
          >
            {s.headerText}
          </div>
        )}

        {questions.length === 0 ? (
          <div
            className="text-sm"
            style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--lp-mut)' }}
          >
            {s.emptyText || '아직 등록된 질문이 없어요'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {questions.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: 'var(--lp-pad)',
                  borderRadius: 'var(--lp-radius)',
                  background: flat ? 'transparent' : 'var(--lp-card)',
                  border: flat ? 'none' : '1px solid var(--lp-line)',
                  borderBottom: flat ? '1px solid var(--lp-line)' : '1px solid var(--lp-line)',
                }}
              >
                {s.showCategory && (
                  <span
                    className="text-xs"
                    style={{
                      display: 'inline-block',
                      marginBottom: 8,
                      padding: '2px 9px',
                      borderRadius: 9999,
                      background: 'var(--lp-brand-tint)',
                      color: 'var(--lp-brand)',
                      fontWeight: 700,
                    }}
                  >
                    {item.category}
                  </span>
                )}
                <div className="text-sm" style={{ color: 'var(--lp-ink)', fontWeight: 500 }}>
                  {item.q}
                </div>
                <div
                  className="text-xs"
                  style={{
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    color: 'var(--lp-mut)',
                  }}
                >
                  {s.showAuthor && <span>{item.author}</span>}
                  {s.showLikes && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontWeight: 600,
                        color: 'var(--lp-brand)',
                      }}
                    >
                      👍 {item.likes}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {footerBand}
    </PreviewRoot>
  )
}

/* ════════════ 폰 투표 ════════════ */
const POLL_QUESTION = '가장 기대되는 오후 세션은?'
const POLL_OPTIONS = [
  { label: '실전 AI 워크숍', count: 58 },
  { label: '리더십 라운드테이블', count: 39 },
  { label: '데이터 거버넌스 세션', count: 27 },
  { label: '클로징 키노트', count: 21 },
]

export function PollPreview({ settings: s, tokens, headerBand = null, footerBand = null }) {
  const total = POLL_OPTIONS.reduce((sum, o) => sum + o.count, 0)
  const minimal = s.resultStyle === 'minimal'

  return (
    <PreviewRoot tokens={tokens} style={{ background: 'var(--lp-surface)' }}>
      {headerBand}
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div
          className="text-lg"
          style={{ fontWeight: 800, color: 'var(--lp-ink)', marginBottom: 18, fontFamily: 'var(--lp-font-title)' }}
        >
          {POLL_QUESTION}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: minimal ? 14 : 12 }}>
          {POLL_OPTIONS.map((o, i) => {
            const pct = total ? Math.round((o.count / total) * 100) : 0
            return (
              <div key={i}>
                <div
                  className="text-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: minimal ? 4 : 6,
                  }}
                >
                  <span style={{ color: 'var(--lp-ink)', fontWeight: 600 }}>{o.label}</span>
                  <span style={{ color: 'var(--lp-mut)', display: 'inline-flex', gap: 8, flexShrink: 0 }}>
                    {s.showCount && <span>{o.count}표</span>}
                    {s.showPercent && (
                      <span style={{ color: 'var(--lp-brand)', fontWeight: 700 }}>{pct}%</span>
                    )}
                  </span>
                </div>
                {minimal ? (
                  <div style={{ height: 3, borderRadius: 9999, background: 'var(--lp-line)' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 9999,
                        background: 'var(--lp-brand)',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      height: 12,
                      borderRadius: 9999,
                      background: 'var(--lp-brand-tint)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 9999,
                        background: 'var(--lp-brand)',
                        transition: 'width .3s',
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-xs" style={{ marginTop: 16, color: 'var(--lp-mut)' }}>
          총 {total}명 참여
        </div>

        {s.thankYouText && (
          <div
            className="text-sm"
            style={{
              marginTop: 20,
              padding: '12px 14px',
              borderRadius: 'var(--lp-radius)',
              background: 'var(--lp-brand-tint)',
              color: 'var(--lp-brand)',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {s.thankYouText}
          </div>
        )}
      </div>
      {footerBand}
    </PreviewRoot>
  )
}
