import { useEffect, useState } from 'react';
import {
  getAlbumJob,
  buildAlbum,
  estimateAlbumOrder,
  placeAlbumOrder,
  getTemplates,
  getTemplateParamFields,
} from '../../api/client';
import type { AlbumJob, AlbumJobStatus, ShippingInfo } from '../../types/api';

// ── 텍스트 파라미터 placeholder 매핑 ─────────────────────────────────────────

const PLACEHOLDER_MAP: Record<string, string> = {
  // 날짜 관련
  dateRange:    '예: 2025.05.10 ~ 2025.05.10',
  date:         '예: 2025.05.10',
  weddingDate:  '예: 2025년 5월 10일',
  periodText:   '예: 2025.05.10',
  year:         '예: 2025',
  monthNum:     '예: 5  (숫자만)',
  dayNum:       '예: 10  (숫자만)',
  month:        '예: May',
  day:          '예: 10',

  // 제목·텍스트
  title:        '예: 결혼식 앨범',
  spineTitle:   '예: 홍길동 ♥ 김영희',
  bookTitle:    '예: 우리의 결혼식',
  volumeLabel:  '예: Vol.1',
  subtitle:     '예: Our Wedding Day',

  // 이름
  brideName:    '예: 김영희',
  groomName:    '예: 홍길동',
  coupleName:   '예: 홍길동 ♥ 김영희',
  name:         '예: 홍길동',
  childName:    '예: 홍길동',

  // 장소·기관
  venue:        '예: 더 케이 호텔 서울',
  location:     '예: 서울 강남구',
  schoolName:   '예: 한국초등학교',

  // 메시지
  message:      '예: 행복한 결혼을 축하합니다',
  greeting:     '예: 함께해 주셔서 감사합니다',
  caption:      '예: 소중한 순간',
};

function getPlaceholder(key: string): string {
  // 정확한 키 매핑 우선
  if (PLACEHOLDER_MAP[key]) return PLACEHOLDER_MAP[key];
  // 키 이름에 포함된 단어로 추론
  const lower = key.toLowerCase();
  if (lower.includes('date') || lower.includes('period')) return '예: 2025.05.10';
  if (lower.includes('year'))  return '예: 2025';
  if (lower.includes('month')) return '예: 5';
  if (lower.includes('day'))   return '예: 10';
  if (lower.includes('name'))  return '예: 홍길동';
  if (lower.includes('title')) return '예: 결혼식 앨범';
  if (lower.includes('venue') || lower.includes('location')) return '예: 더 케이 호텔';
  if (lower.includes('message') || lower.includes('text') || lower.includes('caption')) return '예: 소중한 순간';
  return '';
}

// ── 썸네일 이미지 (로드 실패 시 fallback) ─────────────────────────────────────

function TemplateThumbnail({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
        미리보기 없음
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="w-full aspect-square object-cover bg-gray-100"
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = 'none';
        const fallback = el.nextElementSibling as HTMLElement | null;
        if (fallback) fallback.style.display = 'flex';
      }}
    />
  );
}

// ── 상태별 레이블 ─────────────────────────────────────────────────────────────

const BUILD_STEPS: { status: AlbumJobStatus; label: string }[] = [
  { status: 'BOOK_CREATED', label: '책 프로젝트 생성' },
  { status: 'PHOTOS_UPLOADED', label: '사진 업로드' },
  { status: 'COVER_ADDED', label: '표지 생성' },
  { status: 'CONTENTS_ADDED', label: '본문 페이지 구성' },
  { status: 'FINALIZED', label: '앨범 완성' },
];

const STATUS_ORDER: AlbumJobStatus[] = [
  'PENDING', 'BOOK_CREATED', 'PHOTOS_UPLOADED', 'COVER_ADDED', 'CONTENTS_ADDED', 'FINALIZED', 'ORDER_PLACED',
];

function stepIndex(status: AlbumJobStatus) {
  return STATUS_ORDER.indexOf(status);
}

interface TemplateItem {
  uid: string;
  name?: string;
  type?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

function toTemplateItem(raw: unknown): TemplateItem {
  const o = raw as Record<string, unknown>;
  const thumbs = o['thumbnails'] as Record<string, unknown> | undefined;
  return {
    ...o,
    uid: String(o['templateUid'] ?? o['uid'] ?? ''),
    name: String(o['templateName'] ?? o['name'] ?? ''),
    type: String(o['templateKind'] ?? o['type'] ?? ''),
    thumbnail: typeof thumbs?.['layout'] === 'string' ? thumbs['layout'] : undefined,
  };
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

interface Props {
  eventId: string;
  approvedCount: number;
}

type View = 'idle' | 'select' | 'building' | 'estimate' | 'shipping' | 'ordered';

export default function AlbumPanel({ eventId, approvedCount }: Props) {
  const [job, setJob] = useState<AlbumJob | null>(null);
  const [view, setView] = useState<View>('idle');
  const [error, setError] = useState<string | null>(null);

  // 결혼식 앨범 최적 규격으로 고정
  const BOOK_SPEC_UID = 'SQUAREBOOK_HC';

  // ── 템플릿 선택 ──
  const [coverTemplates, setCoverTemplates] = useState<TemplateItem[]>([]);
  const [contentTemplates, setContentTemplates] = useState<TemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedCoverTemplate, setSelectedCoverTemplate] = useState('');
  const [selectedContentTemplate, setSelectedContentTemplate] = useState('');

  // ── 템플릿 텍스트 파라미터 ──
  type TextField = { key: string; label: string; required: boolean };
  const [coverTextFields, setCoverTextFields] = useState<TextField[]>([]);
  const [contentTextFields, setContentTextFields] = useState<TextField[]>([]);
  const [coverTextParams, setCoverTextParams] = useState<Record<string, string>>({});
  const [contentTextParams, setContentTextParams] = useState<Record<string, string>>({});
  const [coverSupportsImages, setCoverSupportsImages] = useState(true);
  const [contentSupportsImages, setContentSupportsImages] = useState(true);

  // Estimate
  const [quantity, setQuantity] = useState(1);
  const [estimate, setEstimate] = useState<Record<string, unknown> | null>(null);
  const [estimating, setEstimating] = useState(false);

  // Shipping form
  const [shipping, setShipping] = useState<ShippingInfo>({
    recipientName: '',
    recipientPhone: '',
    postalCode: '',
    address1: '',
    address2: '',
    shippingMemo: '',
  });
  const [ordering, setOrdering] = useState(false);

  // 마운트 시 현재 job 상태 확인
  useEffect(() => {
    getAlbumJob(eventId).then((j) => {
      if (!j) return;
      setJob(j);
      if (j.status === 'ORDER_PLACED') setView('ordered');
      else if (j.status === 'FINALIZED') setView('estimate');
      else if (j.status === 'FAILED') setView('idle');
    });
  }, [eventId]);

  // 커버 템플릿 선택 시 텍스트 파라미터 조회
  async function handleSelectCoverTemplate(uid: string) {
    setSelectedCoverTemplate(uid);
    setCoverTextFields([]);
    setCoverTextParams({});
    setCoverSupportsImages(true);
    try {
      const result = await getTemplateParamFields(uid);
      setCoverTextFields(result.fields);
      setCoverTextParams(Object.fromEntries(result.fields.map((f) => [f.key, ''])));
      setCoverSupportsImages(result.supportsImages);
    } catch { /* 파라미터 없으면 무시 */ }
  }

  // 본문 템플릿 선택 시 텍스트 파라미터 조회
  async function handleSelectContentTemplate(uid: string) {
    setSelectedContentTemplate(uid);
    setContentTextFields([]);
    setContentTextParams({});
    setContentSupportsImages(true);
    try {
      const result = await getTemplateParamFields(uid);
      setContentTextFields(result.fields);
      setContentTextParams(Object.fromEntries(result.fields.map((f) => [f.key, ''])));
      setContentSupportsImages(result.supportsImages);
    } catch { /* 파라미터 없으면 무시 */ }
  }

  // 선택 화면 열기 — 고정 규격으로 템플릿 즉시 조회
  async function handleOpenSelect() {
    setError(null);
    setView('select');
    if (coverTemplates.length > 0) return; // 이미 불러옴
    setLoadingTemplates(true);
    try {
      const [covers, contents] = await Promise.all([
        getTemplates(BOOK_SPEC_UID, 'cover'),
        getTemplates(BOOK_SPEC_UID, 'content'),
      ]);
      setCoverTemplates(covers.map(toTemplateItem));
      setContentTemplates(contents.map(toTemplateItem));
    } catch (err) {
      setError(err instanceof Error ? err.message : '템플릿 불러오기 실패');
    } finally {
      setLoadingTemplates(false);
    }
  }

  // 앨범 빌드 시작
  async function handleBuild() {
    if (!selectedCoverTemplate || !selectedContentTemplate) {
      setError('책 규격과 표지/본문 템플릿을 모두 선택해주세요.');
      return;
    }
    if (!coverSupportsImages) {
      setError('선택한 표지 템플릿은 사진 슬롯이 없습니다. 다른 표지 템플릿을 선택해주세요.');
      return;
    }
    if (!contentSupportsImages) {
      setError('선택한 본문 템플릿은 사진 슬롯이 없습니다. 빈내지가 아닌 사진용 본문 템플릿을 선택해주세요.');
      return;
    }
    const missingCover = coverTextFields.filter((f) => f.required && !coverTextParams[f.key]?.trim());
    const missingContent = contentTextFields.filter((f) => f.required && !contentTextParams[f.key]?.trim());
    if (missingCover.length > 0 || missingContent.length > 0) {
      const missing = [...missingCover, ...missingContent].map((f) => f.label).join(', ');
      setError(`필수 항목을 입력해주세요: ${missing}`);
      return;
    }
    setError(null);
    setView('building');
    try {
      const result = await buildAlbum(eventId, {
        bookSpecUid: BOOK_SPEC_UID,
        coverTemplateUid: selectedCoverTemplate,
        contentTemplateUid: selectedContentTemplate,
        coverTextParams,
        contentTextParams,
      });
      setJob(result);
      if (result.status === 'FINALIZED') {
        setView('estimate');
      } else {
        setError(result.errorMessage ?? '앨범 생성 중 오류가 발생했습니다.');
        setView('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '앨범 생성 실패');
      setView('idle');
    }
  }

  // 가격 조회
  async function handleEstimate() {
    setEstimating(true);
    setError(null);
    try {
      const result = await estimateAlbumOrder(eventId, quantity);
      setEstimate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '가격 조회 실패');
    } finally {
      setEstimating(false);
    }
  }

  // 주문 생성
  async function handleOrder(e: React.FormEvent) {
    e.preventDefault();
    setOrdering(true);
    setError(null);
    try {
      const result = await placeAlbumOrder(eventId, quantity, shipping);
      setJob(result.job);
      setView('ordered');
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 실패');
    } finally {
      setOrdering(false);
    }
  }

  function handleShippingChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setShipping((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (view === 'ordered' && job) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-lg font-bold text-green-800">주문이 완료되었습니다!</h3>
          <p className="text-sm text-green-600 mt-1">
            주문 번호: <span className="font-mono font-semibold">{job.sweetbookOrderId}</span>
          </p>
          <p className="text-xs text-green-500 mt-2">
            제작 및 배송은 영업일 기준 5~10일이 소요됩니다.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'building') {
    const currentIndex = job ? stepIndex(job.status) : 0;
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">앨범 생성 중…</h3>
        <div className="space-y-3">
          {BUILD_STEPS.map((step, i) => {
            const done = currentIndex > stepIndex(step.status);
            const active = currentIndex === stepIndex(step.status) - 1;
            return (
              <div key={step.status} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  done ? 'bg-green-500 text-white'
                  : active ? 'bg-rose-100 border-2 border-rose-400'
                  : 'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${done ? 'text-gray-400 line-through' : active ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {step.label}
                  {active && <span className="ml-1 animate-pulse">…</span>}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          사진 수에 따라 수십 초가 소요될 수 있습니다. 페이지를 닫지 마세요.
        </p>
      </div>
    );
  }

  if (view === 'select') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">템플릿 선택</h3>
            <p className="text-xs text-gray-400 mt-0.5">정사각형 하드커버 (243×248mm) · PUR 바인딩</p>
          </div>
          <button onClick={() => setView('idle')} className="text-xs text-gray-400 hover:text-gray-600">
            ← 돌아가기
          </button>
        </div>

        {/* 표지 템플릿 */}
        {(
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">① 표지 템플릿</label>
            {loadingTemplates ? (
              <p className="text-sm text-gray-400 animate-pulse">불러오는 중…</p>
            ) : coverTemplates.length === 0 ? (
              <p className="text-xs text-gray-400">사용 가능한 표지 템플릿이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {coverTemplates.map((t) => (
                  <button
                    key={t.uid}
                    type="button"
                    onClick={() => handleSelectCoverTemplate(t.uid)}
                    className={`text-left rounded-xl border overflow-hidden transition-colors ${
                      selectedCoverTemplate === t.uid
                        ? 'border-rose-400 ring-2 ring-rose-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <TemplateThumbnail src={t.thumbnail} alt={t.name || t.uid} />
                    <div className="w-full aspect-square bg-gray-100 items-center justify-center text-gray-300 text-xs hidden">미리보기 없음</div>
                    <p className={`px-2 py-1.5 text-xs font-medium truncate ${selectedCoverTemplate === t.uid ? 'text-rose-700 bg-rose-50' : 'text-gray-700'}`}>
                      {t.name || t.uid}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 본문 템플릿 */}
        {selectedCoverTemplate && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">② 본문 템플릿</label>
            {loadingTemplates ? (
              <p className="text-sm text-gray-400 animate-pulse">불러오는 중…</p>
            ) : contentTemplates.length === 0 ? (
              <p className="text-xs text-gray-400">사용 가능한 본문 템플릿이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {contentTemplates.map((t) => (
                  <button
                    key={t.uid}
                    type="button"
                    onClick={() => handleSelectContentTemplate(t.uid)}
                    className={`text-left rounded-xl border overflow-hidden transition-colors ${
                      selectedContentTemplate === t.uid
                        ? 'border-rose-400 ring-2 ring-rose-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <TemplateThumbnail src={t.thumbnail} alt={t.name || t.uid} />
                    <p className={`px-2 py-1.5 text-xs font-medium truncate ${selectedContentTemplate === t.uid ? 'text-rose-700 bg-rose-50' : 'text-gray-700'}`}>
                      {t.name || t.uid}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 표지 텍스트 파라미터 */}
        {selectedCoverTemplate && coverTextFields.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-600">표지 텍스트 입력</p>
            {coverTextFields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">
                  {f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={coverTextParams[f.key] ?? ''}
                  onChange={(e) => setCoverTextParams((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={getPlaceholder(f.key)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            ))}
          </div>
        )}

        {selectedCoverTemplate && !coverSupportsImages && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            이 표지 템플릿은 사진을 받지 않는 템플릿입니다. 자동 포토북용 표지 템플릿을 선택해주세요.
          </p>
        )}

        {/* 본문 텍스트 파라미터 */}
        {selectedContentTemplate && contentTextFields.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-600">본문 텍스트 입력</p>
            {contentTextFields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">
                  {f.label}{f.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={contentTextParams[f.key] ?? ''}
                  onChange={(e) => setContentTextParams((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={getPlaceholder(f.key)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
            ))}
          </div>
        )}

        {selectedContentTemplate && !contentSupportsImages && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            이 본문 템플릿은 사진 슬롯이 없는 빈내지입니다. 사진이 들어가는 본문 템플릿을 선택해주세요.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={handleBuild}
          disabled={!selectedCoverTemplate || !selectedContentTemplate || !coverSupportsImages || !contentSupportsImages}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          앨범 만들기 →
        </button>
      </div>
    );
  }

  if (view === 'shipping') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-800">배송 정보 입력</h3>
          <button onClick={() => setView('estimate')} className="text-xs text-gray-400 hover:text-gray-600">
            ← 돌아가기
          </button>
        </div>

        <form onSubmit={handleOrder} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">수령인 *</label>
              <input name="recipientName" required value={shipping.recipientName} onChange={handleShippingChange}
                placeholder="홍길동"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">연락처 *</label>
              <input name="recipientPhone" required value={shipping.recipientPhone} onChange={handleShippingChange}
                placeholder="010-0000-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">우편번호 *</label>
            <input name="postalCode" required value={shipping.postalCode} onChange={handleShippingChange}
              placeholder="12345"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">주소 *</label>
            <input name="address1" required value={shipping.address1} onChange={handleShippingChange}
              placeholder="서울시 강남구 테헤란로 123"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">상세주소</label>
            <input name="address2" value={shipping.address2} onChange={handleShippingChange}
              placeholder="101동 1001호"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">배송 메모</label>
            <input name="shippingMemo" value={shipping.shippingMemo} onChange={handleShippingChange}
              placeholder="문 앞에 놓아주세요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>

          {estimate && (
            <div className="bg-rose-50 rounded-xl px-4 py-3 text-sm text-rose-700 font-medium">
              수량 {quantity}부 · 예상 금액: {formatEstimate(estimate)}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={ordering}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            {ordering ? '주문 처리 중…' : '주문하기'}
          </button>
        </form>
      </div>
    );
  }

  if (view === 'estimate' && job?.status === 'FINALIZED') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-green-500 text-lg">✓</span>
          <h3 className="text-sm font-semibold text-gray-800">앨범 완성</h3>
          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium ml-1">
            잠금됨 — 사진 변경 불가
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          승인된 사진 {approvedCount}장으로 앨범이 완성되었습니다. 수량을 선택하고 주문하세요.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">수량</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-500 hover:bg-gray-50 text-sm">−</button>
              <span className="px-4 py-2 text-sm font-semibold">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                className="px-3 py-2 text-gray-500 hover:bg-gray-50 text-sm">+</button>
            </div>
            <button onClick={handleEstimate} disabled={estimating}
              className="text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {estimating ? '조회 중…' : '가격 확인'}
            </button>
          </div>

          {estimate && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-rose-700">
                수량 {quantity}부 · 예상 금액: {formatEstimate(estimate)}
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button onClick={() => { setError(null); setView('shipping'); }}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            배송 정보 입력하기 →
          </button>
        </div>
      </div>
    );
  }

  // idle (no job, or FAILED)
  return (
    <div className={`rounded-2xl p-5 flex items-center justify-between border ${
      job?.status === 'FAILED' ? 'bg-red-50 border-red-100' : 'bg-rose-50 border-rose-100'
    }`}>
      <div>
        {job?.status === 'FAILED' ? (
          <>
            <p className="text-sm font-semibold text-red-700">앨범 생성에 실패했습니다</p>
            <p className="text-xs text-red-400 mt-0.5">규격·템플릿을 다시 선택하고 시도해보세요.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-rose-700">
              {approvedCount}장의 사진으로 앨범을 만들 수 있어요
            </p>
            <p className="text-xs text-rose-400 mt-0.5">Sweetbook 실물 포토북 제작</p>
          </>
        )}
      </div>
      <button
        onClick={handleOpenSelect}
        disabled={approvedCount === 0}
        className={`shrink-0 ml-4 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
          job?.status === 'FAILED'
            ? 'bg-red-400 hover:bg-red-500'
            : 'bg-rose-500 hover:bg-rose-600'
        }`}
      >
        {job?.status === 'FAILED' ? '다시 시도' : '앨범 만들기'}
      </button>
    </div>
  );
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatEstimate(estimate: Record<string, unknown>): string {
  const amount =
    estimate['totalAmount'] ??
    estimate['total'] ??
    estimate['amount'] ??
    (estimate['data'] && typeof estimate['data'] === 'object'
      ? (estimate['data'] as Record<string, unknown>)['totalAmount']
      : null);

  if (amount == null) return '확인 필요';
  const currency =
    estimate['currency'] ??
    (estimate['data'] && typeof estimate['data'] === 'object'
      ? (estimate['data'] as Record<string, unknown>)['currency']
      : null) ??
    'KRW';

  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: String(currency),
  }).format(Number(amount));
}
