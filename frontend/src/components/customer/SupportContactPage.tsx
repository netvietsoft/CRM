import Link from 'next/link';
import { supportContact } from '@/lib/support';

interface SupportContactPageProps {
  form: React.ReactNode;
}

export default function SupportContactPage({ form }: SupportContactPageProps) {
  const directChannels = [
    {
      title: 'Hotline',
      value: supportContact.hotlineDisplay,
      href: supportContact.hotlineHref,
      description: 'Gọi trực tiếp để được hỗ trợ nhanh các vấn đề khẩn cấp.',
      icon: '📞',
      tone: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      title: 'Email',
      value: supportContact.email,
      href: supportContact.emailHref,
      description: 'Phù hợp khi cần mô tả vấn đề chi tiết hoặc gửi kèm thông tin đơn hàng.',
      icon: '📧',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    ...(supportContact.zaloUrl
      ? [
          {
            title: 'Zalo hỗ trợ',
            value: 'Mở Zalo',
            href: supportContact.zaloUrl,
            description: 'Mở trực tiếp kênh Zalo hỗ trợ nếu môi trường đã được cấu hình URL chính thức.',
            icon: '💬',
            tone: 'border-sky-200 bg-sky-50 text-sky-700',
          },
        ]
      : []),
    ...(supportContact.messengerUrl
      ? [
          {
            title: 'Messenger',
            value: 'Mở Messenger',
            href: supportContact.messengerUrl,
            description: 'Mở thẳng kênh Messenger hỗ trợ nếu môi trường đã được cấu hình URL chính thức.',
            icon: '📨',
            tone: 'border-violet-200 bg-violet-50 text-violet-700',
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-white py-6 md:bg-gray-50 md:py-12">
      <div className="mx-auto w-full px-4 md:w-[80%] md:px-0">
        <div className="bg-white p-0 sm:p-6 md:rounded-lg md:border md:border-gray-200 md:p-12 md:shadow-sm">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
              Liên hệ hỗ trợ
            </h1>
            <p className="text-lg text-gray-600">
              Chúng tôi luôn sẵn sàng hỗ trợ bạn qua các kênh đang hoạt động trên hệ thống hiện tại.
            </p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-6 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                Các kênh liên hệ
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {directChannels.map((channel) => (
                  <a
                    key={channel.title}
                    href={channel.href}
                    target={channel.href.startsWith('http') ? '_blank' : undefined}
                    rel={channel.href.startsWith('http') ? 'noreferrer' : undefined}
                    className="rounded-lg border border-gray-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg text-2xl ${channel.tone}`}>
                        {channel.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{channel.title}</h3>
                        <p className="mt-2 text-lg font-semibold text-indigo-700">{channel.value}</p>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{channel.description}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {!supportContact.zaloUrl && !supportContact.messengerUrl && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-gray-700">
                  Kênh chat trực tiếp qua Zalo hoặc Messenger chưa được cấu hình URL chính thức trong môi trường hiện tại. Người dùng vẫn có thể liên hệ ngay qua hotline, email hoặc form gửi yêu cầu bên dưới.
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-6 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                Địa chỉ văn phòng
              </h2>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8">
                <div className="grid gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                      <span className="text-2xl">🏢</span>
                      Trụ sở chính
                    </h3>
                    <div className="space-y-3 text-gray-700">
                      <p className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold">Địa chỉ:</span>
                        <span>{supportContact.address}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold">Điện thoại:</span>
                        <span>{supportContact.hotlineDisplay}</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="min-w-[80px] font-semibold">Email:</span>
                        <span>{supportContact.email}</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
                      <span className="text-2xl">🚗</span>
                      Hướng dẫn đến
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>• <strong>Xe bus:</strong> Tuyến 03, 23, 34 - Dừng Trần Đăng Ninh</p>
                      <p>• <strong>Taxi/Grab:</strong> Nhập địa chỉ &quot;72 Trần Đăng Ninh&quot;</p>
                      <p>• <strong>Xe máy:</strong> Có bãi đỗ xe miễn phí</p>
                      <p>• <strong>Ô tô:</strong> Bãi đỗ xe trong tòa nhà</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 h-64 overflow-hidden rounded-xl bg-gray-200">
                  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.866530836074!2d105.79111937614863!3d21.038025787458512!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab3829364ab7%3A0x3034d069a38bef5b!2zNzIgVHLhuqduIMSQxINuZyBOaW5oLCBMw6BuZyBRdeG7kWMgdOG6vyBUaMSDbmcgTG9uZywgTmdoxKlhIMSQw7QsIEjDoCBO4buZaSAxMDAwMDAsIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1777887097433!5m2!1svi!2s" width="100%" height="100%" style={{ border: 0 }} allowFullScreen={true} loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-6 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                Trước khi gửi yêu cầu
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                  <div className="text-sm font-semibold uppercase tracking-wide text-indigo-700">FAQ</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">Kiểm tra câu hỏi thường gặp trước</div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Nếu vấn đề của bạn liên quan đến thanh toán, voucher hoặc đăng nhập, hãy kiểm tra trang FAQ trước khi gửi yêu cầu để tiết kiệm thời gian.
                  </p>
                </div>
                <Link
                  href="/faq"
                  className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Đi nhanh</div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">Mở trang FAQ</div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    Xem nhóm câu hỏi về thanh toán, voucher và đăng nhập đúng theo chức năng hiện có trên hệ thống.
                  </p>
                </Link>
              </div>
            </section>

            <section>
              <h2 className="mb-6 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                Gửi tin nhắn cho chúng tôi
              </h2>
              {form}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
