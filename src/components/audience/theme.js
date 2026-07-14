import { deriveTokens } from '@/components/audience/sections/registry'

/**
 * 청중 화면 테마 파생 (PRD §4 — 테마 1개가 입장부터 종료까지)
 *
 * 세션 템플릿(code) + 에셋(background_image/logo)에서 장면 공용
 * 시각 속성을 만든다. P2 편집기(장면 시뮬레이터)가 같은 함수를
 * import해 미리보기와 실제 화면의 테마 일치를 보장한다.
 *
 * E0 확장: designTokens(게시된 디자인의 tokens)가 있으면 브랜드 토큰이
 * 라이브 헤더 밴드·종료 배경·로비 폴백까지 관통한다.
 * - designTokens 없으면 기존 템플릿 기반 반환값 그대로 (기존 세션 시각 불변 — 절대 원칙)
 * - 반환 shape 일관: heroBand(클래스) + heroBandStyle(스타일 | undefined) 병행,
 *   fallbackBg(클래스) + fallbackStyle(스타일 | undefined), endedStyle(스타일 | undefined)
 */
export function deriveAudienceTheme(template, assets, designTokens = null) {
  const bgImage = assets?.background_image?.value || null
  const logo = assets?.logo?.value || null
  const code = template?.code || null

  // 템플릿별 폴백 그라데이션 (배경 이미지 미설정 시) — LobbyView 기존 값과 동일
  const fallbackBg = (() => {
    switch (code) {
      case 'symposium':
        return 'bg-gradient-to-b from-indigo-600 via-indigo-700 to-purple-800'
      case 'conference':
        return 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700'
      case 'workshop':
        return 'bg-gradient-to-br from-slate-100 to-slate-200'
      default:
        return 'bg-gradient-to-b from-slate-50 to-indigo-50'
    }
  })()

  // 라이브 헤더 밴드 (좁은 영역용 가로 그라데이션)
  const heroBand = (() => {
    switch (code) {
      case 'symposium':
        return 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white'
      case 'conference':
        return 'bg-gradient-to-r from-slate-900 to-slate-700 text-white'
      case 'workshop':
        return 'bg-white text-slate-900 border-b border-slate-200'
      default:
        return 'bg-white text-slate-900 border-b border-slate-200'
    }
  })()

  const isDarkBg = !!bgImage || code === 'symposium' || code === 'conference'
  const isDarkBand = code === 'symposium' || code === 'conference'

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined

  const base = {
    bgImage,
    logo,
    code,
    fallbackBg,
    heroBand,
    isDarkBg,
    isDarkBand,
    bgStyle,
    brand: null,
    heroBandStyle: undefined,
    fallbackStyle: undefined,
    endedStyle: undefined,
    endedInkDark: false,
  }

  // ── 게시 디자인 토큰 없음 → 기존 동작 그대로 (기존 세션 시각 불변) ──
  if (!designTokens) return base

  // ── E0: 브랜드 토큰 관통 — registry.deriveTokens와 동일 파생 (렌더러 단일화) ──
  const t = deriveTokens(designTokens)
  const rgb = t.cssVars['--lp-brand-rgb'] // 'r,g,b'
  const onBrand = t.cssVars['--lp-on-brand'] // 밝은 brand면 어두운 텍스트 (#1b2130)

  return {
    ...base,
    brand: t.brand,
    // 라이브 헤더 — 클래스 대신 브랜드 가로 그라데이션 style
    heroBand: '',
    heroBandStyle: {
      background: `linear-gradient(90deg, ${t.brand}, rgba(${rgb},0.75))`,
      color: onBrand,
    },
    isDarkBand: onBrand === '#ffffff',
    // 로비 폴백 배경 (배경 이미지 미설정 시) — surface·brand 파생
    isDarkBg: !!bgImage || t.isDark,
    fallbackStyle: t.isDark
      ? { background: '#0f1320' }
      : { background: `linear-gradient(180deg, rgba(${rgb},0.14), #f8fafc 55%)` },
    // 종료 화면 배경/텍스트 — 브랜드가 종료까지 이어진다
    endedStyle: t.isDark
      ? { background: 'linear-gradient(180deg, #0f1320, #1a2030)', color: '#e8eaf2' }
      : { background: `linear-gradient(180deg, ${t.brand}, rgba(${rgb},0.78))`, color: onBrand },
    endedInkDark: !t.isDark && onBrand !== '#ffffff',
  }
}
