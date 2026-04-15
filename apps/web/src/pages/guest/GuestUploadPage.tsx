import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getEventByToken, submitGuestUpload } from '../../api/client';
import type { Event } from '../../types/api';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function GuestUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    getEventByToken(token)
      .then(setEvent)
      .catch((err) => setLoadError(err.message));
  }, [token]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => previews.forEach(URL.revokeObjectURL);
  }, [previews]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    // Reset input so same file can be re-added after removal
    e.target.value = '';
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0 || !token) return;
    setStatus('uploading');
    setUploadError(null);
    try {
      await submitGuestUpload(
        token,
        files,
        message.trim() || undefined,
        uploaderName.trim() || undefined
      );
      setStatus('success');
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setStatus('error');
    }
  }

  // --- Loading / Error states ---
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-gray-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (event.status === 'CLOSED') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-gray-700 font-medium">This event is closed</p>
          <p className="text-gray-500 text-sm mt-1">Uploads are no longer being accepted.</p>
        </div>
      </div>
    );
  }

  // --- Success state ---
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">💕</div>
          <h2 className="text-2xl font-bold text-gray-900">Thank you!</h2>
          <p className="mt-2 text-gray-500">
            {event.brideName} &amp; {event.groomName} 에게 사진이 전달되었어요.
          </p>
          <button
            onClick={() => {
              setStatus('idle');
              setFiles([]);
              setPreviews([]);
              setMessage('');
              setUploaderName('');
            }}
            className="mt-6 text-sm text-rose-500 underline"
          >
            사진 더 올리기
          </button>
        </div>
      </div>
    );
  }

  // --- Upload form ---
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-rose-50 px-4 py-8 text-center border-b border-rose-100">
        <p className="text-xs uppercase tracking-widest text-rose-400 mb-1">초대합니다</p>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {event.brideName} &amp; {event.groomName} &middot;{' '}
          {new Date(event.weddingDate).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        {event.tagline && (
          <p className="mt-2 text-sm italic text-gray-500">&ldquo;{event.tagline}&rdquo;</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Photo picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            사진 <span className="text-red-500">*</span>
          </p>

          {/* Photo grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-square">
                  <img
                    src={src}
                    alt={`preview ${i + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center leading-none"
                    aria-label="사진 제거"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-gray-400 text-sm hover:border-rose-300 hover:text-rose-400 transition-colors"
          >
            {previews.length === 0 ? '+ 사진 추가하기' : '+ 사진 더 추가하기'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Name (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="uploaderName">
            이름 <span className="text-gray-400 text-xs">(선택)</span>
          </label>
          <input
            id="uploaderName"
            type="text"
            maxLength={50}
            placeholder="예) 홍길동"
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
          />
        </div>

        {/* Message (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="message">
            한마디 <span className="text-gray-400 text-xs">(선택)</span>
          </label>
          <textarea
            id="message"
            maxLength={300}
            rows={3}
            placeholder="두 분께 축하 메시지를 남겨주세요 :)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none"
          />
          <p className="text-right text-xs text-gray-400 mt-0.5">{message.length}/300</p>
        </div>

        {uploadError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {uploadError}
          </p>
        )}

        <button
          type="submit"
          disabled={files.length === 0 || status === 'uploading'}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
        >
          {status === 'uploading' ? '업로드 중…' : `사진 ${files.length > 0 ? `${files.length}장 ` : ''}공유하기`}
        </button>
      </form>
    </div>
  );
}
