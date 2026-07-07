import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'uploadthing.com',
            },
            {
                // R2 public bucket — ảnh sản phẩm/logo/đánh giá sau khi chuyển từ UploadThing
                protocol: 'https',
                hostname: 'pub-ca26f31996334a31b9b0f3e8ed38ff96.r2.dev',
            },
        ],
    },
};

export default nextConfig;
