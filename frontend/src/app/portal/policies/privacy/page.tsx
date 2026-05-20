import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật | Customer CRM',
  description: 'Chính sách bảo mật thông tin khách hàng tại Customer CRM',
};

const lastUpdated = '20/05/2026';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white py-6 md:bg-gray-50 md:py-12">
      <div className="mx-auto w-full px-4 md:w-[80%] md:px-0">
        <div className="bg-white p-0 sm:p-6 md:rounded-lg md:border md:border-gray-200 md:p-12 md:shadow-sm">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
              Chính sách bảo mật thông tin
            </h1>
            <p className="text-lg text-gray-600">Cam kết bảo vệ thông tin cá nhân của khách hàng</p>
            <p className="mt-2 text-sm text-gray-500">Cập nhật lần cuối: {lastUpdated}</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                1. Mục đích thu thập thông tin
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>Customer CRM thu thập và sử dụng thông tin cá nhân của bạn cho các mục đích sau:</p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li><strong>Xử lý đơn hàng:</strong> Xác nhận, đóng gói và giao hàng đến địa chỉ của bạn</li>
                    <li><strong>Thanh toán:</strong> Xử lý các giao dịch thanh toán an toàn</li>
                    <li><strong>Chăm sóc khách hàng:</strong> Hỗ trợ giải đáp thắc mắc, xử lý khiếu nại</li>
                    <li><strong>Marketing:</strong> Gửi thông tin khuyến mãi, sản phẩm mới nếu bạn đồng ý</li>
                    <li><strong>Cải thiện dịch vụ:</strong> Phân tích hành vi mua sắm để nâng cao trải nghiệm</li>
                    <li><strong>Bảo mật:</strong> Ngăn chặn gian lận, bảo vệ tài khoản</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                2. Thông tin chúng tôi thu thập
              </h2>
              <div className="ml-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-blue-900">👤 Thông tin cá nhân</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Họ và tên</li>
                      <li>Số điện thoại</li>
                      <li>Địa chỉ email</li>
                      <li>Địa chỉ giao hàng</li>
                      <li>Ngày sinh (tùy chọn)</li>
                      <li>Giới tính (tùy chọn)</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-green-900">💳 Thông tin thanh toán</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Thông tin thẻ thanh toán (mã hóa)</li>
                      <li>Lịch sử giao dịch</li>
                      <li>Phương thức thanh toán ưa thích</li>
                      <li>Thông tin hóa đơn</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-purple-900">🛒 Thông tin mua sắm</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Lịch sử đơn hàng</li>
                      <li>Sản phẩm yêu thích</li>
                      <li>Giỏ hàng</li>
                      <li>Đánh giá sản phẩm</li>
                      <li>Sở thích mua sắm</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-orange-900">📱 Thông tin kỹ thuật</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Địa chỉ IP</li>
                      <li>Loại trình duyệt</li>
                      <li>Thiết bị sử dụng</li>
                      <li>Cookies</li>
                      <li>Thời gian truy cập</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                3. Cách thức bảo mật thông tin
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>Chúng tôi áp dụng các biện pháp bảo mật tiên tiến để bảo vệ thông tin của bạn:</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-xl text-white">🔒</div>
                      <h3 className="font-semibold text-gray-900">Mã hóa SSL/TLS</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Tất cả dữ liệu truyền tải được mã hóa bằng công nghệ SSL 256-bit, đảm bảo an toàn tuyệt đối.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-xl text-white">🛡️</div>
                      <h3 className="font-semibold text-gray-900">Tường lửa bảo mật</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Hệ thống tường lửa đa lớp ngăn chặn truy cập trái phép và tấn công mạng.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-xl text-white">🔐</div>
                      <h3 className="font-semibold text-gray-900">Xác thực 2 lớp</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Hỗ trợ xác thực 2 yếu tố (2FA) để bảo vệ tài khoản khỏi truy cập trái phép.
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-xl text-white">💾</div>
                      <h3 className="font-semibold text-gray-900">Sao lưu định kỳ</h3>
                    </div>
                    <p className="text-sm text-gray-700">
                      Dữ liệu được sao lưu tự động hàng ngày và lưu trữ ở nhiều địa điểm khác nhau.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <h3 className="mb-3 font-semibold text-red-900">⚠️ Lưu ý bảo mật:</h3>
                  <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                    <li>Không chia sẻ mật khẩu với bất kỳ ai, kể cả nhân viên Customer CRM</li>
                    <li>Sử dụng mật khẩu mạnh, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt</li>
                    <li>Đăng xuất sau khi sử dụng trên thiết bị chung</li>
                    <li>Cập nhật thường xuyên thông tin bảo mật</li>
                    <li>Báo ngay cho chúng tôi nếu phát hiện hoạt động bất thường</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                4. Chia sẻ thông tin với bên thứ ba
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>Chúng tôi chỉ chia sẻ thông tin của bạn với các đối tác tin cậy trong các trường hợp sau:</p>
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-2 font-semibold text-blue-900">🚚 Đơn vị vận chuyển</h3>
                    <p className="text-sm">Chia sẻ tên, số điện thoại và địa chỉ để giao hàng. Các đối tác cam kết bảo mật thông tin.</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-2 font-semibold text-green-900">💳 Cổng thanh toán</h3>
                    <p className="text-sm">Thông tin thanh toán được xử lý qua các cổng thanh toán đạt chuẩn PCI DSS như VNPay, MoMo, ZaloPay.</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-2 font-semibold text-purple-900">📧 Dịch vụ email marketing</h3>
                    <p className="text-sm">Chỉ chia sẻ email nếu bạn đồng ý nhận thông tin khuyến mãi. Bạn có thể hủy đăng ký bất cứ lúc nào.</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-2 font-semibold text-yellow-900">⚖️ Cơ quan pháp luật</h3>
                    <p className="text-sm">Chỉ cung cấp thông tin khi có yêu cầu hợp pháp từ cơ quan có thẩm quyền.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm font-semibold text-gray-900">
                    ✅ Cam kết: Chúng tôi không bán, cho thuê hoặc trao đổi thông tin cá nhân của bạn với bất kỳ bên thứ ba nào vì mục đích thương mại.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                5. Quyền của khách hàng
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>Bạn có các quyền sau đối với thông tin cá nhân của mình:</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border-2 border-indigo-200 bg-white p-6">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-indigo-900">
                      <span>👁️</span> Quyền truy cập
                    </h3>
                    <p className="text-sm">Xem và tải xuống toàn bộ thông tin cá nhân mà chúng tôi lưu trữ về bạn.</p>
                  </div>

                  <div className="rounded-xl border-2 border-green-200 bg-white p-6">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-green-900">
                      <span>✏️</span> Quyền chỉnh sửa
                    </h3>
                    <p className="text-sm">Cập nhật, sửa đổi thông tin cá nhân bất cứ lúc nào trong phần &quot;Tài khoản của tôi&quot;.</p>
                  </div>

                  <div className="rounded-xl border-2 border-red-200 bg-white p-6">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-red-900">
                      <span>🗑️</span> Quyền xóa
                    </h3>
                    <p className="text-sm">Yêu cầu xóa tài khoản và toàn bộ dữ liệu cá nhân, trừ thông tin cần thiết theo pháp luật.</p>
                  </div>

                  <div className="rounded-xl border-2 border-purple-200 bg-white p-6">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-purple-900">
                      <span>🚫</span> Quyền từ chối
                    </h3>
                    <p className="text-sm">Từ chối nhận email marketing hoặc SMS quảng cáo bất cứ lúc nào.</p>
                  </div>

                  <div className="rounded-xl border-2 border-orange-200 bg-white p-6">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-orange-900">
                      <span>📦</span> Quyền di chuyển
                    </h3>
                    <p className="text-sm">Yêu cầu xuất dữ liệu cá nhân dưới định dạng có thể đọc được bằng máy.</p>
                  </div>

                  <div className="rounded-xl border-2 border-blue-200 bg-white p-6">
                    <h3 className="mb-2 flex items-center gap-2 font-semibold text-blue-900">
                      <span>⚖️</span> Quyền khiếu nại
                    </h3>
                    <p className="text-sm">Khiếu nại với cơ quan bảo vệ dữ liệu nếu cho rằng quyền của bạn bị vi phạm.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm">
                    <strong>Cách thực hiện quyền:</strong> Liên hệ với chúng tôi qua email <strong>privacy@customercrm.vn</strong> hoặc hotline <strong>0987 654 321</strong>. Chúng tôi sẽ xử lý yêu cầu trong vòng <strong>30 ngày</strong>.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                6. Cookies và công nghệ theo dõi
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>Chúng tôi sử dụng cookies và các công nghệ tương tự để cải thiện trải nghiệm của bạn:</p>
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-1 text-sm font-semibold text-blue-900">🍪 Cookies cần thiết</h3>
                    <p className="text-sm">Đảm bảo website hoạt động bình thường, bao gồm đăng nhập, giỏ hàng và bảo mật.</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-1 text-sm font-semibold text-green-900">📊 Cookies phân tích</h3>
                    <p className="text-sm">Thu thập dữ liệu về cách bạn sử dụng website để cải thiện trải nghiệm.</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-1 text-sm font-semibold text-purple-900">🎯 Cookies marketing</h3>
                    <p className="text-sm">Hiển thị quảng cáo phù hợp với sở thích của bạn.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm">
                    <strong>Quản lý cookies:</strong> Bạn có thể tắt cookies trong cài đặt trình duyệt, nhưng một số tính năng có thể không hoạt động.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                7. Thời gian lưu trữ dữ liệu
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li><strong>Thông tin tài khoản:</strong> Lưu trữ cho đến khi bạn yêu cầu xóa</li>
                    <li><strong>Lịch sử đơn hàng:</strong> Lưu trữ tối thiểu 5 năm theo quy định pháp luật</li>
                    <li><strong>Thông tin thanh toán:</strong> Không lưu trữ thông tin thẻ đầy đủ</li>
                    <li><strong>Cookies:</strong> Tự động xóa sau 12 tháng</li>
                    <li><strong>Logs hệ thống:</strong> Lưu trữ 90 ngày</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                8. Bảo vệ trẻ em
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <p className="mb-3">Dịch vụ của chúng tôi không dành cho trẻ em dưới 16 tuổi. Chúng tôi không cố ý thu thập thông tin từ trẻ em.</p>
                  <p>Nếu bạn là phụ huynh và phát hiện con bạn đã cung cấp thông tin cho chúng tôi, vui lòng liên hệ để chúng tôi xóa thông tin đó.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                9. Thay đổi chính sách
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <p className="mb-3">
                    Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian. Mọi thay đổi quan trọng sẽ được thông báo qua:
                  </p>
                  <ul className="list-inside list-disc space-y-2">
                    <li>Email đến địa chỉ đã đăng ký</li>
                    <li>Thông báo trên website</li>
                    <li>Popup khi đăng nhập</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    Việc bạn tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận chính sách mới.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
