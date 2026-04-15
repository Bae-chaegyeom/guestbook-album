import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import * as sweetbook from '../lib/sweetbook';

export const albumRouter = Router();

// ── 타입 ─────────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ['PENDING', 'BOOK_CREATED', 'PHOTOS_UPLOADED', 'COVER_ADDED', 'CONTENTS_ADDED'] as const;

// ── GET /api/album/book-specs ─────────────────────────────────────────────────
// 고정 경로는 :eventId 파라미터 라우트보다 반드시 먼저 등록해야 함

albumRouter.get('/book-specs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const specs = await sweetbook.listBookSpecs();
    res.json({ specs });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/album/templates ──────────────────────────────────────────────────

// ── GET /api/album/template-params/:templateUid ───────────────────────────────
// 템플릿의 필수 텍스트 파라미터 목록 조회 (UI에서 입력 폼 생성에 사용)

albumRouter.get('/template-params/:templateUid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const capabilities = await sweetbook.getTemplateCapabilities(req.params.templateUid);
    res.json({
      fields: capabilities.textFields,
      supportsImages: capabilities.supportsImages,
      imageFieldCount: capabilities.imageFieldCount,
      usesGallery: capabilities.usesGallery,
    });
  } catch (err) {
    next(err);
  }
});

albumRouter.get('/templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookSpecUid = typeof req.query.bookSpecUid === 'string' ? req.query.bookSpecUid : undefined;
    const kind = req.query.kind === 'cover' ? 'cover' : req.query.kind === 'content' ? 'content' : undefined;
    const templates = await sweetbook.listTemplates(bookSpecUid, kind);
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/album/:eventId ───────────────────────────────────────────────────
// 현재 AlbumJob 상태 조회

albumRouter.get('/:eventId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.albumJob.findFirst({
      where: { eventId: req.params.eventId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ job: job ?? null });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/album/:eventId/build ───────────────────────────────────────────
// 승인된 사진으로 Sweetbook 책 생성 ~ finalize 까지 실행

const buildSchema = z.object({
  bookSpecUid: z.string().min(1, 'bookSpecUid는 필수입니다.'),
  coverTemplateUid: z.string().min(1, 'coverTemplateUid는 필수입니다.'),
  contentTemplateUid: z.string().min(1, 'contentTemplateUid는 필수입니다.'),
  coverTextParams: z.record(z.string()).optional().default({}),
  contentTextParams: z.record(z.string()).optional().default({}),
});

albumRouter.post('/:eventId/build', async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;

  try {
    // 0. 요청 바디 파싱 및 검증
    const parseResult = buildSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.errors[0].message });
      return;
    }
    const { bookSpecUid, coverTemplateUid, contentTemplateUid, coverTextParams, contentTextParams } = parseResult.data;

    const [coverCapabilities, contentCapabilities] = await Promise.all([
      sweetbook.getTemplateCapabilities(coverTemplateUid),
      sweetbook.getTemplateCapabilities(contentTemplateUid),
    ]);

    if (!coverCapabilities.supportsImages) {
      res.status(400).json({
        error: '선택한 표지 템플릿은 사진 슬롯이 없습니다. 표지 이미지를 받는 템플릿을 선택해주세요.',
      });
      return;
    }

    if (!contentCapabilities.supportsImages) {
      res.status(400).json({
        error: '선택한 본문 템플릿은 사진 슬롯이 없습니다. 빈내지 대신 사진이 들어가는 본문 템플릿을 선택해주세요.',
      });
      return;
    }

    // 1. 이벤트 확인
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
      return;
    }

    // 2. 승인된 사진 확인
    const uploads = await prisma.guestUpload.findMany({
      where: { eventId, approved: true },
      orderBy: { createdAt: 'asc' },
    });
    if (uploads.length === 0) {
      res.status(400).json({ error: '승인된 사진이 없습니다. 먼저 사진을 승인해주세요.' });
      return;
    }

    // 3. 중복 실행 방지
    const existing = await prisma.albumJob.findFirst({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.status === 'ORDER_PLACED') {
      res.status(409).json({ error: '이미 주문이 완료된 이벤트입니다.', job: existing });
      return;
    }
    if (existing?.status === 'FINALIZED') {
      res.status(409).json({ error: '앨범이 이미 완성되었습니다. 주문을 진행해주세요.', job: existing });
      return;
    }
    if (existing && (ACTIVE_STATUSES as readonly string[]).includes(existing.status)) {
      res.status(409).json({ error: '앨범 생성이 이미 진행 중입니다.', job: existing });
      return;
    }

    // 4. AlbumJob 생성 (FAILED 상태면 새로 만들어 재시도)
    const job = await prisma.albumJob.create({
      data: { eventId, status: 'PENDING' },
    });

    const imageUrls = uploads.map((u) => u.imageUrl);

    // 5. 단계별 빌드 (각 단계 후 DB 상태 업데이트)
    try {
      // Step 1: 책 생성
      const bookUid = await sweetbook.createBook(event.title, bookSpecUid);
      await prisma.albumJob.update({
        where: { id: job.id },
        data: { sweetbookBookId: bookUid, status: 'BOOK_CREATED' },
      });

      // Step 2: 사진 업로드
      await sweetbook.uploadPhotos(bookUid, imageUrls);
      await prisma.albumJob.update({
        where: { id: job.id },
        data: { status: 'PHOTOS_UPLOADED' },
      });

      // Step 3: 표지 생성 (첫 번째 사진)
      await sweetbook.createCover(bookUid, imageUrls[0], coverTemplateUid, coverTextParams);
      await prisma.albumJob.update({
        where: { id: job.id },
        data: { status: 'COVER_ADDED' },
      });

      // Step 4: 본문 페이지 추가 (두 번째 사진부터)
      if (imageUrls.length > 1) {
        await sweetbook.addContents(bookUid, imageUrls.slice(1), contentTemplateUid, contentTextParams);
      }
      await prisma.albumJob.update({
        where: { id: job.id },
        data: { status: 'CONTENTS_ADDED' },
      });

      // Step 5: 최종화 (비가역적)
      await sweetbook.finalizeBook(bookUid);
      const finalJob = await prisma.albumJob.update({
        where: { id: job.id },
        data: { status: 'FINALIZED', errorMessage: null },
      });

      res.json({ job: finalJob });
    } catch (buildErr) {
      const errorMessage = sweetbook.extractErrorMessage(buildErr);
      console.error(`[Album Build] eventId=${eventId} FAILED:`, errorMessage);
      const failedJob = await prisma.albumJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage },
      });
      res.status(500).json({ error: errorMessage, job: failedJob });
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/album/:eventId/estimate ────────────────────────────────────────
// 주문 전 가격 예상 (수량 입력)

const estimateSchema = z.object({
  quantity: z.number().int().min(1).max(100),
});

albumRouter.post('/:eventId/estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quantity } = estimateSchema.parse(req.body);

    const job = await prisma.albumJob.findFirst({
      where: { eventId: req.params.eventId, status: 'FINALIZED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!job?.sweetbookBookId) {
      res.status(400).json({ error: '완성된 앨범이 없습니다. 먼저 앨범을 생성해주세요.' });
      return;
    }

    const estimate = await sweetbook.estimateOrder(job.sweetbookBookId, quantity);
    res.json({ estimate });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/album/:eventId/order ───────────────────────────────────────────
// 주문 생성 (배송 정보 포함)

const shippingSchema = z.object({
  recipientName: z.string().min(1, '수령인 이름을 입력해주세요.'),
  recipientPhone: z.string().min(1, '연락처를 입력해주세요.'),
  postalCode: z.string().min(1, '우편번호를 입력해주세요.'),
  address1: z.string().min(1, '주소를 입력해주세요.'),
  address2: z.string().optional(),
  shippingMemo: z.string().max(100).optional(),
});

const orderSchema = z.object({
  quantity: z.number().int().min(1).max(100),
  shipping: shippingSchema,
});

albumRouter.post('/:eventId/order', async (req: Request, res: Response, next: NextFunction) => {
  const { eventId } = req.params;
  try {
    const { quantity, shipping } = orderSchema.parse(req.body);

    // FINALIZED 상태인 job만 주문 가능
    const job = await prisma.albumJob.findFirst({
      where: { eventId, status: 'FINALIZED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!job?.sweetbookBookId) {
      res.status(400).json({ error: '완성된 앨범이 없습니다.' });
      return;
    }

    try {
      const orderUid = await sweetbook.placeOrder({
        bookUid: job.sweetbookBookId,
        quantity,
        shipping,
        externalRef: eventId, // 내부 이벤트 ID를 외부 참조로 전달
      });

      const updatedJob = await prisma.albumJob.update({
        where: { id: job.id },
        data: { sweetbookOrderId: orderUid, status: 'ORDER_PLACED', errorMessage: null },
      });

      res.json({ job: updatedJob, orderUid });
    } catch (orderErr) {
      const errorMessage = sweetbook.extractErrorMessage(orderErr);
      console.error(`[Album Order] eventId=${eventId} FAILED:`, errorMessage);
      await prisma.albumJob.update({
        where: { id: job.id },
        data: { errorMessage },
      });
      res.status(500).json({ error: errorMessage });
    }
  } catch (err) {
    next(err);
  }
});

// ── GET /api/album/:eventId/order-status ─────────────────────────────────────
// Sweetbook에서 실시간 주문 상태 조회

albumRouter.get('/:eventId/order-status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.albumJob.findFirst({
      where: { eventId: req.params.eventId, status: 'ORDER_PLACED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!job?.sweetbookOrderId) {
      res.status(404).json({ error: '주문 정보를 찾을 수 없습니다.' });
      return;
    }
    const status = await sweetbook.getOrderStatus(job.sweetbookOrderId);
    res.json({ orderUid: job.sweetbookOrderId, status });
  } catch (err) {
    next(err);
  }
});
