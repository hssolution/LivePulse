/**
 * 요금 안내 문구 (오픈 기간 무료 · 이후 유료 전환 예정) — 화면 곳곳에서 이 상수만 쓴다.
 * 날짜·가격·할인은 미확정이라 넣지 않는다. 영어는 en 화면용 번역.
 */
export const OPEN_FREE = {
  ko: {
    badge: '오픈 기간 무료',
    notice:
      '지금은 오픈 기간이라 모든 기능을 무료로 쓰실 수 있습니다. 이후 유료 요금제가 도입될 예정이며, 전환 최소 30일 전에 미리 알려 드립니다. 동의 없이 결제되지 않습니다.',
    legal:
      '현재는 오픈 기간으로 유료 상품을 판매하지 않습니다. 아래 내용은 유료 요금제가 도입된 뒤 적용됩니다.',
  },
  en: {
    badge: 'Free during the launch period',
    notice:
      'All features are free during the launch period. Paid plans are planned for later; we will notify you at least 30 days before any change, and you will never be charged without your consent.',
    legal:
      'We are not selling paid products during the launch period. The terms below apply once paid plans are introduced.',
  },
}

export const openFree = (language) => OPEN_FREE[language] || OPEN_FREE.ko
