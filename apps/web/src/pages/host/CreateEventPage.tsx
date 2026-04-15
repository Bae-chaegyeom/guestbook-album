import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createEvent } from '../../api/client';

interface FormState {
  title: string;
  weddingDate: string;
  brideName: string;
  groomName: string;
  tagline: string;
  hostPin: string;
  hostPinConfirm: string;
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    title: '',
    weddingDate: '',
    brideName: '',
    groomName: '',
    tagline: '',
    hostPin: '',
    hostPinConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.hostPin !== form.hostPinConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (form.hostPin.length < 4) {
      setError('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      // Convert local date string to ISO 8601 datetime required by the API
      const weddingDate = new Date(form.weddingDate).toISOString();
      const event = await createEvent({
        title: form.title.trim(),
        weddingDate,
        brideName: form.brideName.trim(),
        groomName: form.groomName.trim(),
        tagline: form.tagline.trim() || undefined,
        hostPin: form.hostPin,
      });
      navigate(`/events/${event.id}/result`, { state: { event } });
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 mb-4 inline-block">
          ← 홈으로
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">이벤트 만들기</h1>
        <p className="mt-2 text-gray-500">정보를 입력하면 QR 코드와 업로드 링크가 생성됩니다</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
            이벤트 제목 <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={100}
            placeholder="예) 김민준 ♥ 이서연 결혼식"
            value={form.title}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brideName">
              신부 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="brideName"
              name="brideName"
              type="text"
              required
              maxLength={50}
              placeholder="신부"
              value={form.brideName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="groomName">
              신랑 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="groomName"
              name="groomName"
              type="text"
              required
              maxLength={50}
              placeholder="신랑"
              value={form.groomName}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="weddingDate">
            결혼식 날짜 <span className="text-red-500">*</span>
          </label>
          <input
            id="weddingDate"
            name="weddingDate"
            type="date"
            required
            value={form.weddingDate}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tagline">
            하객에게 전할 한마디 <span className="text-gray-400 text-xs">(선택)</span>
          </label>
          <textarea
            id="tagline"
            name="tagline"
            maxLength={200}
            rows={2}
            placeholder="예) 소중한 순간을 함께 나눠주세요 :)"
            value={form.tagline}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none"
          />
        </div>

        {/* 비밀번호 */}
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <p className="text-xs text-gray-500">
            대시보드 접근 시 사용할 비밀번호를 설정하세요.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="hostPin">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="hostPin"
              name="hostPin"
              type="password"
              required
              minLength={4}
              maxLength={50}
              placeholder="최소 4자 이상"
              value={form.hostPin}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="hostPinConfirm">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              id="hostPinConfirm"
              name="hostPinConfirm"
              type="password"
              required
              minLength={4}
              maxLength={50}
              placeholder="비밀번호를 다시 입력하세요"
              value={form.hostPinConfirm}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {loading ? '생성 중…' : '이벤트 만들기'}
        </button>
      </form>
    </div>
  );
}
