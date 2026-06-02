/**
 * 한국 전화번호 자동 포맷터
 *
 * 입력값에서 숫자만 추출한 뒤 길이에 따라 하이픈을 삽입합니다.
 * 입력 도중에도 자연스럽게 마스킹되며, DB에 저장된 값(하이픈 유/무 모두) 입력 시
 * 정규화된 형식으로 반환합니다.
 *
 * 지원 패턴:
 *   - 02-XXX-XXXX        (서울 9자리)
 *   - 02-XXXX-XXXX       (서울 10자리)
 *   - 0XX-XXX-XXXX       (지역·070·050 등 10자리)
 *   - 0XX-XXXX-XXXX      (휴대폰·070 등 11자리)
 *
 * @param {string} value
 * @returns {string}
 */
export function formatKoreanPhone(value) {
  if (!value) return ''
  const d = String(value).replace(/\D/g, '').slice(0, 11)
  if (!d) return ''

  // 서울 (02)
  if (d.startsWith('02')) {
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, 2)}-${d.slice(2)}`
    if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}`
  }

  // 기타 (0XX 3자리 prefix)
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

/**
 * 전화번호 유효성 검사 (간단)
 * 9~11자리 숫자 또는 그에 해당하는 하이픈 포함 문자열
 */
export function isValidKoreanPhone(value) {
  if (!value) return false
  const d = String(value).replace(/\D/g, '')
  return d.length >= 9 && d.length <= 11
}
