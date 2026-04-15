/**
 * 데모용 더미 데이터 시드 스크립트
 *
 * 실행: npm run db:seed (apps/server 디렉토리에서)
 *
 * 생성되는 데이터:
 *  - 데모 이벤트 1개 (결혼식)
 *  - 게스트 업로드 25개 (18개 승인, 7개 미승인)
 *
 * 이미지: 레포에 포함된 prisma/seed-assets/seed-001.png ~ seed-025.png 사용
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const SEED_ASSETS_DIR = path.join(process.cwd(), 'prisma', 'seed-assets');

// 더미 사진 정의 (레포에 포함된 샘플 이미지 사용)
const SEED_PHOTOS = [
  { filename: 'seed-001.png', message: '두 분의 결혼을 진심으로 축하드립니다! 항상 행복하세요 😊', uploaderName: '김하늘', approved: true },
  { filename: 'seed-002.png', message: '오늘 정말 아름다운 날이에요. 백년해로하세요!', uploaderName: '박지수', approved: true },
  { filename: 'seed-003.png', message: '두 분이 너무 잘 어울려요. 축하해요!', uploaderName: '이준혁', approved: true },
  { filename: 'seed-004.png', message: '행복한 가정 이루세요~', uploaderName: '최유진', approved: true },
  { filename: 'seed-005.png', message: '결혼 진심으로 축하드려요. 사진 많이 남겨주세요!', uploaderName: '정민서', approved: true },
  { filename: 'seed-006.png', message: '오늘의 순간들이 오래오래 남길 바라요.', uploaderName: '한지민', approved: true },
  { filename: 'seed-007.png', message: '두 분 앞날에 웃음이 가득하길 바랍니다.', uploaderName: '윤태호', approved: true },
  { filename: 'seed-008.png', message: '행복한 신혼 생활 보내세요!', uploaderName: '오세린', approved: true },
  { filename: 'seed-009.png', message: '결혼식 분위기가 정말 좋네요. 축하드립니다!', uploaderName: '임서준', approved: true },
  { filename: 'seed-010.png', message: '평생 서로의 가장 좋은 친구가 되어주세요.', uploaderName: '강소희', approved: true },
  { filename: 'seed-011.png', message: '예쁜 추억 한 장 남기고 갑니다 :)', uploaderName: '이현우', approved: true },
  { filename: 'seed-012.png', message: '사진 보면서 오늘의 감동을 오래 기억하세요.', uploaderName: '김다은', approved: true },
  { filename: 'seed-013.png', message: '좋은 날 함께해서 기뻤어요!', uploaderName: '박준영', approved: true },
  { filename: 'seed-014.png', message: '두 분 케미가 정말 최고예요.', uploaderName: '최수아', approved: true },
  { filename: 'seed-015.png', message: '앞으로도 반짝이는 날들만 가득하길!', uploaderName: '정유나', approved: true },
  { filename: 'seed-016.png', message: '행복한 순간을 책으로 남길 수 있어 더 좋네요.', uploaderName: '홍민기', approved: true },
  { filename: 'seed-017.png', message: '소중한 날 초대해주셔서 감사합니다.', uploaderName: '송예림', approved: true },
  { filename: 'seed-018.png', message: '두 분의 새 출발을 진심으로 응원합니다.', uploaderName: '조현수', approved: true },
  { filename: 'seed-019.png', message: undefined, uploaderName: '김나연', approved: false },
  { filename: 'seed-020.png', message: '축하드립니다!', uploaderName: undefined, approved: false },
  { filename: 'seed-021.png', message: '사진 잘 나왔길 바라요.', uploaderName: '장도윤', approved: false },
  { filename: 'seed-022.png', message: undefined, uploaderName: '서민아', approved: false },
  { filename: 'seed-023.png', message: '오늘 너무 예뻤어요!', uploaderName: '백지훈', approved: false },
  { filename: 'seed-024.png', message: undefined, uploaderName: undefined, approved: false },
  { filename: 'seed-025.png', message: '행복하세요!', uploaderName: '유서연', approved: false },
];

async function copySeedImageToUploads(filename: string): Promise<string> {
  const sourcePath = path.join(SEED_ASSETS_DIR, filename);
  const targetPath = path.join(UPLOADS_DIR, filename);
  await fs.access(sourcePath);
  await fs.copyFile(sourcePath, targetPath);
  return `/uploads/${filename}`;
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
  const hashedPin = await bcrypt.hash('1234', BCRYPT_ROUNDS);
  console.log('📅 이벤트 생성 중...');
  const event = await prisma.event.create({
    data: {
      id: DEMO_EVENT_ID,
      title: '김민준 & 이서연의 결혼식 (데모)',
      weddingDate: new Date('2026-06-14T11:00:00.000Z'),
      brideName: '이서연',
      groomName: '김민준',
      tagline: '소중한 순간을 함께 나눠주세요 💍',
      hostPin: hashedPin,
      publicToken: 'demo-token-sweetbook-2026',
    },
  });
  console.log(`  ✓  이벤트 ID: ${event.id}`);
  console.log(`  ✓  게스트 링크 토큰: ${event.publicToken}`);
  console.log(`  ✓  호스트 PIN: 1234\n`);

  // 레포에 포함된 샘플 이미지를 uploads 디렉토리로 복사 후 업로드 레코드 생성
  console.log('🖼  게스트 업로드 생성 중...');
  for (const photo of SEED_PHOTOS) {
    const imageUrl = await copySeedImageToUploads(photo.filename);

    await prisma.guestUpload.create({
      data: {
        eventId: event.id,
        imageUrl,
        message: photo.message,
        uploaderName: photo.uploaderName,
        approved: photo.approved,
      },
    });
    console.log(`  ✓  업로드 생성: ${photo.filename} · ${photo.uploaderName ?? '익명'} (${photo.approved ? '승인됨' : '미승인'})`);
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
