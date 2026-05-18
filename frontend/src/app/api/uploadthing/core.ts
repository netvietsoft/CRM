import { createUploadthing, type FileRouter } from "uploadthing/next";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const f = createUploadthing();

// Auth function to verify user (admin/staff)
const authAdmin = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('crm_access_token')?.value;
  
  if (!token) {
    throw new Error("Unauthorized");
  }

  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'STAFF')) {
    throw new Error("Forbidden");
  }

  return { userId: payload.userId, role: payload.role };
};

// Auth function for store owners/moderators
const authStoreOwner = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('crm_access_token')?.value;
  
  if (!token) {
    throw new Error("Unauthorized");
  }

  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'MODERATOR')) {
    throw new Error("Forbidden");
  }

  return { userId: payload.userId, role: payload.role };
};

// Auth function for customers
const authCustomer = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('crm_access_token')?.value;
  
  if (!token) {
    throw new Error("Unauthorized");
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error("Forbidden");
  }

  return { userId: payload.userId, role: payload.role };
};

export const ourFileRouter = {
  // Product image uploader (admin only)
  productImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authAdmin();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Category image uploader (admin only)
  categoryImage: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authAdmin();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Store logo uploader (admin & moderator)
  storeLogo: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await authStoreOwner();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Review image uploader (customers)
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(async () => {
      const user = await authCustomer();
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Review image upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
