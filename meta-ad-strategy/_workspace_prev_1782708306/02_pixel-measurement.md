# 02 · 픽셀/CAPI & 리드젠 ROAS 측정 설계 (kaicompany.kr)

> 작성: meta-pixel-architect · 기준일 2026-06-19
> 목적: **상담 문의 = 전환**을 정확히 측정하고, 계약 가치를 역산한 **리드젠 ROAS 프록시**를 산출.
> 모든 코드/설정은 **실제 `index.html` 구조 기준**(추측 아님). 가정·미확인 항목은 별도 표기.

---

## 0. 실제 사이트 현황 (Read 기반 사실 / 가정 구분)

### 확인된 사실 (index.html · js/main.js · js/actions.js 직접 확인)
| 항목 | 현황 | 위치 |
|---|---|---|
| **메타 픽셀** | ❌ **미설치** (`fbq` 없음, `connect.facebook.net` 없음) | head 전체 |
| **GA4** | ✅ 설치됨 — `gtag.js`, 측정 ID `G-PGRT2EH876` | index.html:8-14 |
| **GTM** | ❌ 미설치 (gtag 직접 삽입, 컨테이너 없음) | — |
| **상담 폼** | ✅ 존재 — `[data-contact-form]`, 필드: name·phone·email·interests(체크박스)·message | index.html:1293-1362 |
| **폼 전송 방식** | **AJAX(`fetch`)** — `e.preventDefault()` 후 Formsubmit AJAX + Make 웹훅. **페이지 이동 없음** | main.js:280-371 |
| **폼 성공 판정** | `await Promise.all([mailPromise, notionPromise])` 성공 시 "정상 접수" 표시 | main.js:356-362 |
| **카카오 오픈채팅 CTA** | ✅ 2곳 — 헤더 `LET'S TALK`(index.html:53), 우하단 플로팅 CTA(index.html:1407). 둘 다 `open.kakao.com/me/kaicompany` `target="_blank"` | — |
| **회사소개서** | ✅ Hero의 `회사소개서 다운로드` 버튼 → `assets/KAI_COMPANY_PROFILE.html` 새 탭(실제 파일 존재 확인) | index.html:96 |
| **이메일 CTA** | `mailto:kaiandcomp@gmail.com` (contact·footer) | index.html:1281, 1401 |
| **포트폴리오 모달** | 카드 클릭 시 `[data-card]` 모달 오픈(영상 재생) — 관심 신호 | index.html:1371-1383 |
| **호스팅 스택** | 정적 HTML/CSS/Vanilla JS(빌드 도구·서버 프레임워크 없음). 폼은 Formsubmit + Make 웹훅에 의존 | — |

### 핵심 측정 함의
1. **폼이 AJAX다** → 표준 "thank-you 페이지 도달" 트리거를 못 쓴다. **Lead 이벤트는 `Promise.all` 성공 콜백 안에서 명시적으로 fire**해야 한다(클릭이 아니라 *접수 성공* 시점). → 4단계 코드 참조.
2. **카카오 클릭은 페이지 이탈**(`target="_blank"` 새 탭이라 현재 탭은 유지되나, 사용자는 카톡으로 이동) → 픽셀이 자동으로 못 잡는다. **클릭 시점 커스텀 이벤트 명시 fire 필수.**
3. **서버가 없다**(정적 사이트) → CAPI는 ①**CAPI Gateway**(메타 호스팅, 코드리스) 또는 ②**기존 Make 시나리오에 CAPI 노드 추가**(폼 데이터가 이미 Make로 흐르므로 가장 저비용)로 구현하는 게 합리적. → 1단계 참조.
4. **GA4가 이미 있다** → 같은 사용자 행동을 GA4 이벤트로도 이중 기록해 3층(픽셀·GA4·CRM) 대조 가능.

### 가정 (현장 확인 필요)
- [ ] 비즈니스 관리자(Meta Business Manager)·광고 계정·픽셀 ID 발급 여부 — **미생성으로 가정**, 1단계에서 생성 전제.
- [ ] Make 시나리오(`hook.eu2.make.com/...`)에 외부 모듈(HTTP/CAPI) 추가 가능한 유료 플랜인지 — 확인 필요.
- [ ] 상담 CRM = 현재는 **Gmail 수신함 + Make→노션 DB**가 사실상 CRM. 계약 단계 관리 컬럼 유무 확인 필요(오프라인 전환 업로드의 소스).
- [ ] 도메인 `kaicompany.kr` DNS 접근 권한(도메인 인증 TXT 레코드용).
- [ ] 평균 계약가치·상담→계약 전환율 실데이터 — **미확보로 가정**, 5단계에서 플레이스홀더 + 시나리오 제공.

---

## 1. 설치 (Pixel + Conversions API)

### 1-A. 사전 준비 (Business Manager)
1. business.facebook.com → 비즈니스 관리자 생성(없으면).
2. **이벤트 관리자(Events Manager)** → 데이터 소스 → **새 픽셀 생성** → 이름 `KAICOMPANY_PIXEL` → **픽셀 ID 확보**(예: `PIXEL_ID`, 16자리 숫자).
3. **단일 픽셀 ID 원칙** — 사이트 전체에서 픽셀 1개만 사용(중복 픽셀은 중복집계·매칭 저하).

### 1-B. Base Pixel 설치 (index.html `<head>`)
GA4 `gtag` 블록 **바로 아래**(index.html:14 다음 줄)에 삽입. `PIXEL_ID`를 실제 ID로 치환.

```html
<!-- Meta Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'PIXEL_ID');
  fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=PIXEL_ID&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel -->
```

> `fbq('init', ...)`에 **Advanced Matching(자동 고급 매칭)**을 켜면 폼 입력값(em/ph)을 픽셀이 자동 해시·전송해 매치품질이 오른다. Events Manager → 설정 → "자동 고급 매칭" 토글 ON 권장(3단계 참조).

### 1-C. Conversions API (서버사이드 보강 — 신호 누락 방지)
정적 사이트라 자체 서버가 없다. **권장 경로 2개 중 택1:**

**옵션 A — Make 시나리오에 CAPI 추가 (권장, 최저비용·기존 데이터흐름 재사용)**
폼 데이터가 이미 `data-notion-webhook`(Make)으로 흐른다(main.js:348-353). Make 시나리오 끝에 **HTTP 모듈** 또는 **Facebook Conversions 모듈**을 추가해 동일 `payload`로 Lead 서버이벤트를 전송:
- 엔드포인트: `https://graph.facebook.com/v21.0/PIXEL_ID/events?access_token=SYSTEM_USER_TOKEN`
- 바디(JSON):
```json
{
  "data": [{
    "event_name": "Lead",
    "event_time": 1718800000,
    "event_id": "{{브라우저와 동일한 event_id}}",
    "action_source": "website",
    "event_source_url": "https://kaicompany.kr/",
    "user_data": {
      "em": ["<sha256(이메일 소문자·trim)>"],
      "ph": ["<sha256(국가코드포함 숫자만)>"],
      "client_user_agent": "{{User-Agent}}",
      "fbp": "{{_fbp 쿠키}}",
      "fbc": "{{_fbc 쿠키}}"
    },
    "custom_data": { "content_name": "contact_form", "value": 1000000, "currency": "KRW" }
  }]
}
```
> **중요:** 브라우저 Lead와 **같은 `event_id`**를 보내야 디듀프된다(4단계). 그러려면 폼 제출 JS가 만든 `event_id`를 `payload`에 실어 Make로 넘겨야 한다 → 4단계 코드에 `eventId`를 payload에 추가하는 라인 포함.

**옵션 B — CAPI Gateway (코드리스, 서버 운영 없이)**
Meta가 호스팅하는 CAPI Gateway를 클라우드(AWS/GCP)에 1클릭 배포. 픽셀 이벤트를 자동으로 서버 미러링·디듀프. 장점: 코드 최소. 단점: 월 클라우드 비용 + 초기 셋업. **Make 플랜이 외부 모듈 불가일 때 대안.**

> **System User 토큰 발급:** 비즈니스 설정 → 시스템 사용자 → 토큰 생성 → 권한 `ads_management`. 토큰은 Make의 환경변수/연결에만 저장(클라이언트 JS에 절대 노출 금지).

### 1-D. 도메인 인증
1. 비즈니스 설정 → 브랜드 가치 보호 → 도메인 → `kaicompany.kr` 추가.
2. **DNS TXT 레코드** 방식 권장(메타가 준 `facebook-domain-verification=...` 값을 DNS에 추가).
3. 인증 완료 → **AEM(Aggregated Event Measurement) 8개 이벤트 우선순위 설정 권한** 확보(3단계).

---

## 2. 전환 이벤트 맵 (B2B 리드젠)

실제 CTA·폼 구조에 맞춘 확정 매핑. **표준 이벤트 우선**(메타 최적화/AEM이 표준 이벤트에 더 강함), 보조로 커스텀 파라미터.

| 이벤트 | 표준/커스텀 | 의미 | 트리거(실제 요소) | 값(value) | 비고 |
|---|---|---|---|---|---|
| **PageView** | 표준 | 방문 | 전 페이지 로드 | — | base pixel 자동 |
| **ViewContent** | 표준 | 서비스/포트폴리오 관심 | `#services` 또는 `#work` 섹션 50% 도달(IntersectionObserver), **또는** 포트폴리오 카드 모달 오픈(`[data-card]` 클릭, index.html:1371) | — | 관심 신호·리타겟 모수 |
| **Lead** | 표준 | **상담 문의 접수** | 폼 **접수 성공** 시점(`Promise.all` 성공, main.js:357 이후) — *제출 클릭 아님* | `KRW` 리드가치(5단계) | ⭐ **핵심 최적화 이벤트** |
| **Contact** | 표준 | 카카오 오픈채팅 클릭 | `open.kakao.com` 링크 클릭(index.html:53, 1407) | — | 페이지 이탈형 → 명시 fire 필수 |
| **CompleteRegistration** | 표준 | 회사소개서 열람 | `회사소개서 다운로드` 버튼 클릭(index.html:96) | — | 마이크로 전환·미들퍼널 |
| **InitiateCheckout**(선택) | 표준 | 폼 작성 시작 | 폼 첫 필드 `focus` 1회 | — | 폼 이탈률 진단용(선택) |

### 2-A. AEM 8 이벤트 우선순위 (계약 가치순 — iOS 신호용)
도메인 인증 후 Events Manager → 종합 이벤트 측정에서 아래 순서로(높을수록 우선):

```
1. Lead                 (상담 접수 = 최고 가치)
2. Contact              (카카오 오픈채팅 = 즉시 대화, 高의향)
3. CompleteRegistration (회사소개서 열람)
4. InitiateCheckout     (폼 작성 시작, 쓰는 경우)
5. ViewContent          (서비스/포트폴리오 관심)
6. PageView
7~8. (예비 — Schedule 등 추후)
```
> iOS 사용자는 우선순위 **최상위 1개 이벤트만** 집계되므로 Lead를 반드시 1순위로.

### 2-B. 구현 코드

**(1) Lead — 폼 접수 성공 시 fire** (main.js, `await Promise.all(...)` 직후 / `form.reset()` 부근에 추가)
```js
// main.js — 폼 제출 핸들러 상단(payload 생성 직전)에서 event_id 1개 생성
const eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
payload.eventId = eventId; // ← Make로 함께 전송해 CAPI 디듀프(1-C 옵션A)

// ... 기존 await Promise.all([mailPromise, notionPromise]); 성공 블록 안 ...
if (window.fbq) {
  fbq('track', 'Lead', {
    content_name: 'contact_form',
    value: 1000000,        // 5단계 리드가치(플레이스홀더). 실데이터로 교체
    currency: 'KRW'
  }, { eventID: eventId }); // ← 브라우저·서버 동일 event_id
}
if (window.gtag) gtag('event', 'generate_lead', { method: 'contact_form' }); // GA4 이중기록
```

**(2) Contact — 카카오 오픈채팅 클릭** (main.js 하단 등 전역 1회 바인딩)
```js
document.querySelectorAll('a[href*="open.kakao.com"]').forEach((a) => {
  a.addEventListener('click', () => {
    if (window.fbq) fbq('track', 'Contact', { content_name: 'kakao_openchat' });
    if (window.gtag) gtag('event', 'contact', { method: 'kakao_openchat' });
  }, { passive: true });
});
```

**(3) CompleteRegistration — 회사소개서 클릭**
```js
document.querySelectorAll('a[href*="KAI_COMPANY_PROFILE"]').forEach((a) => {
  a.addEventListener('click', () => {
    if (window.fbq) fbq('track', 'CompleteRegistration', { content_name: 'company_profile' });
    if (window.gtag) gtag('event', 'view_company_profile');
  }, { passive: true });
});
```

**(4) ViewContent — 포트폴리오 카드 모달 오픈** (기존 `[data-card]` 클릭 핸들러 안에 1줄 추가)
```js
if (window.fbq) fbq('track', 'ViewContent', {
  content_type: 'portfolio',
  content_name: card.dataset.title || 'portfolio_item'
});
```

> 모든 클릭 이벤트는 페이지 이탈 전 동기 실행되므로 픽셀 큐에 안전히 적재된다(`fbevents.js`가 큐잉). 더 안전하게 하려면 카카오 링크는 클릭 시 이벤트 fire 후 `setTimeout`으로 200ms 지연 이동 처리도 가능하나, 현재 `target="_blank"`라 현재 탭이 유지되므로 **불필요**.

---

## 3. 매치 품질(EMQ) 끌어올리기

- **자동 고급 매칭(Automatic Advanced Matching) ON**: Events Manager → 픽셀 설정 → 켜면 폼의 `email`·`phone` 입력값을 픽셀이 클라이언트에서 SHA-256 해시해 전송(원문 노출 X).
- **CAPI `user_data` 보강**(1-C): `em`, `ph`(SHA-256 해시), `fbp`(_fbp 쿠키), `fbc`(_fbc 쿠키 — fbclid 광고클릭ID), `client_user_agent`, `client_ip_address`(서버단 자동), `external_id`(있으면 리드 고유 ID 해시).
  - **해시 규칙**: em = 소문자·공백제거 후 SHA-256. ph = 국가코드 포함 숫자만(예 `821012345678`) SHA-256. **이미 해시된 값은 재해시 금지.**
- **목표 EMQ 6.0+/"좋음" 이상**. 폼은 email·phone을 필수로 받으므로(index.html:1314·1321) 매칭 소스가 강하다 → CAPI에 반드시 실어 보낼 것.
- **fbp/fbc 수집**: 픽셀이 `_fbp` 쿠키를 자동 생성. `_fbc`는 광고 클릭(`?fbclid=`) 유입 시 생성 → 폼 제출 JS에서 두 쿠키를 읽어 `payload`에 포함시켜 Make→CAPI로 전달.
```js
function getCookie(n){const m=document.cookie.match('(^|;)\\s*'+n+'\\s*=\\s*([^;]+)');return m?m.pop():'';}
payload.fbp = getCookie('_fbp');
payload.fbc = getCookie('_fbc');
```

---

## 4. 픽셀 ↔ CAPI 디듀프 (중복 제거)

동일 전환이 브라우저(픽셀)+서버(CAPI) 양쪽에서 들어오므로 메타가 중복 제거해야 한다.
- **규칙**: 같은 전환의 픽셀 이벤트와 서버 이벤트가 **동일한 `event_name` + 동일한 `event_id`**(픽셀의 `eventID` = CAPI의 `event_id`)를 가지면 1건으로 합산.
- Lead는 위 4-(1) 코드의 `eventId`를 ①픽셀 `{ eventID }` ②payload→Make→CAPI `event_id` 양쪽에 동일하게 사용 → 디듀프 보장.
- **검증**: Events Manager → 테스트 이벤트 + "이벤트 디듀플리케이션" 카드에서 "서버/브라우저 중복 제거됨" 표시 확인.

---

## 5. 오프라인 전환으로 ROAS 보강 (리드젠 핵심)

리드젠은 "상담 → 계약"이 광고 밖(카톡 상담·미팅)에서 일어난다. 계약 성사를 메타에 **되먹임**해야 "어떤 광고가 진짜 돈을 만들었나"를 학습한다.

1. **오프라인 이벤트 세트 생성**: Events Manager → 오프라인 이벤트 세트 → 광고 계정 연결.
2. **계약 성사 데이터 소스**: 현재 사실상 CRM = **Make→노션 DB**(main.js:348). 노션 리드 레코드에 `상태`(문의→상담→계약) + `계약금액` 컬럼을 둔다(없으면 추가 — 현장 확인 항목).
3. **업로드 방식**:
   - 수동: 월 1~2회 계약 성사 건(이메일·전화·event_id 매칭 키 포함)을 CSV로 Events Manager 업로드.
   - 자동(권장): 노션에서 `상태=계약`으로 바뀌면 Make가 **오프라인 전환 API**(또는 CAPI `action_source: "system_generated"`)로 `Purchase`(value=계약금액, currency=KRW) 전송. 매칭 키 = 리드 제출 시 저장한 em/ph 해시 + event_id.
4. 결과: 메타가 **가치 기반 입찰**(계약가치 높은 리드를 닮은 사용자 타겟)을 학습 → performance-strategist의 가치기반 캠페인 입력으로 사용.

---

## 6. 리드젠 ROAS 프록시 산식

직접 매출이 없으므로 가치를 역산한다.

```
리드 가치(LTV proxy) = 평균 계약가치 × (상담→계약 전환율)
리드젠 ROAS(프록시) = (유효 리드 수 × 리드 가치) ÷ 광고비
CPL = 광고비 ÷ 리드 수
CAC = 광고비 ÷ 계약 수
```

### 6-A. 값 입력 (⚠️ 실데이터 필요 — 아래는 가정 시나리오)
| 변수 | 값(가정) | 출처/확인필요 |
|---|---|---|
| 평균 계약가치(월 리테이너 × 평균 계약개월) | **₩10,000,000** (예: 월 250만 × 4개월) | ⚠️ 실데이터 입력 필요 |
| 상담→계약 전환율 | **10%** | ⚠️ 노션 CRM에서 산출 |
| → **리드 가치** | **₩1,000,000** | = 1,000만 × 10% |

> 4단계 Lead 이벤트의 `value: 1000000`은 이 리드 가치다. **실데이터 확정 시 코드의 value와 본 표를 함께 갱신.**

### 6-B. 시나리오 (광고비 월 ₩3,000,000 가정)
| 리드 수 | CPL | 계약(10%) | 리드젠 ROAS | 해석 |
|---|---|---|---|---|
| 10 | ₩300,000 | 1.0 | (10×100만)÷300만 = **3.3x** | 손익분기 부근 |
| 20 | ₩150,000 | 2.0 | **6.7x** | 양호 |
| 30 | ₩100,000 | 3.0 | **10.0x** | 우수 |

> 메타 Ads Manager에서 Lead 이벤트 `value`를 리드가치로 설정하면 ROAS 컬럼이 자동 계산되고 가치기반 입찰이 가능.

---

## 7. 측정 대시보드 (3층 대조)

### 7-A. Ads Manager 커스텀 컬럼
`결과(Lead) / 결과당 비용(=CPL) / Contact 수 / CompleteRegistration / 구매당 가치(ROAS, value 설정 시) / EMQ(이벤트 관리자) / 빈도 / CTR`

### 7-B. GA4 (이미 설치 G-PGRT2EH876)
- 4단계에서 심은 `generate_lead`·`contact`·`view_company_profile` 이벤트를 GA4 **주요 이벤트(전환)**로 표시.
- **UTM 필수**: 모든 메타 광고 링크에 `utm_source=meta&utm_medium=paid&utm_campaign=...&utm_content=소재명` → GA4에서 캠페인·소재별 리드 추적.
- 탐색 보고서: 랜딩(`/`) → 폼 도달 → 제출 퍼널 + 이탈 지점.

### 7-C. 상담 CRM(노션 DB)
- 리드 → 상담 → 계약 단계별 전환율(= 광고 밖 진실, 6단계 산식의 입력).
- 주간 1회 **3층 대조**: Ads Manager Lead 수 ≈ GA4 generate_lead ≈ 노션 신규 리드. 큰 괴리 시 신호 누락/디듀프 점검.

---

## 8. 개인정보·정책 체크리스트
- [ ] **개인정보처리방침에 픽셀/CAPI·GA4 데이터 처리 고지** 추가(현재 사이트에 처리방침 링크 미확인 — 신설 권장). 폼이 이름·연락처·이메일을 수집하므로 수집·이용 동의 문구 필수.
- [ ] 폼에 **개인정보 수집·이용 동의 체크박스** 추가 권장(현재 미존재 — index.html:1352 message 필드 하단).
- [ ] em/ph는 **SHA-256 해시 후** 전송, 원문 비해시 전송 금지. System User 토큰 클라이언트 노출 금지.
- [ ] 민감 카테고리(건강·금융) 단정 표현 회피, 메타 광고정책 준수.
- [ ] 도메인 인증 완료 + AEM 8 이벤트 설정.
- [ ] 픽셀+CAPI `event_id` 디듀프 검증(4단계).
- [ ] 쿠키/추적 고지(가능하면 동의 배너) — 한국 ePrivacy 수준 최소 고지.

---

## performance-strategist 인계 사항
- **최적화 기준 전환 = `Lead`**(상담 폼 접수 성공). 캠페인 전환 최적화·CAPI 디듀프 이벤트로 이것을 지정.
- **보조 전환** = `Contact`(카카오 클릭). 카카오 상담 비중이 높으면 별도 캠페인의 최적화 이벤트로 승격 검토.
- **리드 가치 = ₩1,000,000(가정)** → 가치기반 입찰 입력값. 실데이터 확정 시 갱신.
- 리타겟 모수: `ViewContent`(서비스·포트폴리오 관심) 도달 사용자.

---

## 지금 당장 설치할 3가지
1. **메타 픽셀 base 코드 설치** — Events Manager에서 픽셀 생성 후 `PIXEL_ID` 발급, index.html `<head>`의 GA4 블록(line 14) 바로 아래에 1-B 스니펫 삽입 + `fbq('track','PageView')`. (자동 고급 매칭 ON)
2. **Lead 이벤트 정확 트리거** — main.js 폼 핸들러의 `Promise.all` **성공 블록**(main.js:357 이후)에 `fbq('track','Lead',{value,currency},{eventID})` 추가(제출 클릭 아님, 접수 성공 시점). 동시에 `eventId`를 `payload`에 실어 Make→CAPI 디듀프 준비.
3. **카카오 오픈채팅 클릭 추적** — `a[href*="open.kakao.com"]`(헤더 + 플로팅 CTA 2곳)에 클릭 시 `fbq('track','Contact')` 바인딩. 페이지 이탈형이라 이게 없으면 가장 중요한 상담 채널이 측정에서 통째로 누락됨.
