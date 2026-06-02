# 💳 결제 시스템 도입 계획

> LivePulse 카드 결제 도입 마스터 플랜
> 결정: **포트원 V2 + 토스페이먼츠 추천 패키지**
> 작성일: 2026-05-12

---

## 📌 핵심 결정 요약

| 항목 | 결정 |
|---|---|
| 결제 인프라 | **포트원 V2** (PortOne) |
| PG사 | **토스페이먼츠** (포트원 추천 패키지로 가입비/연관리비 0원) |
| 시작 비용 | **0원** (월 매출 5천만 미만 동안) |
| 추후 비용 | 매출 5천만 돌파 시 월 10만원~ (Growth 플랜) |
| 코드 추상화 | `PaymentProvider` 인터페이스로 한 겹 추상화 (미래 옵션 보존) |
| 도입 시점 | **즉시** (사용자 결정) |
| 통신판매업 신고 | ✅ 완료 |

---

## 🛣️ 전체 로드맵

```
Phase A: 사업/문서 준비   (3~5일)   ← 포트원 가입 전 필수
   ↓
Phase B: 포트원 가입       (1~2영업일)
   ↓
Phase C: DB 스키마         (반나절)
   ↓
Phase D: 코드 통합         (2~3주)
   ↓
Phase E: 테스트            (1주)
   ↓
🎉 운영 시작
```

---

## Phase A — 사업/문서 준비

> 포트원 심사에서 약관·환불정책·개인정보처리방침 URL을 제출해야 함.
> 이 문서들이 없으면 가입 자체가 거절됨.

### A-1. 환불정책 작성
- 근거 법률: **콘텐츠산업진흥법 + 전자상거래법**
- 핵심 조항:
  - 결제 후 7일 내 미사용 → 100% 환불
  - 사용 시작 후 → (정책 선택: 잔여 일수 일할 환불 / 환불 불가)
  - 정기결제 해지 → 다음 결제일 전 해지 시 다음 회차 미청구
  - 행사 취소 시 환불 정책 (LivePulse 특수: 가장 분쟁 많은 부분)
  - 환불 처리 기간 (영업일 5일 이내)
- 산출물: `/terms/refund` 페이지

### A-2. 이용약관 결제 조항 추가
- 결제수단, 자동결제 동의, 가격 변경 통지, 분쟁 처리
- 산출물: `/terms/service` 페이지

### A-3. 개인정보처리방침 결제 정보 처리 추가
- "결제 정보는 포트원(주식회사 코리아포트원)을 통해 처리되며, 카드번호 등은 자사 서버에 저장하지 않습니다"
- 결제 정보 보관 기간: 5년 (전자상거래법)
- 산출물: `/terms/privacy` 페이지

### A-4. 푸터 사업자 정보 노출 (전자상거래법 의무)
- 회사명 / 대표자명 / 사업자번호 / 통신판매업 신고번호
- 주소 / 고객센터 이메일 / 전화번호
- 산출물: `src/components/layout/PublicFooter.jsx` 업데이트

### A-5. 사업자 정보 (등록 완료)
- [x] 회사명: **HS솔루션**
- [x] 대표자명: **이희상**
- [x] 사업자등록번호: **109-09-41451** (일반과세자)
- [ ] 통신판매업 신고번호: **TODO** (사용자 확인 필요)
- [x] 주소: 경기도 남양주시 다산중앙로19번길 25-23, F445호 (다산동, 다산진건 블루웨일 지식산업센터 2차)
- [x] 고객센터 이메일: **lhscj2466@gmail.com**
- [ ] 고객센터 전화번호: **TODO** (사용자 확인 필요)
- [x] 사업자 입금 계좌: **국민은행 45120101265238 (이희상(HS솔루션))**

### A-6. 등록 완료된 코드
| 파일 | 역할 |
|---|---|
| `src/config/company.js` | 사업자 정보 상수 (재사용) |
| `src/components/layout/PublicFooter.jsx` | 공개 페이지 푸터 (전자상거래법 의무 정보) |
| `src/components/legal/LegalLayout.jsx` | 약관 페이지 공통 레이아웃 |
| `src/pages/legal/TermsOfService.jsx` | 이용약관 (`/legal/terms`) |
| `src/pages/legal/PrivacyPolicy.jsx` | 개인정보처리방침 (`/legal/privacy`) |
| `src/pages/legal/RefundPolicy.jsx` | 환불정책 (`/legal/refund`) |
| `src/App.jsx` | `/legal/*` 라우트 추가 |

---

## Phase B — 포트원 가입

### B-1. 가입 절차
```
[Day 1]
  1. console.portone.io 접속 → 이메일 가입 + 휴대폰 인증
  2. 기본 상점 생성

[Day 1]
  3. 비즈니스 인증 페이지에서 제출:
     - 사업자등록증 (PDF/JPG)
     - 통신판매업 신고증
     - 약관 URL (Phase A-2)
     - 환불정책 URL (Phase A-1)
     - 개인정보처리방침 URL (Phase A-3)
     - 회사 정보, 담당자 정보, 입금 계좌
  4. 추천 패키지 선택 → 토스페이먼츠 채널 신청

[Day 2~3]
  5. 포트원 심사 (오전 10시 제출이 가장 빠름)
  6. 토스페이먼츠 별도 심사 (+1일)

[Day 3~4]
  7. 승인 이메일 + 키 발급
     - V2 Store ID
     - V2 Channel Key (토스페이먼츠용)
     - V2 API Secret
```

### B-2. 환경변수 설정
```
# .env (개발)
VITE_PORTONE_STORE_ID=store-xxxx
VITE_PORTONE_CHANNEL_KEY_TOSS=channel-key-xxxx
PORTONE_API_SECRET=secret-xxxx  # 서버 전용

# 운영
VITE_PORTONE_STORE_ID=store-prod-xxxx
VITE_PORTONE_CHANNEL_KEY_TOSS=channel-key-prod-xxxx
```

### B-3. 테스트 환경
- 가입 즉시 무료로 사용 가능
- 실제 카드 결제 없이 모든 시나리오 검증 가능

---

## Phase C — DB 스키마

### C-1. 마이그레이션 파일
`supabase/migrations/012_payments.sql`

### C-2. 테이블 4종

#### subscription_plans
```sql
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,            -- 'free' | 'pro' | 'agency' | 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_yearly INTEGER NOT NULL,        -- KRW
  max_active_sessions INTEGER,
  max_participants_per_session INTEGER,
  max_team_members INTEGER,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### partner_subscriptions
```sql
CREATE TABLE public.partner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL,                 -- 'active' | 'past_due' | 'canceled' | 'expired'
  payment_provider TEXT DEFAULT 'portone',
  billing_key TEXT,                     -- 포트원 빌링키
  started_at TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### payments
```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id),
  subscription_id UUID REFERENCES public.partner_subscriptions(id),
  payment_id TEXT UNIQUE NOT NULL,      -- 포트원 paymentId
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'KRW',
  status TEXT NOT NULL,                 -- 'paid' | 'failed' | 'refunded' | 'partial_refunded'
  pg_provider TEXT,                     -- 'tosspayments'
  pg_tx_id TEXT,                        -- PG사 거래 번호
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  raw_response JSONB,                   -- 웹훅 원본 (감사용)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### refunds
```sql
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id),
  amount INTEGER NOT NULL,
  reason TEXT,
  status TEXT,
  refunded_by UUID REFERENCES auth.users(id),
  refunded_at TIMESTAMPTZ DEFAULT now()
);
```

### C-3. 시드 데이터
- subscription_plans에 Free / Pro / Agency / Enterprise 4개 플랜 등록
- → Phase A-5 + 가격 결정 후 시드 작성

---

## Phase D — 코드 통합

### D-1. PaymentProvider 추상화
```
src/lib/payments/
  ├─ provider.js       # 인터페이스 (베이스 클래스)
  ├─ portone.js        # 포트원 V2 구현
  └─ index.js          # 팩토리 (provider 선택)
```

### D-2. 페이지 추가
```
src/pages/
  ├─ Pricing.jsx                   # 가격표 + "구독하기" 버튼
  ├─ Checkout.jsx                  # 결제 페이지 (포트원 SDK 호출)
  ├─ PaymentComplete.jsx           # 결제 완료 페이지 (redirect 받음)
  ├─ partner/Billing.jsx           # 내 구독·결제 내역·카드 정보
  ├─ admin/Subscriptions.jsx       # 모든 구독 현황 (관리자)
  └─ admin/Payments.jsx            # 결제 내역, 환불 처리 (관리자)
```

### D-3. Supabase Edge Functions
```
supabase/functions/
  ├─ portone-webhook/              # 포트원 결제 결과 수신
  │  └─ index.ts
  └─ billing-cron/                 # 매일 새벽 정기결제 처리
     └─ index.ts
```

### D-4. pg_cron 설정
```sql
-- 매일 새벽 3시 → 갱신 대상 자동 청구
SELECT cron.schedule(
  'billing-charge-daily',
  '0 3 * * *',
  $$ SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/billing-cron',
       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
     ) $$
);
```

### D-5. 의존성 추가
```bash
npm install @portone/browser-sdk
```

---

## Phase E — 테스트

### E-1. 시나리오 체크리스트
```
[단발 결제]
□ 정상 결제 → payments 기록 생성
□ 결제 취소 → 적절한 상태 표시
□ 카드 한도 초과 → 실패 메시지

[빌링키 발급]
□ 카드 등록 → billing_key 저장
□ 첫 청구 즉시 발생
□ partner_subscriptions 활성화

[정기결제]
□ pg_cron 트리거 → 빌링키로 청구 → 성공
□ 결제 실패 → status='past_due' 전환 + 재시도 큐 진입
□ 카드 만료 → 사용자에게 알림

[환불]
□ 전액 환불 → refunds 기록 + payments status 변경
□ 부분 환불 → 잔여 금액 계산

[웹훅]
□ 정상 수신 → 서명 검증 통과 → 처리
□ 같은 이벤트 2번 수신 → 멱등성 (중복 처리 안 됨)
□ 잘못된 서명 → 401 반환
```

---

## ⚠️ 결정 필요 사항

### 사업자 정보 (Phase A-5)
- [ ] 회사명, 대표자명, 사업자번호, 통신판매업 신고번호, 주소
- [ ] 고객센터 이메일·전화번호
- [ ] 사업자 입금 계좌

### 플랜 가격 (Phase C 시드)
- [ ] Pro 연간: ₩______
- [ ] Agency 연간: ₩______
- [ ] Free 한도: 활성 세션 ___개, 청중 ___명/회

### Event Pass(단발) 도입 여부
- [ ] YES → 단발 결제 플로우 추가 개발
- [ ] NO → 구독만 → 코드 더 단순

### 환불 정책 디테일
- [ ] 사용 시작 후 환불 가능 여부 (가능 / 불가)
- [ ] 행사 당일 취소 시 환불율 (0% / 50% / 100%)
- [ ] 정기결제 중도 해지 시 (즉시 종료 / 기간 만료까지 사용)

### 첫 마일스톤 범위
- [ ] 옵션 1: 전부 한 번에 (4~5주)
- [ ] 옵션 2: 구독만 먼저 (2~3주), 단발은 나중에

---

## 📚 참고 링크

- [포트원 공식 요금제](https://www.portone.io/pricing)
- [포트원 V2 개발자 문서](https://developers.portone.io/)
- [포트원 추천 패키지 안내](https://help.portone.io/content/content200013)
- [토스페이먼츠 자동결제 가이드](https://docs.tosspayments.com/guides/v2/billing)
- [포트원 가입 1~2일 가이드](https://www.ganatoday.kr/2026/01/portone-1-2.html)
