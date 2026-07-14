import ScheduleList from '@/components/audience/ScheduleList'
import { HtmlContent } from '@/components/ui/html-content'
import { Calendar, MapPin, Phone, Mail } from 'lucide-react'
import { format } from 'date-fns'

/**
 * 섹션 레지스트리 (디자인 에디터 PRD §7 — 단일 소스)
 *
 * 각 섹션 타입 = { name, icon, schema, defaults, render, required?, lockedLast?, maxPerScene? }
 * - schema: 에디터 인스펙터 자동 생성 + 값 범위 가드레일
 *   필드 타입: 'segment'(택1) | 'range'(슬라이더) | 'text' | 'textarea' |
 *              'toggle' | 'toggleList' | 'color' | 'image' | 'richtext' | 'imageList'
 * - render({ settings, tokens, data, slots }): 청중 화면·에디터 캔버스 공용 (렌더러 단일화)
 *   data = { session, presenters, cues } (호스트가 주입 — 섹션은 자체 fetch 금지)
 *   slots = { joinCard } (인터랙션 노드 주입 — 에디터는 no-op 샘플)
 */

/* ── 토큰 파생 (브랜드 색 1개 → 파생 색 자동, Luma 패턴) ── */
export const DEFAULT_TOKENS = {
  brand: '#5157c9',
  surface: 'light',
  radius: 'default',
  density: 'default',
  font: 'pretendard',       // 본문 폰트 (FONT_STACKS 키)
  titleFont: 'inherit',     // 제목 폰트 — 'inherit'면 본문과 동일 (2트랙 분리)
  fontScale: 'default',     // 본문 배율 sm/default/lg
  lineHeight: 'default',    // 본문 행간 compact/default/relaxed
  titleSpacing: 'normal',   // 제목 자간 tight/normal/wide
  pageBg: null,             // 페이지 전체 배경 { type, color?, preset?, url?, overlay? }
}

/** 큐레이션 폰트 — 모두 무료 상업용, Google Fonts/CDN 지연 로딩(index.html 링크, 사용 시에만 다운로드) */
export const FONT_STACKS = {
  pretendard: { label: '프리텐다드 (기본)', stack: "'Pretendard Variable', 'Pretendard', system-ui, sans-serif", title: true, body: true },
  gothic:     { label: '고딕 (또렷한)',     stack: "'Gothic A1', 'Pretendard Variable', sans-serif", title: true, body: true },
  notoserif:  { label: '본명조 (격식)',      stack: "'Noto Serif KR', serif", title: true, body: true },
  myeongjo:   { label: '나눔명조 (감성)',    stack: "'Nanum Myeongjo', serif", title: true, body: true },
  round:      { label: '둥근 (친근한)',      stack: "'Jua', 'Pretendard Variable', sans-serif", title: true, body: true },
  hand:       { label: '손글씨 느낌',        stack: "'Gaegu', 'Pretendard Variable', cursive", title: true, body: true },
  // 제목 임팩트 전용 (본문엔 부적합 — body:false)
  blackhan:   { label: '검은고딕 (강한 제목)', stack: "'Black Han Sans', 'Pretendard Variable', sans-serif", title: true, body: false },
  dohyeon:    { label: '도현 (임팩트 제목)',  stack: "'Do Hyeon', 'Pretendard Variable', sans-serif", title: true, body: false },
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [81, 87, 201]
}
export function deriveTokens(tokens = {}) {
  const t = { ...DEFAULT_TOKENS, ...tokens }
  const [r, g, b] = hexToRgb(t.brand)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const onBrand = lum > 0.62 ? '#1b2130' : '#ffffff' // 대비 자동 (접근성)
  const radius = { flat: '6px', default: '14px', round: '22px' }[t.radius] || '14px'
  const pad = { compact: '12px', default: '18px', roomy: '26px' }[t.density] || '18px'
  const bodyStack = (FONT_STACKS[t.font] || FONT_STACKS.pretendard).stack
  const titleStack = t.titleFont && t.titleFont !== 'inherit'
    ? (FONT_STACKS[t.titleFont] || FONT_STACKS.pretendard).stack
    : bodyStack
  const fontScale = { sm: '0.9', default: '1', lg: '1.12' }[t.fontScale] || '1'
  const lineH = { compact: '1.4', default: '1.6', relaxed: '1.85' }[t.lineHeight] || '1.6'
  const titleSpacing = { tight: '-0.03em', normal: '-0.01em', wide: '0.02em' }[t.titleSpacing] || '-0.01em'
  const isDark = t.surface === 'dark'
  return {
    ...t,
    cssVars: {
      '--lp-brand': t.brand,
      '--lp-brand-rgb': `${r},${g},${b}`,
      '--lp-on-brand': onBrand,
      '--lp-brand-tint': `rgba(${r},${g},${b},0.10)`,
      '--lp-radius': radius,
      '--lp-pad': pad,
      '--lp-font': bodyStack,
      '--lp-font-title': titleStack,
      '--lp-font-scale': fontScale,
      '--lp-line-h': lineH,
      '--lp-title-spacing': titleSpacing,
      '--lp-surface': isDark ? '#0f1320' : '#f8fafc',
      '--lp-card': isDark ? '#1a2030' : '#ffffff',
      '--lp-ink': isDark ? '#e8eaf2' : '#1e293b',
      '--lp-mut': isDark ? '#8b93a8' : '#64748b',
      '--lp-line': isDark ? '#2a3145' : '#e2e8f0', // 테두리 색 (기존 유지)
    },
    isDark,
  }
}

/** WCAG 대비비 계산 — 접근성 경고용 (제목/브랜드 색) */
function relLum(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(hex1, hex2) {
  const l1 = relLum(hex1)
  const l2 = relLum(hex2)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/** 페이지 전체 배경 그라데이션 프리셋 */
export const PAGE_GRADIENTS = {
  brandSoft: '브랜드 은은',
  night: '나이트',
  dawn: '새벽',
  mint: '민트',
  custom: '직접 지정',
}

/**
 * 기능 화면(무대 송출·폰 Q&A·폰 투표) 편집 설정 스키마 (디자인 에디터 확장)
 * 이 화면들은 자유 섹션이 아니라 고정 레이아웃 + 설정이라, scene.settings 객체로 편집한다.
 * SCENE_META[key] = { name, defaults, schema, previewNote }
 * schema 필드 타입은 SECTION_REGISTRY와 동일(segment/range/toggle/text/color/image/background).
 */
export const SCENE_META = {
  broadcast: {
    name: '송출 화면 (Q&A)',
    icon: '📺',
    defaults: {
      bg: { type: 'color', color: '#0f172a' },
      // 질문 본문 (상/하단 로고·텍스트는 좌측 상단/하단 섹션에서 자유 편집)
      fontSize: 150,
      fontColor: '#ffffff',
      align: 'center',
      showAuthor: true,
      showCategory: true,
      showLikes: false,
      cardBg: '',
      cardBorder: '',
    },
    schema: {
      bg:         { type: 'background', label: '배경' },
      // ── 질문 본문 ── (상/하단 브랜딩은 좌측 상단/하단 섹션에서 편집)
      fontSize:   { type: 'range', label: '질문 글자 크기', min: 60, max: 300, step: 10, default: 150, unit: 'px' },
      fontColor:  { type: 'color', label: '질문 글자색', default: '#ffffff' },
      align:      { type: 'segment', label: '질문 정렬', options: [['left','좌'],['center','중앙'],['right','우']], default: 'center' },
      showAuthor: { type: 'toggle', label: '작성자 표시', default: true },
      showCategory: { type: 'toggle', label: '카테고리 표시', default: true },
      showLikes:  { type: 'toggle', label: '좋아요 수 표시', default: false },
      cardBg:     { type: 'color', label: '질문 카드 배경 (선택)', clearable: true },
      cardBorder: { type: 'color', label: '카드 테두리 (선택)', clearable: true },
    },
    previewNote: '프로젝터·대형 스크린으로 내보내는 송출 화면 — 멀리서도 보이게 큰 글씨·고대비 권장. 로고·행사명·해시태그는 좌측 상단/하단 섹션에서 넣어요.',
  },
  qna: {
    name: '폰 Q&A',
    icon: '💬',
    defaults: {
      headerText: '',
      showLikes: true,
      showCategory: true,
      showAuthor: true,
      cardStyle: 'card',
      emptyText: '',
    },
    schema: {
      headerText: { type: 'text', label: '상단 안내 문구 (선택)', max: 60, placeholder: '예: 궁금한 점을 자유롭게 남겨주세요' },
      showAuthor: { type: 'toggle', label: '작성자 이름 표시', default: true },
      showCategory: { type: 'toggle', label: '카테고리 뱃지 표시', default: true },
      showLikes:  { type: 'toggle', label: '좋아요 표시', default: true },
      cardStyle:  { type: 'segment', label: '질문 카드', options: [['card','카드'],['flat','플랫']], default: 'card' },
      emptyText:  { type: 'text', label: '질문 없을 때 문구 (선택)', max: 60 },
    },
    previewNote: '청중 휴대폰의 Q&A 탭 — 테마 색·폰트는 브랜드 테마를 따릅니다',
  },
  poll: {
    name: '폰 투표',
    icon: '📊',
    defaults: {
      resultStyle: 'bar',
      showPercent: true,
      showCount: false,
      thankYouText: '',
    },
    schema: {
      resultStyle: { type: 'segment', label: '결과 표시', options: [['bar','막대'],['minimal','미니멀']], default: 'bar' },
      showPercent: { type: 'toggle', label: '퍼센트 표시', default: true },
      showCount:  { type: 'toggle', label: '응답 수 표시', default: false },
      thankYouText: { type: 'text', label: '제출 후 문구 (선택)', max: 60, placeholder: '예: 참여해 주셔서 감사합니다' },
    },
    previewNote: '청중 휴대폰의 투표 화면 — 테마 색·폰트는 브랜드 테마를 따릅니다',
  },
  ended: {
    name: '종료 화면',
    icon: '🏁',
    core: 'readonly', // 핵심부(종료 안내·홈 버튼)는 고정 — 상/하단 섹션만 편집
    defaults: {},
    schema: {},
    previewNote: '세션 종료 후 화면 — 핵심 안내는 고정, 상/하단에 감사 인사·후속 링크·스폰서를 넣어요',
  },
}

/** 참여 카드(joinCard)의 CTA 버튼 문구 — 미설정 시 기본값. (라이브 버튼·sticky CTA·에디터 샘플 공용) */
export function joinCtaLabel(design) {
  const jc = design?.scenes?.enter?.sections?.find((s) => s.type === 'joinCard')
  const label = jc?.settings?.ctaLabel
  return label && label.trim() ? label.trim() : '세션 참여하기'
}

/** scene.settings 병합 헬퍼 (defaults + 저장값) */
export function sceneSettings(design, sceneKey) {
  const meta = SCENE_META[sceneKey]
  if (!meta) return {}
  return { ...meta.defaults, ...(design?.scenes?.[sceneKey]?.settings || {}) }
}
const pageGradientCss = (preset, brand, pageBg) => {
  if (preset === 'custom') {
    const from = pageBg?.from || brand
    const to = pageBg?.to || '#f8fafc'
    const angle = pageBg?.angle ?? 180
    return `linear-gradient(${angle}deg, ${from}, ${to})`
  }
  return (
    {
      brandSoft: `linear-gradient(180deg, ${brand}22, var(--lp-surface) 45%)`,
      night: 'linear-gradient(180deg,#0b1020,#131a2e)',
      dawn: 'linear-gradient(180deg,#fde68a33,#fca5a533 40%,#f8fafc)',
      mint: 'linear-gradient(180deg,#99f6e433,#f0fdfa)',
    }[preset] || `linear-gradient(180deg, ${brand}22, var(--lp-surface) 45%)`
  )
}

/**
 * 페이지 전체 배경 style (SectionRenderer 루트)
 * 모바일 안전: background-attachment는 항상 scroll (fixed는 iOS 렌더 문제 — 리서치 반영)
 */
export function pageBgStyle(pageBg, tokens) {
  if (!pageBg || pageBg.type === 'none' || !pageBg.type) return { background: 'var(--lp-surface)' }
  if (pageBg.type === 'color') return { background: pageBg.color || 'var(--lp-surface)' }
  if (pageBg.type === 'gradient') return { background: pageGradientCss(pageBg.preset, tokens.brand, pageBg) }
  if (pageBg.type === 'image' && pageBg.url) {
    const ov = Math.min(60, Math.max(0, pageBg.overlay ?? 40)) / 100
    return {
      backgroundColor: 'var(--lp-surface)',
      backgroundImage: `linear-gradient(rgba(0,0,0,${ov}), rgba(0,0,0,${ov})), url(${pageBg.url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'scroll',
    }
  }
  return { background: 'var(--lp-surface)' }
}

/**
 * 폰트 배율 스코프 CSS — .lp-audience 안에서만 Tailwind text-* 를 em 기반으로 재정의.
 * SectionRenderer(전체 페이지)와 SectionBand(기능화면 상/하단 밴드)가 공유.
 */
export function scaleCss(tokens) {
  const scale = tokens?.cssVars?.['--lp-font-scale'] || '1'
  return `
    .lp-audience { font-size: calc(16px * ${scale}); }
    .lp-audience .text-xs{font-size:.75em;line-height:var(--lp-line-h)}
    .lp-audience .text-sm{font-size:.875em;line-height:var(--lp-line-h)}
    .lp-audience .text-base{font-size:1em;line-height:var(--lp-line-h)}
    .lp-audience .text-lg{font-size:1.125em}
    .lp-audience .text-xl{font-size:1.25em}
    .lp-audience .text-2xl{font-size:1.5em}
    .lp-audience .text-3xl{font-size:1.875em}
    .lp-audience h1, .lp-audience h2, .lp-audience h3, .lp-audience .lp-h {
      font-family: var(--lp-font-title);
      letter-spacing: var(--lp-title-spacing);
      line-height: 1.25;
    }
  `
}

/**
 * 기능 화면(무대·폰Q&A·폰투표·종료) 상/하단에 자유롭게 넣을 수 있는 섹션 타입.
 * 핵심 기능부(질문·투표·종료 안내)는 고정, 그 위·아래에 섹션을 자유롭게 추가 — 참가/로비와 동일한 편집 방식.
 * (참여 카드 joinCard 만 제외 — 참가 페이지 전용)
 */
export const SCENE_BAND_SECTIONS = ['hero', 'eventInfo', 'schedule', 'presenters', 'banner', 'text', 'sponsors']

/* ── 공용 소품 ── */
/** 링크 URL 스킴 화이트리스트 (javascript: 등 저장형 XSS 차단 — 서버 022와 이중 방어) */
const safeUrl = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url.trim()) ? url.trim() : null)

/** 색상 밝기 판정 — 밝은 배경엔 어두운 텍스트 (HeroSection 대비) */
const isDarkColor = (hex) => {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 <= 0.62
}

/** 에디터 캔버스 전용 빈 상태 (청중에겐 렌더 안 됨 — 선택·인지용) */
const EmptyHint = ({ children, style }) => (
  <div
    className="rounded-[var(--lp-radius)] border border-dashed border-[var(--lp-line)] px-4 py-5 text-center text-xs flex items-center justify-center"
    style={{ color: 'var(--lp-mut)', ...style }}
  >
    {children}
  </div>
)

const card = 'rounded-[var(--lp-radius)] border border-[var(--lp-line)] bg-[var(--lp-card)]'
const secPad = { padding: 'var(--lp-pad)' }
const H = ({ children }) => (
  <div className="lp-h text-xs font-bold mb-2" style={{ color: 'var(--lp-brand)' }}>{children}</div>
)

const bgStyle = (bg, tokens) => {
  if (!bg || bg.type === 'none') return {}
  if (bg.type === 'color') return { background: bg.color || tokens.brand }
  if (bg.type === 'image' && bg.url)
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,${(bg.overlay ?? 45) / 100}), rgba(0,0,0,${(bg.overlay ?? 45) / 100})), url(${bg.url})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
    }
  // gradient (기본: 브랜드 파생)
  if (bg.preset === 'custom') {
    const from = bg.from || tokens.brand
    const to = bg.to || '#334155'
    const angle = bg.angle ?? 135
    return { background: `linear-gradient(${angle}deg, ${from}, ${to})` }
  }
  const presets = {
    brand: `linear-gradient(135deg, ${tokens.brand}, rgba(var(--lp-brand-rgb),0.65))`,
    night: 'linear-gradient(135deg,#0f172a,#334155)',
    sunset: 'linear-gradient(135deg,#e8641f,#e11d48)',
    forest: 'linear-gradient(135deg,#166534,#0d9488)',
  }
  return { background: presets[bg.preset] || presets.brand }
}

/* ════════════ 섹션 컴포넌트 ════════════ */

function HeroSection({ settings: s, tokens, data }) {
  // 대비 판정: 이미지=오버레이로 항상 어두움, 없음=서피스 기준, 색/그라데이션=밝기 계산
  const bg = s.bg || { type: 'gradient', preset: 'brand' }
  const dark =
    bg.type === 'image'
      ? true
      : bg.type === 'none'
        ? tokens.isDark
        : bg.type === 'color'
          ? isDarkColor(bg.color || tokens.brand)
          : bg.preset && bg.preset !== 'brand'
            ? true // night/sunset/forest 프리셋은 어두운 계열
            : isDarkColor(tokens.brand)
  const align = s.align || 'center'
  return (
    <div style={{ ...bgStyle(s.bg || { type: 'gradient', preset: 'brand' }, tokens), textAlign: align }}
      className={`${s.height === 'compact' ? 'py-6' : s.height === 'tall' ? 'py-16' : 'py-10'} px-5`}>
      {s.showLogo !== false && s.logoUrl && (
        <div style={{ display: 'flex', justifyContent: { left: 'flex-start', center: 'center', right: 'flex-end' }[s.logoPos || 'center'] }}>
          <img src={s.logoUrl} alt="" style={{ height: `${s.logoSize || 48}px` }} className="object-contain mb-4 max-w-[70%]" />
        </div>
      )}
      <h1 className={`font-extrabold leading-snug ${{ sm: 'text-lg', md: 'text-xl', lg: 'text-2xl', xl: 'text-3xl' }[s.titleSize || 'md']} ${dark ? 'text-white' : 'text-[var(--lp-ink)]'}`}>
        {s.titleOverride || data.session?.title}
      </h1>
      {s.showSubtitle !== false && (
        <p className={`text-sm mt-2 ${dark ? 'text-white/80' : 'text-[var(--lp-mut)]'}`}>
          {s.subtitle || data.session?.description || ''}
        </p>
      )}
    </div>
  )
}

function EventInfoSection({ settings: s, data }) {
  const ses = data.session || {}
  const show = s.show || ['date', 'venue']
  const Row = ({ icon: Icon, children }) => (
    <div className="flex items-start gap-2.5 py-1.5 text-sm" style={{ color: 'var(--lp-ink)' }}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--lp-brand)' }} />
      <div>{children}</div>
    </div>
  )
  const inner = (
    <>
      <H>{s.heading || '행사 정보'}</H>
      {show.includes('date') && ses.start_at && (
        <Row icon={Calendar}>
          <b>{format(new Date(ses.start_at), 'yyyy.MM.dd (EEE)')}</b>
          <div className="text-xs" style={{ color: 'var(--lp-mut)' }}>
            {format(new Date(ses.start_at), 'HH:mm')}{ses.end_at ? ` - ${format(new Date(ses.end_at), 'HH:mm')}` : ''}
          </div>
        </Row>
      )}
      {show.includes('venue') && ses.venue_name && (
        <Row icon={MapPin}><b>{ses.venue_name}</b>
          {ses.venue_address && <div className="text-xs" style={{ color: 'var(--lp-mut)' }}>{ses.venue_address}</div>}
        </Row>
      )}
      {show.includes('phone') && ses.contact_phone && <Row icon={Phone}>{ses.contact_phone}</Row>}
      {show.includes('email') && ses.contact_email && <Row icon={Mail}>{ses.contact_email}</Row>}
    </>
  )
  return s.style === 'flat'
    ? <div style={secPad}>{inner}</div>
    : <div className={card} style={secPad}>{inner}</div>
}

function ScheduleSection({ settings: s, data, editable }) {
  if (!data.cues?.length) {
    return editable ? <EmptyHint>🗓️ 오늘의 순서 — 진행 순서 탭에서 공개 큐를 만들면 자동 표시돼요</EmptyHint> : null
  }
  return (
    <div className={card} style={secPad}>
      <H>{s.heading || '오늘의 순서'}</H>
      <ScheduleList cues={data.cues} isLive={false} />
    </div>
  )
}

function PresentersSection({ settings: s, data, editable }) {
  const list = data.presenters || []
  if (!list.length) {
    return editable ? <EmptyHint>🎤 발표자 소개 — 발표자 & 협업 탭에서 발표자를 확정하면 자동 표시돼요</EmptyHint> : null
  }
  return (
    <div className={card} style={secPad}>
      <H>{s.heading || '발표자'}</H>
      <div className="space-y-3">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: 'var(--lp-brand)', color: 'var(--lp-on-brand)' }}>
              {p.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--lp-ink)' }}>{p.display_name}</div>
              {p.display_title && <div className="text-xs" style={{ color: 'var(--lp-mut)' }}>{p.display_title}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BannerSection({ settings: s, editable }) {
  if (!s.url) {
    // 빈 상태는 에디터 캔버스에서만 — 청중 화면엔 렌더하지 않는다.
    // 높이 설정을 반영(없으면 배너다운 기본 높이). 너비(1/2)는 상위 컨테이너가 잡으므로 여기선 미적용.
    if (!editable) return null
    const h = s.height && s.height !== 'auto' && s.height > 0 ? `${s.height}px` : '84px'
    return <EmptyHint style={{ minHeight: h }}>🏞️ 배너 이미지 업로드</EmptyHint>
  }
  const img = (
    <img src={s.url} alt={s.alt || ''} className="w-full object-cover rounded-[var(--lp-radius)]"
      style={s.height && s.height !== 'auto' ? { height: `${s.height}px` } : undefined} />
  )
  const link = safeUrl(s.link) // javascript: 등 위험 스킴 차단
  return link ? (
    <a href={link} target={s.newTab === false ? undefined : '_blank'} rel="noopener noreferrer" className="block">{img}</a>
  ) : img
}

function TextSection({ settings: s, tokens, editable }) {
  if (!s.html) {
    return editable ? <EmptyHint>✍️ 텍스트 — 인스펙터에서 내용을 입력하세요</EmptyHint> : null
  }
  // 배경(색·그라데이션·이미지) 지원 — 배경이 어두우면 글자색 자동 흰색, 사용자 지정 시 우선
  const bg = s.bg
  const hasBg = bg && bg.type && bg.type !== 'none'
  const bgDark =
    hasBg &&
    (bg.type === 'image' || bg.type === 'gradient' || (bg.type === 'color' && isDarkColor(bg.color || '#000')))
  const ink = s.textColor || (bgDark ? '#ffffff' : 'var(--lp-ink)')
  const inner = (
    <div style={{ color: ink, textAlign: s.align || 'left' }} className="text-sm leading-relaxed [&_a]:underline">
      <HtmlContent html={s.html} />
    </div>
  )
  if (hasBg) {
    return (
      <div
        style={{ ...bgStyle(bg, tokens || DEFAULT_TOKENS), ...secPad, borderRadius: 'var(--lp-radius)', overflow: 'hidden' }}
      >
        {inner}
      </div>
    )
  }
  return s.style === 'card' ? <div className={card} style={secPad}>{inner}</div> : <div style={secPad}>{inner}</div>
}

function SponsorsSection({ settings: s, editable }) {
  const logos = (s.logos || []).filter((l) => l?.url)
  if (!logos.length) {
    return editable ? <EmptyHint>🤝 스폰서 로고 — 인스펙터에서 로고를 추가하세요</EmptyHint> : null
  }
  return (
    <div style={secPad}>
      {s.heading && <H>{s.heading}</H>}
      <div className={`grid gap-3 items-center ${{ 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[s.cols || 3]}`}>
        {logos.map((l, i) => (
          <img key={i} src={l.url} alt="" className="w-full object-contain max-h-12 opacity-90" />
        ))}
      </div>
    </div>
  )
}

function JoinCardSection({ settings: s, data, slots }) {
  const ses = data.session || {}
  return (
    <div className={card} style={secPad}>
      <div className="font-bold mb-1" style={{ color: 'var(--lp-ink)' }}>{s.heading || '지금 참여하세요'}</div>
      {s.desc !== '' && (
        <p className="text-xs mb-3" style={{ color: 'var(--lp-mut)' }}>{s.desc || '버튼을 클릭하여 세션에 참여하세요.'}</p>
      )}
      {slots?.joinCard}
      {s.showCount !== false && ses.max_participants ? (
        <p className="text-center text-[11px] mt-3" style={{ color: 'var(--lp-mut)' }}>
          현재 {ses.participant_count || 0}명 / 최대 {ses.max_participants}명
        </p>
      ) : null}
    </div>
  )
}

/* ════════════ 레지스트리 ════════════ */

export const SECTION_REGISTRY = {
  hero: {
    name: '히어로 (커버)', icon: '🖼️', maxPerScene: 1,
    schema: {
      showLogo:  { type: 'toggle', label: '로고 표시', default: true },
      logoUrl:   { type: 'image', label: '로고 이미지', showIf: (s) => s.showLogo !== false },
      logoPos:   { type: 'segment', label: '로고 위치', options: [['left','좌측'],['center','중앙'],['right','우측']], default: 'center', showIf: (s) => s.showLogo !== false },
      logoSize:  { type: 'range', label: '로고 크기', min: 24, max: 160, step: 4, default: 48, unit: 'px', showIf: (s) => s.showLogo !== false },
      titleOverride: { type: 'text', label: '제목 (비우면 세션명)', max: 80 },
      titleSize: { type: 'segment', label: '제목 크기', options: [['sm','S'],['md','M'],['lg','L'],['xl','XL']], default: 'md' },
      showSubtitle: { type: 'toggle', label: '부제 표시', default: true },
      subtitle:  { type: 'text', label: '부제 (비우면 세션 설명)', max: 120, showIf: (s) => s.showSubtitle !== false },
      align:     { type: 'segment', label: '정렬', options: [['left','좌'],['center','중앙']], default: 'center' },
      height:    { type: 'segment', label: '높이', options: [['compact','콤팩트'],['default','기본'],['tall','풀커버']], default: 'default' },
      bg:        { type: 'background', label: '배경' },
    },
    defaults: { bg: { type: 'gradient', preset: 'brand' } },
    render: HeroSection,
  },
  eventInfo: {
    name: '행사 정보', icon: '📋',
    schema: {
      heading: { type: 'text', label: '섹션 제목', default: '행사 정보', max: 30 },
      show: { type: 'toggleList', label: '표시 항목', options: [['date','일시'],['venue','장소·주소'],['phone','연락처'],['email','이메일']], default: ['date','venue'] },
      style: { type: 'segment', label: '스타일', options: [['card','카드'],['flat','플랫']], default: 'card' },
      width: { type: 'segment', label: '너비 (넓은 화면)', options: [['full','전체'],['half','1/2']], default: 'full' },
    },
    defaults: {}, render: EventInfoSection,
  },
  schedule: {
    name: '오늘의 순서', icon: '🗓️', maxPerScene: 1,
    schema: { heading: { type: 'text', label: '섹션 제목', default: '오늘의 순서', max: 30 } },
    defaults: {}, render: ScheduleSection,
    note: '진행 순서 탭의 공개 큐를 자동 표시 — 공개 큐가 없으면 렌더되지 않아요',
  },
  presenters: {
    name: '발표자 소개', icon: '🎤', maxPerScene: 1,
    schema: { heading: { type: 'text', label: '섹션 제목', default: '발표자', max: 30 } },
    defaults: {}, render: PresentersSection,
    note: '발표자 & 협업 탭의 확정 발표자를 자동 표시',
  },
  banner: {
    name: '이미지 배너', icon: '🏞️',
    schema: {
      url:    { type: 'image', label: '이미지' },
      link:   { type: 'text', label: '클릭 시 이동 링크', placeholder: 'https://', max: 500 },
      newTab: { type: 'toggle', label: '새 탭으로 열기', default: true },
      height: { type: 'range', label: '높이 (0=자동)', min: 0, max: 400, step: 20, default: 0, unit: 'px' },
      width: { type: 'segment', label: '너비 (넓은 화면)', options: [['full','전체'],['half','1/2']], default: 'full' },
    },
    defaults: {}, render: BannerSection,
  },
  text: {
    name: '텍스트', icon: '✍️',
    schema: {
      html:  { type: 'richtext', label: '내용' },
      style: { type: 'segment', label: '스타일', options: [['plain','기본'],['card','카드']], default: 'plain' },
      align: { type: 'segment', label: '정렬', options: [['left','좌'],['center','중앙']], default: 'left' },
      width: { type: 'segment', label: '너비 (넓은 화면)', options: [['full','전체'],['half','1/2']], default: 'full' },
      bg:    { type: 'background', label: '배경 (선택 — 색·그라데이션·이미지)' },
      textColor: { type: 'color', label: '글자색', clearable: true, showIf: (s) => s.bg && s.bg.type && s.bg.type !== 'none' },
    },
    defaults: {}, render: TextSection,
  },
  sponsors: {
    name: '스폰서 로고', icon: '🤝',
    schema: {
      heading: { type: 'text', label: '섹션 제목', default: '', max: 30 },
      cols:  { type: 'segment', label: '열 수', options: [[2,'2열'],[3,'3열'],[4,'4열']], default: 3 },
      logos: { type: 'imageList', label: '로고 이미지들', max: 8 },
    },
    defaults: {}, render: SponsorsSection,
  },
  joinCard: {
    // 심판단 판정 반영: '최하단 고정' → '정확히 1개 + 삭제·숨김 불가 + 위치 자유'
    // (conference형 레이아웃 파리티 — 게시 시 첫 뷰포트 내 CTA 부재는 경고만)
    name: '참여 카드', icon: '🎟️', required: true, maxPerScene: 1,
    schema: {
      heading: { type: 'text', label: '카드 제목', default: '지금 참여하세요', max: 30 },
      desc:    { type: 'text', label: '안내 문구', default: '버튼을 클릭하여 세션에 참여하세요.', max: 80 },
      ctaLabel: { type: 'text', label: '참여 버튼 문구', default: '세션 참여하기', max: 24, placeholder: '예: 지금 입장하기' },
      showCount: { type: 'toggle', label: '참여 인원 표시', default: true },
      width: { type: 'segment', label: '너비 (넓은 화면)', options: [['full','전체'],['half','1/2']], default: 'full' },
    },
    defaults: {}, render: JoinCardSection,
  },
}

/* ── 프리셋 변환기: 기존 템플릿+에셋 → 동등한 섹션 구성 (마이그레이션 PRD §10) ── */
let _uid = 0
const uid = () => `s${Date.now().toString(36)}${(_uid++).toString(36)}`

export function presetFromTemplate(templateCode, assets = {}) {
  const a = (k) => assets[k]?.value || null
  const au = (k) => assets[k]?.url || null
  const brandByCode = { symposium: '#5157c9', conference: '#0f172a', workshop: '#0d9488' }
  const sections = []

  sections.push({
    id: uid(), type: 'hero',
    settings: {
      logoUrl: a('logo'), showLogo: !!a('logo'),
      bg: a('background_image')
        ? { type: 'image', url: a('background_image'), overlay: 45 }
        : { type: 'gradient', preset: templateCode === 'conference' ? 'night' : 'brand' },
    },
  })
  if (a('title_banner') || a('hero_banner')) {
    sections.push({ id: uid(), type: 'banner', settings: { url: a('title_banner') || a('hero_banner') } })
  }
  sections.push({ id: uid(), type: 'eventInfo', settings: {} })
  sections.push({ id: uid(), type: 'schedule', settings: {} })
  if (a('schedule_banner')) {
    sections.push({ id: uid(), type: 'banner', settings: { url: a('schedule_banner'), link: au('schedule_banner_url') || '' } })
  }
  sections.push({ id: uid(), type: 'presenters', settings: {} })
  if (a('sponsor_banner') || a('bottom_banner')) {
    sections.push({ id: uid(), type: 'banner', settings: { url: a('sponsor_banner') || a('bottom_banner'), link: au('bottom_banner_url') || '' } })
  }
  // conference 파리티: 행사 정보 + 참여 카드를 넓은 화면에서 2열로
  if (templateCode === 'conference') {
    const info = sections.find((s) => s.type === 'eventInfo')
    if (info) info.settings.width = 'half'
    sections.push({ id: uid(), type: 'joinCard', settings: { width: 'half' } })
  } else {
    sections.push({ id: uid(), type: 'joinCard', settings: {} })
  }

  // 로비 장면 기본 구성 (E2 — 로비 섹션화)
  const lobbySections = [
    { id: uid(), type: 'hero', settings: {
      logoUrl: a('logo'), showLogo: !!a('logo'), height: 'compact',
      bg: a('background_image')
        ? { type: 'image', url: a('background_image'), overlay: 45 }
        : { type: 'gradient', preset: templateCode === 'conference' ? 'night' : 'brand' },
    } },
    { id: uid(), type: 'schedule', settings: {} },
    { id: uid(), type: 'presenters', settings: { heading: '오늘의 발표자' } },
  ]

  return {
    version: 1,
    tokens: { ...DEFAULT_TOKENS, brand: brandByCode[templateCode] || DEFAULT_TOKENS.brand, surface: templateCode === 'conference' ? 'dark' : 'light' },
    scenes: { enter: { sections }, lobby: { sections: lobbySections } },
  }
}

export const newSectionId = uid
