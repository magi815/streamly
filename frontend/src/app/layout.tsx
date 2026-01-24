import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Streamly - 어디서 볼까?",
  description: "국내 OTT 플랫폼의 영화와 드라마를 한눈에 검색하세요",
  keywords: ["OTT", "넷플릭스", "티빙", "웨이브", "디즈니플러스", "영화", "드라마"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${notoSansKR.className} bg-gray-900 text-white antialiased`}>
        <Header />
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500">
          <p>© 2026 Streamly. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
