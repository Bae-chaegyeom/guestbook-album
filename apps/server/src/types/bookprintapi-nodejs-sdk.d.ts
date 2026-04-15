/**
 * bookprintapi-nodejs-sdk 타입 선언
 * SDK에 .d.ts 파일이 없어 수동으로 작성
 */
declare module 'bookprintapi-nodejs-sdk' {
  interface ClientOptions {
    apiKey: string;
    environment?: 'sandbox' | 'live';
    baseUrl?: string;
    timeout?: number;
  }

  interface CreateBookParams {
    bookSpecUid: string;
    title?: string;
    creationType?: string;
    [key: string]: unknown;
  }

  interface EstimateParams {
    items: Array<{ bookUid: string; quantity: number }>;
  }

  interface ShippingParams {
    recipientName: string;
    recipientPhone?: string;
    postalCode?: string;
    address1?: string;
    address2?: string;
    shippingMemo?: string;
    [key: string]: unknown;
  }

  interface CreateOrderParams {
    items: Array<{ bookUid: string; quantity: number }>;
    shipping: ShippingParams;
    externalRef?: string;
  }

  interface InsertContentsOptions {
    files?: File[];
    breakBefore?: string;
  }

  class SweetbookClient {
    constructor(options: ClientOptions);

    books: {
      create(params: CreateBookParams): Promise<Record<string, unknown>>;
      get(bookUid: string): Promise<Record<string, unknown>>;
      list(): Promise<unknown[]>;
      finalize(bookUid: string): Promise<Record<string, unknown>>;
      delete(bookUid: string): Promise<void>;
    };

    photos: {
      upload(bookUid: string, file: File, options?: { preserveExif?: boolean }): Promise<Record<string, unknown>>;
      list(bookUid: string): Promise<unknown[]>;
      delete(bookUid: string, photoId: string): Promise<void>;
    };

    covers: {
      create(
        bookUid: string,
        templateUid: string,
        parameters: Record<string, unknown>,
        files?: File[]
      ): Promise<Record<string, unknown>>;
    };

    contents: {
      insert(
        bookUid: string,
        templateUid: string,
        parameters: Record<string, unknown>,
        options?: InsertContentsOptions
      ): Promise<Record<string, unknown>>;
      clear(bookUid: string): Promise<void>;
    };

    orders: {
      estimate(params: EstimateParams): Promise<Record<string, unknown>>;
      create(params: CreateOrderParams): Promise<Record<string, unknown>>;
      get(orderUid: string): Promise<Record<string, unknown>>;
      cancel(orderUid: string): Promise<void>;
    };

    credits: {
      getBalance(): Promise<Record<string, unknown>>;
    };

    bookSpecs: {
      list(): Promise<unknown[]>;
    };

    templates: {
      list(params?: { bookSpecUid?: string }): Promise<unknown[]>;
    };
  }
}
