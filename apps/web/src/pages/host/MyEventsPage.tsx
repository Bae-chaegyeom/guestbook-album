import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyEvents, removeMyEvent } from '../../lib/myEvents';

export default function MyEventsPage() {
  const [events, setEvents] = useState(getMyEvents);

  function handleRemove(id: string) {
    if (!confirm('목록에서 삭제할까요? 이벤트 데이터는 유지됩니다.')) return;
    removeMyEvent(id);
    setEvents(getMyEvents());
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 mb-4 inline-block">
          ← 홈으로
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">내 이벤트</h1>
        <p className="text-sm text-gray-500 mt-1">이 기기에서 생성한 이벤트 목록입니다.</p>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-gray-500 text-sm">아직 생성한 이벤트가 없어요.</p>
          <Link
            to="/create"
            className="mt-4 inline-block bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            이벤트 만들기
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow transition-shadow"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{e.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {e.brideName} &amp; {e.groomName} ·{' '}
                  {new Date(e.weddingDate).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  생성일 {new Date(e.savedAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link
                  to={`/dashboard/${e.id}`}
                  className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                >
                  대시보드
                </Link>
                <button
                  onClick={() => handleRemove(e.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none px-1"
                  aria-label="목록에서 제거"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
