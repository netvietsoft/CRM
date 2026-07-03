import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';

/* R2Service — upload ảnh/tệp/video lên Cloudflare R2 (S3-compatible).
 * KHÔNG dùng @aws-sdk (tránh thêm dependency) — tự ký AWS SigV4 bằng crypto + fetch.
 * Config lấy từ env (copy theo NovelApp): R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 * R2_BUCKET_NAME, R2_URL (base URL public). */

type UploadedFile = { originalname: string; mimetype: string; buffer: Buffer };

const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();
const sha256hex = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

@Injectable()
export class R2Service {
  private readonly endpoint = (process.env.R2_ENDPOINT || '').replace(/\/$/, '');
  private readonly bucket = process.env.R2_BUCKET_NAME || '';
  private readonly accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  private readonly secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
  private readonly publicBase = (process.env.R2_URL || '').replace(/\/$/, '');

  isConfigured() {
    return !!(this.endpoint && this.bucket && this.accessKeyId && this.secretAccessKey && this.publicBase);
  }

  // folder: phân loại (images/files/videos). Trả URL public.
  async upload(file: UploadedFile, folder = 'ccm'): Promise<string> {
    if (!this.isConfigured()) throw new BadRequestException('Chưa cấu hình R2 (R2_ENDPOINT/R2_BUCKET_NAME/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_URL).');
    const ext = file.originalname.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || this.extFromMime(file.mimetype);
    const key = `${folder}/${Date.now()}-${randomUUID()}.${ext}`;

    const url = new URL(`${this.endpoint}/${this.bucket}/${key}`);
    const host = url.host;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256hex(file.buffer);
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const canonicalUri = `/${this.bucket}/${key}`; // key sinh từ ký tự an toàn → không cần encode thêm
    const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const scope = `${dateStamp}/auto/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256hex(canonicalRequest)}`;
    const kSigning = hmac(hmac(hmac(hmac('AWS4' + this.secretAccessKey, dateStamp), 'auto'), 's3'), 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: authorization,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          'Content-Type': file.mimetype,
          'Content-Length': String(file.buffer.length),
        },
        body: new Uint8Array(file.buffer),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`R2 ${res.status}: ${body.slice(0, 300)}`);
      }
      return `${this.publicBase}/${key}`;
    } catch (e) {
      throw new InternalServerErrorException(`Upload R2 thất bại: ${e instanceof Error ? e.message : 'lỗi không rõ'}`);
    }
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
      'video/mp4': 'mp4', 'video/webm': 'webm', 'application/pdf': 'pdf',
    };
    return map[mime] || 'bin';
  }
}
