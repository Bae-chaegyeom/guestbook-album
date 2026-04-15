import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getEvent } from '../../api/client';
import { saveMyEvent } from '../../lib/myEvents';
import type { Event } from '../../types/api';

export default function EventResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(
    (location.state as { event?: Event })?.event ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  // Save to localStorage whenever we have an event
  useEffect(() => {
    if (event) saveMyEvent(event);
  }, [event]);

  // Fetch event if not passed via navigation state (e.g. direct URL load)
  useEffect(() => {
    if (event || !id) return;
    getEvent(id)
      .then(setEvent)
      .catch((err) => setError(err.message));
  }, [id, event]);

  const guestUrl = event
    ? `${window.location.origin}/g/${event.publicToken}`
    : '';

  async function handleCopy() {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQR() {
    if (!qrRef.current || !event) return;
    const svg = qrRef.current;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-rose-500 underline"
        >
          Back to home
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Event created!</h1>
        <p className="mt-1 text-gray-500">
          Share the link or QR code with your guests.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
        {/* Event summary */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800">{event.title}</p>
          <p className="text-sm text-gray-500">
            {event.brideName} &amp; {event.groomName} &middot;{' '}
            {new Date(event.weddingDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {event.tagline && (
            <p className="mt-1 text-sm italic text-gray-400">&ldquo;{event.tagline}&rdquo;</p>
          )}
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <QRCodeSVG
            ref={qrRef}
            value={guestUrl}
            size={200}
            level="M"
            includeMargin
          />
          <button
            onClick={handleDownloadQR}
            className="text-sm text-rose-500 hover:text-rose-600 underline"
          >
            Download QR code
          </button>
        </div>

        {/* Guest link */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Guest upload link
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={guestUrl}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 truncate"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-2">
          <Link
            to={`/dashboard/${event.id}`}
            className="w-full text-center text-sm bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            대시보드로 이동 →
          </Link>
          <div className="flex gap-2">
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center text-sm border border-rose-300 text-rose-600 hover:bg-rose-50 font-medium py-2 rounded-lg transition-colors"
            >
              게스트 페이지 미리보기
            </a>
            <button
              onClick={() => navigate('/create')}
              className="flex-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg transition-colors"
            >
              새 이벤트 만들기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
