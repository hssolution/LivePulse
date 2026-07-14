import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE } from '@/config/seo'

/** 상대 경로를 절대 URL로 변환 */
const toAbsolute = (pathOrUrl) => {
  if (!pathOrUrl) return SITE_URL
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

/**
 * 페이지별 SEO 메타 태그
 *
 * @param {string}  title       페이지 제목 (사이트명 자동 접미)
 * @param {string}  description 메타 설명
 * @param {string}  image       OG 이미지 (상대/절대 모두 허용)
 * @param {string}  url         canonical 경로 (미지정 시 현재 라우트 기준)
 * @param {string}  keywords    쉼표 구분 키워드 (미지정 시 기본값)
 * @param {boolean} noindex     검색 색인 제외 (로그인·세션 등 비공개 페이지)
 * @param {object|object[]} jsonLd  JSON-LD 구조화 데이터 (AEO/GEO)
 */
export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  url,
  keywords,
  noindex = false,
  jsonLd,
}) {
  const location = useLocation()
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - 강연 매칭 & 실시간 청중 소통 플랫폼`
  const canonicalUrl = toAbsolute(url || location.pathname)
  const imageUrl = toAbsolute(image)
  const keywordsContent = keywords || DEFAULT_KEYWORDS.join(', ')
  const jsonLdList = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <Helmet>
      {/* 기본 메타 태그 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordsContent} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph (Facebook, Kakao, etc.) */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ko_KR" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {/* 구조화 데이터 (JSON-LD) */}
      {jsonLdList.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  )
}
