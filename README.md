# Wedding Guest Album

하객이 결혼식 사진을 직접 업로드하고, 혼주가 이를 모아 Sweetbook 포토북으로 주문하는 MVP 서비스입니다.

---

## 서비스 소개

1. **혼주**가 이벤트를 생성하면 고유 게스트 링크와 QR 코드가 발급됩니다.
2. **하객**은 로그인 없이 QR 코드를 스캔하거나 링크를 방문해 사진과 메시지를 남깁니다.
3. **혼주 대시보드**에서 업로드를 검토하고 앨범에 포함할 사진을 승인합니다.
4. 승인된 사진으로 **Sweetbook 포토북**을 자동 생성하고 배송 주문까지 진행합니다.

```
apps/
  web/      React + Vite + TypeScript + Tailwind  (포트 5173)
  server/   Node.js + Express + TypeScript + Prisma (포트 3001)
```

---

## 실행 방법

### 사전 요구 사항

- Node.js 18+
- MariaDB (또는 MySQL) 실행 중

### 1. 저장소 클론 및 의존성 설치

```bash
git clone <repo-url>
cd guestbook-album
npm install
```

### 2. 환경 변수 설정

```bash
cp apps/server/.env.example apps/server/.env
```

`apps/server/.env` 파일을 열어 아래 값을 채웁니다:

```env
DATABASE_URL="mysql://root:password@localhost:3306/guestbook_album"
PORT=3001
FRONTEND_URL=http://localhost:5173

SWEETBOOK_API_KEY=SB_your_api_key_here   # Sweetbook 파트너 포털에서 발급
SWEETBOOK_ENV=sandbox                     # 테스트: sandbox / 실제 주문: live
```

### 3. 데이터베이스 초기화

```bash
cd apps/server
npm run db:push        # 스키마를 DB에 반영
npm run db:generate    # Prisma 클라이언트 재생성
```

### 4. 더미 데이터 시드 (선택 — 데모 이벤트 즉시 확인)

> 인터넷 연결이 필요합니다 (picsum.photos에서 샘플 이미지를 다운로드합니다).

```bash
cd apps/server
npm run db:seed
```

시드 완료 후 출력되는 URL로 접속하면 바로 대시보드를 확인할 수 있습니다.  
호스트 PIN: **1234**

### 5. 앱 실행

터미널 1 (서버):
```bash
cd apps/server
npm run dev
```

터미널 2 (프론트엔드):
```bash
cd apps/web
npm run dev
```

### 6. 접속

| 페이지 | URL |
|---|---|
| 이벤트 생성 | http://localhost:5173/create |
| 내 이벤트 목록 | http://localhost:5173/my-events |
| **호스트 대시보드 (데모, PIN: 1234)** | **http://localhost:5173/dashboard/demo-event-sweetbook-2026** |
| **게스트 업로드 (데모)** | **http://localhost:5173/g/demo-token-sweetbook-2026** |
| Prisma Studio | `cd apps/server && npm run db:studio` |

---

## 사용한 API 목록

### 자체 REST API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /api/events | 이벤트 생성 |
| GET | /api/events/:id | 이벤트 조회 (내부 ID) |
| GET | /api/events/token/:token | 이벤트 조회 (공개 토큰) |
| POST | /api/events/:id/verify | 호스트 PIN 인증 |
| POST | /api/uploads/:token | 게스트 사진 업로드 (multipart) |
| GET | /api/uploads/event/:eventId | 이벤트별 업로드 목록 |
| PATCH | /api/uploads/:id/approve | 업로드 승인 |
| PATCH | /api/uploads/:id/unapprove | 승인 취소 |
| DELETE | /api/uploads/:id | 업로드 삭제 |
| GET | /api/album/book-specs | 사용 가능한 책 규격 목록 |
| GET | /api/album/templates | 템플릿 목록 (규격·종류 필터) |
| GET | /api/album/template-params/:uid | 템플릿 텍스트 파라미터 스키마 |
| GET | /api/album/:eventId | 앨범 작업 상태 조회 |
| POST | /api/album/:eventId/build | 앨범 생성 (책 생성 ~ finalize) |
| POST | /api/album/:eventId/estimate | 주문 금액 예상 |
| POST | /api/album/:eventId/order | 주문 생성 |
| GET | /api/album/:eventId/order-status | 주문 실시간 상태 조회 |

### Sweetbook Book Print API (외부)

모든 호출은 `apps/server/src/lib/sweetbook.ts` 어댑터를 통해서만 이루어집니다.

| Sweetbook API | SDK / REST | 용도 |
|---|---|---|
| `books.create` | SDK | 책 프로젝트 생성 |
| `photos.upload` | SDK | 사진 업로드 |
| POST /Books/:uid/cover | REST | 표지 생성 |
| POST /Books/:uid/contents | REST | 본문 페이지 추가 |
| POST /Books/:uid/finalization | REST | 책 최종화 (비가역) |
| `orders.estimate` | SDK | 주문 금액 예상 |
| `orders.create` | SDK | 주문 생성 |
| `orders.get` | SDK | 주문 상태 조회 |
| GET /book-specs | REST | 책 규격 목록 조회 |
| GET /templates | REST | 템플릿 목록 조회 |
| GET /templates/:uid | REST | 템플릿 파라미터 스키마 조회 |

---

## 설계 의도

### 외부 API 격리
`sweetbook.ts`를 단일 어댑터로 유지해 Sweetbook SDK·REST 혼용 호출을 하나의 파일에 캡슐화했습니다. 라우터는 도메인 로직만 담고, Sweetbook의 인터페이스 변경이 발생해도 이 파일만 수정하면 됩니다.

### 앨범 빌드 단계별 상태 관리
`AlbumJob.status` 필드(`PENDING → BOOK_CREATED → PHOTOS_UPLOADED → COVER_ADDED → CONTENTS_ADDED → FINALIZED → ORDER_PLACED`)를 통해 긴 외부 API 흐름의 각 단계를 추적합니다. 중간 실패 시 어느 단계에서 끊겼는지 바로 파악할 수 있고, `FAILED` 상태에서 재시도가 가능합니다.

### 동적 템플릿 파라미터
각 Sweetbook 템플릿은 고유한 이미지/텍스트 필드 이름을 가집니다. 빌드 직전에 `/templates/:uid` API로 스키마를 조회해 올바른 `FormData` 필드명을 동적으로 결정하므로, 템플릿을 바꿔도 코드 수정 없이 동작합니다.

### 중복 실행 방지
`ORDER_PLACED`, `FINALIZED` 상태인 AlbumJob이 존재하면 빌드 API가 409를 반환합니다. Sweetbook의 finalize는 비가역적이므로 UI에서도 명시적 경고와 확인 단계를 거칩니다.

### 데이터 모델
- **Event** — 이벤트(결혼식) 메타데이터 + 공개 토큰
- **GuestUpload** — 하객 업로드 사진·메시지·승인 여부
- **AlbumJob** — Sweetbook 작업 상태 및 bookUid/orderUid 추적

---

## AI 도구 사용 내역

이 프로젝트는 **Claude Code** (Anthropic)를 활용해 개발되었습니다.

- 프로젝트 초기 스캐폴딩 (모노레포 구조, Prisma 스키마, Tailwind 설정)
- 라우터·컴포넌트 초안 생성 및 반복 수정
- Sweetbook REST API 스펙 분석 후 어댑터 구현
- 동적 템플릿 파라미터 처리 로직 설계 및 디버깅
- 에러 핸들링 패턴 및 상태 머신 설계 검토

코드 리뷰와 최종 의사결정은 개발자가 직접 수행했습니다.
