import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Tối Nay Xem Gì? - Gacha Phim',
  description: 'Hội chứng sợ lựa chọn? Hãy để vòng quay nhân phẩm quyết định bộ phim Hàn Quốc tối nay của bạn!',
  applicationName: 'Tối Nay Xem Gì?',

  // Đã chuyển thành true để Google, Bing có thể index và tìm thấy web của bạn
  robots: {
    index: true,
    follow: true,
  },

  // Bổ sung OpenGraph để hiển thị ảnh/tiêu đề đẹp khi share link
  openGraph: {
    title: 'Tối Nay Xem Gì? - Vòng quay chọn phim',
    description: 'Không biết xem gì tối nay? Mở hòm ngay để nhận một bộ phim ngẫu nhiên!',
    type: 'website',
    locale: 'vi_VN',
    siteName: 'Tối Nay Xem Gì',
  },

  // Các icon gốc tạm thời giữ nguyên
  icons: {
    icon: '/brand/favicon-cs-v2.png',
    shortcut: '/favicon.ico?v=cs-v2',
    apple: '/brand/apple-touch-icon-cs-v2.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#27323b',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}