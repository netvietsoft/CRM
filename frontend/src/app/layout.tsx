import type { Metadata } from "next";
import { Suspense } from "react";
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import NavigationProgress from "@/components/ui/NavigationProgress";

export const metadata: Metadata = {
  title: "CHY Customer CRM — Hệ thống chăm sóc khách hàng",
  description: "Hệ thống CRM toàn diện: quản lý voucher, referral đa tầng, vòng quay may mắn, và thông báo đa kênh Zalo/Facebook",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover />
      </body>
    </html>
  );
}
