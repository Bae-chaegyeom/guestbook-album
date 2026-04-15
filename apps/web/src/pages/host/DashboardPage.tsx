import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getEvent, getUploads, approveUpload, unapproveUpload, deleteUpload, verifyEventPin } from '../../api/client';
import { isVerified, setVerified } from '../../lib/pinAuth';
import AlbumPanel from './AlbumPanel';
import type { Event, GuestUpload } from '../../types/api';

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();

  // ── PIN gate ──
  const [pinVerified, setPinVerified] = useState(() => isVerified(id ?? ''));
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // ── Dashboard data ──
  const [event, setEvent] = useState<Event | null>(null);
  const [uploads, setUploads] = useState<GuestUpload[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // 모든 훅을 조기 반환 전에 선언
  const load = useCallback(async () => {
    if (!id || !pinVerified) return;
    setLoading(true);
    try {
      const [ev, ups] = await Promise.all([getEvent(id), getUploads(id)]);
      setEvent(ev);
      setUploads(ups);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [id, pinVerified]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ──
  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setPinError(null);
    setPinLoading(true);
    try {
      await verifyEventPin(id, pin);
      setVerified(id);
      setPinVerified(true);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : '인증 실패');
    } finally {
      setPinLoading(false);
    }
  }

  async function handleApprove(upload: GuestUpload) {
    setActioningId(upload.id);
    try {
      const updated = upload.approved
        ? await unapproveUpload(upload.id)
        : await approveUpload(upload.id);
      setUploads((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } finally {
      setActioningId(null);
    }
  }

  async function handleDelete(upload: GuestUpload) {
    if (!confirm(`이 사진을 삭제할까요?\n${upload.uploaderName ? `업로더: ${upload.uploaderName}` : ''}\n이 작업은 되돌릴 수 없습니다.`)) return;
    setActioningId(upload.id);
    try {
      await deleteUpload(upload.id);
      setUploads((prev) => prev.filter((u) => u.id !== upload.id));
    } finally {
      setActioningId(null);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const guestUrl = event ? `${window.location.origin}/g/${event.publicToken}` : '';
  const approvedCount = uploads.filter((u) => u.approved).length;

  // ── PIN gate UI (조기 반환은 훅 선언 이후에만) ──
  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-3xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-gray-900">대시보드 접근</h1>
            <p className="text-sm text-gray-500 mt-1">이벤트 생성 시 설정한 비밀번호를 입력하세요.</p>
          </div>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="비밀번호"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
            {pinError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {pinError}
              </p>
            )}
            <button
              type="submit"
              disabled={pinLoading}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
            >
              {pinLoading ? '확인 중…' : '입장하기'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/my-events" className="text-xs text-gray-400 hover:text-gray-600">
              ← 내 이벤트로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard UI ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">불러오는 중…</p>
      </div>
    );
  }

  if (loadError || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600">{loadError ?? '이벤트를 찾을 수 없습니다.'}</p>
          <Link to="/my-events" className="mt-3 inline-block text-sm text-rose-500 underline">
            내 이벤트로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/my-events" className="text-gray-400 hover:text-gray-600 text-sm">
              ← 내 이벤트
            </Link>
            <span className="text-gray-200">|</span>
            <span className="text-sm font-semibold text-gray-900 truncate max-w-[180px]">
              {event.title}
            </span>
          </div>
          <button
            onClick={() => setShowQR((v) => !v)}
            className="text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showQR ? 'QR 닫기' : 'QR / 링크 보기'}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* QR / Link panel */}
        {showQR && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-center">
            <QRCodeSVG value={guestUrl} size={140} level="M" includeMargin />
            <div className="flex-1 w-full space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">하객 업로드 링크</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={guestUrl}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-700 truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                  >
                    {copied ? '복사됨!' : '복사'}
                  </button>
                </div>
              </div>
              <a
                href={guestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-rose-500 underline"
              >
                게스트 페이지 미리보기 →
              </a>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '전체 사진', value: uploads.length },
            { label: '승인된 사진', value: approvedCount },
            { label: '미승인', value: uploads.length - approvedCount },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upload grid */}
        {uploads.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-gray-500 text-sm">아직 업로드된 사진이 없어요.</p>
            <button
              onClick={() => setShowQR(true)}
              className="mt-3 text-sm text-rose-500 underline"
            >
              QR 코드 공유하기
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">업로드된 사진</h2>
              {approvedCount > 0 && (
                <span className="text-xs bg-green-50 text-green-600 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                  {approvedCount}장 승인됨
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className={`bg-white rounded-2xl overflow-hidden border shadow-sm transition-all ${
                    upload.approved ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-100'
                  }`}
                >
                  <div className="relative aspect-square bg-gray-100">
                    <img
                      src={upload.imageUrl}
                      alt="guest upload"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {upload.approved && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        승인
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2">
                    {(upload.uploaderName || upload.message) && (
                      <div>
                        {upload.uploaderName && (
                          <p className="text-xs font-semibold text-gray-700">{upload.uploaderName}</p>
                        )}
                        {upload.message && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{upload.message}</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(upload.createdAt).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={() => handleApprove(upload)}
                        disabled={actioningId === upload.id}
                        className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          upload.approved
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {upload.approved ? '✓ 승인됨' : '승인'}
                      </button>
                      <button
                        onClick={() => handleDelete(upload)}
                        disabled={actioningId === upload.id}
                        className="px-2.5 text-xs font-medium py-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <AlbumPanel eventId={event.id} approvedCount={approvedCount} />
          </>
        )}
      </div>
    </div>
  );
}
