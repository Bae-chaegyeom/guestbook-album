/**
 * 데모용 더미 데이터 시드 스크립트
 *
 * 실행: npm run db:seed (apps/server 디렉토리에서)
 *
 * 생성되는 데이터:
 *  - 데모 이벤트 1개 (결혼식)
 *  - 게스트 업로드 6개 (4개 승인, 2개 미승인)
 *
 * 이미지: picsum.photos에서 다운로드 (인터넷 연결 필요)
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// 더미 사진 정의 (picsum.photos — 시드 ID 고정으로 항상 같은 이미지)
const SEED_PHOTOS = [
  { id: 'seed-001', seed: '10',  message: '두 분의 결혼을 진심으로 축하드립니다! 항상 행복하세요 😊', uploaderName: '김하늘', approved: true },
  { id: 'seed-002', seed: '20',  message: '오늘 정말 아름다운 날이에요. 백년해로하세요!',              uploaderName: '박지수', approved: true },
  { id: 'seed-003', seed: '30',  message: '두 분이 너무 잘 어울려요. 축하해요!',                     uploaderName: '이준혁', approved: true },
  { id: 'seed-004', seed: '40',  message: '행복한 가정 이루세요~',                                   uploaderName: '최유진', approved: true },
  { id: 'seed-005', seed: '50',  message: undefined,                                                  uploaderName: '정민서', approved: false },
  { id: 'seed-006', seed: '60',  message: '결혼 축하드립니다!',                                      uploaderName: undefined, approved: false },
];

async function downloadImage(seed: string, filename: string): Promise<string> {
  const filePath = path.join(UPLOADS_DIR, filename);

  // 이미 존재하면 다운로드 건너뜀
  try {
    await fs.access(filePath);
    console.log(`  ↩  이미 존재: ${filename}`);
    return `uploads/${filename}`;
  } catch {
    // 파일 없음 — 다운로드 진행
  }

  const url = `https://picsum.photos/seed/${seed}/800/600`;
  console.log(`  ↓  다운로드: ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 다운로드 실패: ${res.status} ${url}`);

  const arrayBuffer = await res.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));
  console.log(`  ✓  저장: ${filename}`);
  return `uploads/${filename}`;
}

async function main() {
  console.log('\n🌱 시드 데이터 생성 시작...\n');

  // uploads 디렉토리 생성
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  // 기존 시드 데이터 삭제 (멱등성)
  const existing = await prisma.event.findFirst({
    where: { title: '김민준 & 이서연의 결혼식 (데모)' },
  });
  if (existing) {
    console.log('⚠  기존 시드 이벤트 발견 — 삭제 후 재생성합니다.\n');
    await prisma.albumJob.deleteMany({ where: { eventId: existing.id } });
    await prisma.guestUpload.deleteMany({ where: { eventId: existing.id } });
    await prisma.event.delete({ where: { id: existing.id } });
  }

  // 이벤트 생성 (고정 ID — 대시보드 URL을 예측 가능하게 유지)
  const DEMO_EVENT_ID = 'demo-event-sweetbook-2026';
  console.log('📅 이벤트 생성 중...');
  const event = await prisma.event.create({
    data: {
      id: DEMO_EVENT_ID,
      title: '김민준 & 이서연의 결혼식 (데모)',
      weddingDate: new Date('2026-06-14T11:00:00.000Z'),
      brideName: '이서연',
      groomName: '김민준',
      tagline: '소중한 순간을 함께 나눠주세요 💍',
      hostPin: '1234',
      publicToken: 'demo-token-sweetbook-2026',
    },
  });
  console.log(`  ✓  이벤트 ID: ${event.id}`);
  console.log(`  ✓  게스트 링크 토큰: ${event.publicToken}`);
  console.log(`  ✓  호스트 PIN: 1234\n`);

  // 이미지 다운로드 및 업로드 레코드 생성
  console.log('🖼  게스트 업로드 생성 중...');
  for (const photo of SEED_PHOTOS) {
    const filename = `${photo.id}.jpg`;
    const imageUrl = await downloadImage(photo.seed, filename);

    await prisma.guestUpload.create({
      data: {
        eventId: event.id,
        imageUrl,
        message: photo.message,
        uploaderName: photo.uploaderName,
        approved: photo.approved,
      },
    });
    console.log(`  ✓  업로드 생성: ${photo.uploaderName ?? '익명'} (${photo.approved ? '승인됨' : '미승인'})`);
  }

  console.log('\n✅ 시드 완료!\n');
  console.log('─────────────────────────────────────────');
  console.log('🌐 앱 실행 후 아래 URL에서 확인하세요:');
  console.log('');
  console.log('  호스트 대시보드 (PIN: 1234):');
  console.log(`  http://localhost:5173/dashboard/${event.id}`);
  console.log('');
  console.log('  게스트 업로드 페이지:');
  console.log(`  http://localhost:5173/g/${event.publicToken}`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ 시드 실패:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
