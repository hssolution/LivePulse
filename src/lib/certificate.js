/**
 * 수료증 — 브라우저에서 캔버스로 그리고 PNG/PDF 로 내려받는다 (028, 서버 비용 없음).
 *
 * - 그림: A4 가로 비율(2000×1414) 캔버스. 템플릿 classic(기본)·modern 두 가지.
 * - PDF: 캔버스 JPEG 한 장을 A4 가로 쪽에 꽉 채운 최소 PDF 를 직접 만든다(라이브러리 없음).
 *   글자를 그림으로 넣으므로 한글 글꼴을 PDF 에 심을 필요가 없다.
 */

export const CERT_W = 2000
export const CERT_H = 1414
export const CERT_TEMPLATES = ['classic', 'modern']

const SERIF = '"Noto Serif KR", "Nanum Myeongjo", "AppleMyungjo", "Batang", serif'
const SANS = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif'

/** 수료증 날짜 문자열 — 행사 시작일(한국 시간) */
export function formatCertDate(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Seoul',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

/** 글자 단위 줄바꿈(한글은 띄어쓰기 없이도 끊긴다). 영문은 단어 단위 우선 */
function wrapText(ctx, text, maxWidth) {
  const lines = []
  const words = String(text).split(/(\s+)/)
  let line = ''
  for (const w of words) {
    const test = line + w
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
      continue
    }
    if (line.trim()) lines.push(line.trim())
    // 한 단어가 너무 길면 글자 단위로
    if (ctx.measureText(w).width > maxWidth) {
      let part = ''
      for (const ch of w) {
        if (ctx.measureText(part + ch).width > maxWidth) {
          lines.push(part)
          part = ch
        } else part += ch
      }
      line = part
    } else {
      line = w.trimStart()
    }
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

/** 남는 폭에 맞춰 글자 크기를 줄인다 */
function fitFont(ctx, text, weight, family, size, maxWidth, min = 24) {
  let s = size
  ctx.font = `${weight} ${s}px ${family}`
  while (s > min && ctx.measureText(text).width > maxWidth) {
    s -= 2
    ctx.font = `${weight} ${s}px ${family}`
  }
  return s
}

/** 그리기 전에 필요한 웹 글꼴(해당 글자 범위)을 받아 둔다 */
export async function ensureCertFonts(texts) {
  if (typeof document === 'undefined' || !document.fonts?.load) return
  const sample = texts.filter(Boolean).join(' ')
  const specs = [
    `700 80px "Noto Serif KR"`,
    `400 40px "Noto Serif KR"`,
    `900 80px "Noto Serif KR"`,
    `700 80px "Pretendard Variable"`,
    `400 40px "Pretendard Variable"`,
    `800 80px "Pretendard Variable"`,
  ]
  try {
    await Promise.all(specs.map((s) => document.fonts.load(s, sample).catch(() => null)))
    await document.fonts.ready
  } catch {
    /* 글꼴을 못 받아도 시스템 글꼴로 그린다 */
  }
}

/** 직인에 넣을 글자 — 한글이 2자 이상이면 한글 앞 4자(세로쓰기), 아니면 단어 머리글자 최대 3자(가로) */
function sealChars(text) {
  const s = String(text || '')
  const hangul = Array.from(s.replace(/[^\uac00-\ud7a3]/g, ''))
  if (hangul.length >= 2) return { chars: hangul.slice(0, 4), vertical: true }
  const initials = s.split(/\s+/).filter(Boolean).map((w) => Array.from(w)[0].toUpperCase()).slice(0, 3)
  return { chars: initials.length ? initials : ['L', 'P'], vertical: false }
}

/** 붉은 원형 직인 */
function drawSeal(ctx, cx, cy, r, text, family) {
  ctx.save()
  ctx.strokeStyle = 'rgba(200, 30, 30, 0.85)'
  ctx.fillStyle = 'rgba(200, 30, 30, 0.85)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r - 10, 0, Math.PI * 2)
  ctx.stroke()
  const { chars, vertical } = sealChars(text)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (!vertical || chars.length <= 2) {
    const str = chars.join('')
    ctx.font = `700 ${Math.round(r * (str.length >= 3 ? 0.5 : 0.62))}px ${family}`
    if (vertical) {
      // 한글 2자는 세로로
      ctx.fillText(chars[0], cx, cy - r * 0.3 + 2)
      ctx.fillText(chars[1], cx, cy + r * 0.3 + 2)
    } else {
      ctx.fillText(str, cx, cy + 2)
    }
  } else {
    // 2×2 세로쓰기: 오른쪽 열 위→아래, 왼쪽 열 위→아래 (3자면 왼쪽 열 가운데)
    ctx.font = `700 ${Math.round(r * 0.5)}px ${family}`
    const d = r * 0.3
    const pos = chars.length === 3
      ? [[cx + d, cy - d], [cx + d, cy + d], [cx - d, cy]]
      : [[cx + d, cy - d], [cx + d, cy + d], [cx - d, cy - d], [cx - d, cy + d]]
    chars.forEach((ch, i) => ctx.fillText(ch, pos[i][0], pos[i][1] + 2))
  }
  ctx.restore()
}

/**
 * 캔버스에 수료증을 그린다.
 * data: { name, affiliation, title, start_at, issuer, certificate_no, template }
 * text: { heading, subheading, body(title)=>string, recipientSuffix, dateLabel, issuerLabel, noLabel, sealSuffix }
 */
export function drawCertificate(canvas, data, text, lang = 'ko') {
  canvas.width = CERT_W
  canvas.height = CERT_H
  const ctx = canvas.getContext('2d')
  const tpl = CERT_TEMPLATES.includes(data.template) ? data.template : 'classic'
  const W = CERT_W
  const H = CERT_H
  const dateStr = formatCertDate(data.start_at, lang)
  const name = String(data.name || '').trim()
  const issuer = String(data.issuer || '').trim()

  ctx.textBaseline = 'alphabetic'

  if (tpl === 'classic') {
    // 바탕·테두리
    ctx.fillStyle = '#fffdf5'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#a8862f'
    ctx.lineWidth = 16
    ctx.strokeRect(48, 48, W - 96, H - 96)
    ctx.lineWidth = 3
    ctx.strokeRect(84, 84, W - 168, H - 168)
    // 모서리 장식
    ctx.fillStyle = '#a8862f'
    for (const [x, y] of [[84, 84], [W - 84, 84], [84, H - 84], [W - 84, H - 84]]) {
      ctx.beginPath()
      ctx.moveTo(x, y - 22)
      ctx.lineTo(x + 22, y)
      ctx.lineTo(x, y + 22)
      ctx.lineTo(x - 22, y)
      ctx.closePath()
      ctx.fill()
    }

    ctx.fillStyle = '#5b4a1e'
    ctx.textAlign = 'left'
    ctx.font = `400 30px ${SERIF}`
    ctx.fillText(`${text.noLabel} ${data.certificate_no || ''}`, 150, 175)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#2b2414'
    ctx.font = `900 ${lang === 'en' ? 96 : 140}px ${SERIF}`
    ctx.fillText(text.heading, W / 2, 360)
    ctx.fillStyle = '#a8862f'
    ctx.font = `600 34px ${SERIF}`
    ctx.fillText(text.subheading, W / 2, 430)

    // 이름
    ctx.fillStyle = '#1f1a10'
    const ns = fitFont(ctx, name + text.recipientSuffix, 700, SERIF, 92, W - 500)
    ctx.font = `700 ${ns}px ${SERIF}`
    ctx.fillText(name + text.recipientSuffix, W / 2, 590)
    ctx.strokeStyle = '#a8862f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W / 2 - 420, 625)
    ctx.lineTo(W / 2 + 420, 625)
    ctx.stroke()
    if (data.affiliation) {
      ctx.fillStyle = '#6b5c35'
      ctx.font = `400 38px ${SERIF}`
      ctx.fillText(String(data.affiliation), W / 2, 685)
    }

    // 본문
    ctx.fillStyle = '#2b2414'
    ctx.font = `400 46px ${SERIF}`
    const lines = wrapText(ctx, text.body(data.title || ''), W - 520)
    lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, W / 2, 800 + i * 72))

    // 날짜·주최
    ctx.font = `400 44px ${SERIF}`
    ctx.fillText(dateStr, W / 2, 1110)
    const is = fitFont(ctx, issuer, 700, SERIF, 60, W - 800)
    ctx.font = `700 ${is}px ${SERIF}`
    ctx.fillText(issuer, W / 2, 1215)
    const iw = ctx.measureText(issuer).width
    drawSeal(ctx, W / 2 + iw / 2 + 90, 1195, 62, issuer, SERIF)
  } else {
    // modern — 흰 바탕 + 왼쪽 띠
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#4f46e5')
    grad.addColorStop(1, '#7c3aed')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 150, H)
    ctx.fillStyle = 'rgba(79,70,229,0.08)'
    ctx.beginPath()
    ctx.arc(W - 120, 120, 320, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(95, H - 90)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.font = `800 40px ${SANS}`
    ctx.textAlign = 'left'
    ctx.fillText('LivePulse', 0, 0)
    ctx.restore()

    const L = 270
    ctx.textAlign = 'left'
    ctx.fillStyle = '#64748b'
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(`${text.noLabel} ${data.certificate_no || ''}`, L, 170)

    ctx.fillStyle = '#4f46e5'
    ctx.font = `800 ${lang === 'en' ? 92 : 120}px ${SANS}`
    ctx.fillText(text.heading, L, 330)
    ctx.fillStyle = '#94a3b8'
    ctx.font = `700 32px ${SANS}`
    ctx.fillText(text.subheading, L, 395)

    ctx.fillStyle = '#0f172a'
    const ns = fitFont(ctx, name + text.recipientSuffix, 800, SANS, 104, W - L - 200)
    ctx.font = `800 ${ns}px ${SANS}`
    ctx.fillText(name + text.recipientSuffix, L, 590)
    ctx.fillStyle = '#4f46e5'
    ctx.fillRect(L, 625, 160, 8)
    if (data.affiliation) {
      ctx.fillStyle = '#475569'
      ctx.font = `400 40px ${SANS}`
      ctx.fillText(String(data.affiliation), L, 700)
    }

    ctx.fillStyle = '#1e293b'
    ctx.font = `400 46px ${SANS}`
    const lines = wrapText(ctx, text.body(data.title || ''), W - L - 220)
    lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, L, 820 + i * 72))

    // 아래 줄: 날짜(왼쪽) · 주최(오른쪽)
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(L, 1130)
    ctx.lineTo(W - 150, 1130)
    ctx.stroke()
    ctx.fillStyle = '#94a3b8'
    ctx.font = `700 28px ${SANS}`
    ctx.fillText(text.dateLabel, L, 1190)
    ctx.fillStyle = '#0f172a'
    ctx.font = `700 46px ${SANS}`
    ctx.fillText(dateStr, L, 1255)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#94a3b8'
    ctx.font = `700 28px ${SANS}`
    ctx.fillText(text.issuerLabel, W - 330, 1190)
    ctx.fillStyle = '#0f172a'
    const is = fitFont(ctx, issuer, 800, SANS, 52, W - L - 900)
    ctx.font = `800 ${is}px ${SANS}`
    ctx.fillText(issuer, W - 330, 1255)
    drawSeal(ctx, W - 230, 1215, 62, issuer, SANS)
  }
}

/* ---------------- 최소 PDF (JPEG 한 장) ---------------- */

const enc = new TextEncoder()

function dataUrlToBytes(dataUrl) {
  const b64 = dataUrl.split(',')[1] || ''
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** JPEG 바이트를 A4 가로 쪽에 꽉 채운 PDF Blob */
export function jpegToPdfBlob(jpeg, imgW, imgH) {
  const pageW = 841.89
  const pageH = 595.28
  const parts = []
  const offsets = []
  let length = 0
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const obj = (n, body) => {
    offsets[n] = length
    push(`${n} 0 obj\n`)
    if (Array.isArray(body)) body.forEach(push)
    else push(body)
    push('\nendobj\n')
  }

  push('%PDF-1.4\n')
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])) // 바이너리 표시 주석
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  )
  obj(4, [
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    '\nendstream',
  ])
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)

  const xrefAt = length
  let xref = 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  push(xref)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`)
  return new Blob(parts, { type: 'application/pdf' })
}

/** 캔버스 → PDF Blob */
export function canvasToPdfBlob(canvas) {
  const jpeg = dataUrlToBytes(canvas.toDataURL('image/jpeg', 0.92))
  return jpegToPdfBlob(jpeg, canvas.width, canvas.height)
}

/** 캔버스 → PNG Blob */
export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

/** Blob 을 파일로 내려받기 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
