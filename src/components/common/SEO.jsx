import { Helmet } from 'react-helmet-async'

export default function SEO({ 
  title, 
  description = '실시간 청중 참여 및 소통 플랫폼', 
  image = '/og-image.png',
  url 
}) {
  const siteTitle = 'LivePulse'
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle
  const currentUrl = url || window.location.href

  return (
    <Helmet>
      {/* 기본 메타 태그 */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph (Facebook, Kakao, etc.) */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}

