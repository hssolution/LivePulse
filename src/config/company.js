/**
 * 사업자 정보 (전자상거래법상 의무 표시)
 * 약관·푸터·결제·세금계산서 발행 시 공통 사용
 */
export const COMPANY = {
  // 서비스명
  serviceName: 'LivePulse',

  // 사업자 정보
  name: 'HS솔루션',
  representative: '이희상',
  businessNumber: '109-09-41451',
  businessNumberFormatted: '109-09-41451',

  // 통신판매업 신고번호 (TODO: 정확한 번호 입력 필요)
  mailOrderNumber: '제0000-경기남양주-0000호',

  // 사업장 주소
  address: '경기도 남양주시 다산중앙로19번길 25-23, F445호',
  addressDetail: '(다산동, 다산진건 블루웨일 지식산업센터 2차)',

  // 사업 종류
  businessCategory: '출판, 영상, 방송통신 및 정보서비스업',
  businessItem: '소프트웨어 개발 및 공급',

  // 과세 형태
  taxType: '일반과세자',

  // 개업일
  establishedAt: '2013-08-02',

  // 연락처
  email: 'lhscj2466@gmail.com',
  phone: '0000-0000', // TODO: 고객센터 전화번호 입력 필요

  // 입금 계좌 (계좌이체용)
  bank: {
    name: '국민은행',
    accountNumber: '45120101265238',
    accountHolder: '이희상(HS솔루션)',
  },

  // 발급 정보
  issuedAt: '2022-01-05',
  issuedBy: '구리세무서장',
}

/**
 * 화면 표시용 한 줄 사업자 정보
 */
export const COMPANY_INFO_LINE = [
  `상호: ${COMPANY.name}`,
  `대표: ${COMPANY.representative}`,
  `사업자등록번호: ${COMPANY.businessNumberFormatted}`,
  `통신판매업신고: ${COMPANY.mailOrderNumber}`,
  `주소: ${COMPANY.address} ${COMPANY.addressDetail}`,
  `이메일: ${COMPANY.email}`,
].join(' | ')
