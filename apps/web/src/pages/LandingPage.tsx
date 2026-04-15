import { Link } from 'react-router-dom';

const features = [
  { icon: '🔓', title: '로그인 없는 업로드', desc: 'QR 코드 스캔 한 번으로 누구나 바로 업로드' },
  { icon: '📸', title: '간편한 수집', desc: '사진 수집을 위한 별도 앱 설치 불필요' },
  { icon: '🖼️', title: '고화질 원본', desc: '원본 화질 그대로 저장 및 앨범 제작' },
  { icon: '💌', title: '한마디 메시지', desc: '사진과 함께 하객의 축하 메시지 수록' },
  { icon: '📖', title: '실물 앨범 제작', desc: 'Sweetbook으로 고품질 포토북 주문' },
  { icon: '✅', title: '혼주가 직접 선별', desc: '마음에 드는 사진만 골라 앨범에 담기' },
];

const steps = [
  {
    number: '01',
    title: 'QR 생성',
    desc: '이벤트를 만들면 전용 QR 코드와 업로드 링크가 즉시 생성됩니다.',
  },
  {
    number: '02',
    title: '하객 업로드',
    desc: '하객들이 QR을 스캔해 사진과 한마디를 남깁니다. 로그인 불필요.',
  },
  {
    number: '03',
    title: '앨범화',
    desc: '마음에 드는 사진을 선별해 Sweetbook 실물 앨범으로 주문하세요.',
  },
];

const faqs = [
  {
    q: '하객이 앱을 설치해야 하나요?',
    a: '아니요. QR 코드를 스캔하거나 링크에 접속하면 브라우저에서 바로 업로드할 수 있습니다.',
  },
  {
    q: '업로드한 사진은 안전하게 보관되나요?',
    a: '혼주만 접근할 수 있는 관리 대시보드에서 사진을 검토하고 승인합니다.',
  },
  {
    q: '앨범 제작까지 얼마나 걸리나요?',
    a: '사진 선별 후 Sweetbook을 통해 주문하면 통상 5~10 영업일 내에 배송됩니다.',
  },
  {
    q: 'QR 코드는 어디에 활용하면 좋나요?',
    a: '청첩장, 웨딩 테이블 카드, 방명록 옆에 인쇄해 두면 하객들이 자연스럽게 참여합니다.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Wedding Guest Album
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/my-events"
              className="text-xs text-gray-500 hover:text-gray-800 font-medium px-3 py-2 rounded-full transition-colors"
            >
              내 이벤트
            </Link>
            <Link
              to="/create"
              className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-12 text-center">
        <p className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-4">
          Wedding Memory Platform
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
          하객들의 순간을 모아
          <br />
          <span className="text-rose-500">한 권의 앨범으로</span>
        </h1>
        <p className="text-gray-500 text-base max-w-md mx-auto mb-8 leading-relaxed">
          카카오톡, 에어드롭, 구글 드라이브… 흩어진 사진 수집은 이제 그만.
          QR 하나로 하객들의 사진을 모으고 실물 포토북을 만드세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/create"
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            무료로 이벤트 만들기
          </Link>
          <a
            href="#how-it-works"
            className="border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            어떻게 작동하나요?
          </a>
        </div>

        {/* Photo collage */}
        <div className="mt-12 grid grid-cols-3 gap-2 max-w-lg mx-auto">
          <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden aspect-square">
            <img src="/landing-photo-1.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src="/landing-photo-2.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src="/landing-photo-3.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src="/landing-photo-4.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src="/landing-photo-5.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src="/landing-photo-6.png" alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-2">
              How it works
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              마법 같은 추억 수집
              <br />
              단 3단계
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.number} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl font-bold text-rose-100">{s.number}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 max-w-5xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-2">
            Features
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
            당신을 위한 가장 세련된
            <br />
            방식의 방명록
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="text-sm font-bold text-gray-900 mt-3 mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent albums placeholder ── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest text-rose-400 uppercase mb-2">
              Gallery
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              최근 완성된 행복의 기록들
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { img: '/landing-book-1.png', name: '김민준 & 이서연', date: '2026.03.15', count: 87 },
              { img: '/landing-book-2.png', name: '박지호 & 최유나', date: '2026.03.22', count: 124 },
              { img: '/landing-book-3.png', name: '정성민 & 강하은', date: '2026.04.05', count: 63 },
            ].map((a) => (
              <div key={a.name} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-video overflow-hidden">
                  <img src={a.img} alt={a.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.date} · 사진 {a.count}장
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 max-w-3xl mx-auto px-5">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">자주 묻는 질문</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="border border-gray-100 rounded-xl px-5 py-4 group cursor-pointer"
            >
              <summary className="text-sm font-semibold text-gray-800 list-none flex justify-between items-center">
                {faq.q}
                <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg leading-none">
                  +
                </span>
              </summary>
              <p className="text-sm text-gray-500 mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="bg-rose-500 py-16 px-5 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-3">
          하객들의 사진이 담긴
          <br />
          당신의 인생을 평생의 기록으로
          <br />
          남기세요
        </h2>
        <p className="text-rose-100 text-sm mb-8">지금 바로 무료로 시작하세요.</p>
        <Link
          to="/create"
          className="inline-block bg-white text-rose-500 hover:bg-rose-50 font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          무료로 시작하기
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">© 2026 Wedding Guest Album. All rights reserved.</p>
      </footer>
    </div>
  );
}
