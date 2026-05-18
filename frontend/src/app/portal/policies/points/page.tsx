import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách tích điểm - Tiêu điểm | Customer CRM',
  description: 'Tìm hiểu về chương trình tích điểm và cách sử dụng điểm thưởng tại Customer CRM',
};

export default function PointsPolicyPage() {
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 py-6 md:py-12">
      <div className="w-full px-4 md:px-0 md:w-[80%] mx-auto">
        <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 p-0 sm:p-6 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
              Chính sách tích điểm - Tiêu điểm
            </h1>
            <p className="text-gray-600 text-lg">
              Chương trình khách hàng thân thiết với nhiều ưu đãi hấp dẫn
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                1. Cách thức tích điểm
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-indigo-900 mb-3 text-lg">Tích điểm từ mua hàng</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Mỗi <strong>10.000 VNĐ</strong> thanh toán thành công = <strong>1 điểm</strong></li>
                    <li>Điểm được cộng tự động sau khi đơn hàng hoàn thành</li>
                    <li>Áp dụng cho tất cả sản phẩm trên hệ thống</li>
                    <li>Không tích điểm cho phần giảm giá từ voucher hoặc khuyến mãi</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-purple-900 mb-3 text-lg">Tích điểm từ hoạt động</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>+50 điểm</strong> khi đăng ký tài khoản mới</li>
                    <li><strong>+20 điểm</strong> khi hoàn thành hồ sơ cá nhân đầy đủ</li>
                    <li><strong>+10 điểm</strong> cho mỗi đánh giá sản phẩm có hình ảnh</li>
                    <li><strong>+5 điểm</strong> cho mỗi đánh giá sản phẩm không có hình ảnh</li>
                    <li><strong>+30 điểm</strong> vào ngày sinh nhật (tự động)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-green-900 mb-3 text-lg">Tích điểm từ giới thiệu bạn bè</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>+100 điểm</strong> khi bạn bè đăng ký qua link giới thiệu của bạn</li>
                    <li><strong>+5%</strong> điểm từ mỗi đơn hàng của bạn bè (vĩnh viễn)</li>
                    <li>Không giới hạn số lượng người giới thiệu</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                2. Cách thức tiêu điểm
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Quy đổi điểm thành tiền</h3>
                  <div className="space-y-2">
                    <p><strong>1 điểm = 1.000 VNĐ</strong></p>
                    <p>Số điểm tối thiểu để sử dụng: <strong>50 điểm</strong> (50.000 VNĐ)</p>
                    <p>Số điểm tối đa có thể sử dụng trong 1 đơn: <strong>50% giá trị đơn hàng</strong></p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-yellow-900 mb-3 text-lg">Đổi điểm lấy voucher</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>200 điểm</strong> → Voucher giảm 250.000 VNĐ (cho đơn từ 1.000.000 VNĐ)</li>
                    <li><strong>400 điểm</strong> → Voucher giảm 500.000 VNĐ (cho đơn từ 2.000.000 VNĐ)</li>
                    <li><strong>800 điểm</strong> → Voucher giảm 1.000.000 VNĐ (cho đơn từ 4.000.000 VNĐ)</li>
                    <li>Voucher có hiệu lực 30 ngày kể từ ngày đổi</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-pink-900 mb-3 text-lg">Đổi điểm lấy quà tặng</h3>
                  <p className="mb-2">Truy cập mục <strong>"Đổi quà"</strong> để xem danh sách quà tặng độc quyền:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Sản phẩm độc quyền từ các thương hiệu nổi tiếng</li>
                    <li>Voucher dịch vụ spa, nhà hàng, du lịch</li>
                    <li>Phiếu quà tặng điện tử</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                3. Hạng thành viên
              </h2>
              <div className="ml-5 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-gray-200">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">🥉</span>
                      </div>
                      <h3 className="font-bold text-gray-900 text-xl">Thành viên Bạc</h3>
                      <p className="text-sm text-gray-600 mt-1">0 - 999 điểm</p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Tích điểm cơ bản: 1x</li>
                      <li>✓ Miễn phí vận chuyển đơn từ 500k</li>
                      <li>✓ Hỗ trợ khách hàng ưu tiên</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-yellow-400">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-yellow-400 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">🥇</span>
                      </div>
                      <h3 className="font-bold text-yellow-900 text-xl">Thành viên Vàng</h3>
                      <p className="text-sm text-yellow-700 mt-1">1.000 - 4.999 điểm</p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Tích điểm: <strong>1.2x</strong></li>
                      <li>✓ Miễn phí vận chuyển đơn từ 300k</li>
                      <li>✓ Ưu đãi sinh nhật đặc biệt</li>
                      <li>✓ Voucher độc quyền hàng tháng</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-purple-400">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">💎</span>
                      </div>
                      <h3 className="font-bold text-purple-900 text-xl">Thành viên Kim Cương</h3>
                      <p className="text-sm text-purple-700 mt-1">Từ 5.000 điểm</p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Tích điểm: <strong>1.5x</strong></li>
                      <li>✓ Miễn phí vận chuyển toàn bộ đơn</li>
                      <li>✓ Ưu tiên xử lý đơn hàng</li>
                      <li>✓ Quà tặng sinh nhật cao cấp</li>
                      <li>✓ Tham gia sự kiện VIP</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                4. Thời hạn và điều kiện
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-red-900 mb-3 text-lg">⏰ Thời hạn điểm thưởng</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Điểm thưởng có hiệu lực <strong>12 tháng</strong> kể từ ngày tích</li>
                    <li>Điểm sẽ hết hạn theo nguyên tắc "vào trước - hết hạn trước"</li>
                    <li>Hệ thống sẽ gửi thông báo trước 30 ngày khi điểm sắp hết hạn</li>
                    <li>Điểm đã hết hạn không thể khôi phục</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-blue-900 mb-3 text-lg">📋 Điều kiện áp dụng</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Chỉ áp dụng cho tài khoản đã xác thực email và số điện thoại</li>
                    <li>Không áp dụng cho đơn hàng bị hủy hoặc hoàn trả</li>
                    <li>Điểm sẽ bị trừ nếu đơn hàng bị hoàn trả sau khi đã tích điểm</li>
                    <li>Không được chuyển nhượng điểm cho tài khoản khác</li>
                    <li>Customer CRM có quyền điều chỉnh chính sách mà không cần báo trước</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                5. Cách kiểm tra điểm thưởng
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <ol className="space-y-3 list-decimal list-inside">
                    <li>Đăng nhập vào tài khoản của bạn</li>
                    <li>Truy cập mục <strong>"Tài khoản của tôi"</strong></li>
                    <li>Xem số điểm hiện tại và lịch sử tích/tiêu điểm</li>
                    <li>Kiểm tra điểm sắp hết hạn trong mục <strong>"Điểm thưởng"</strong></li>
                  </ol>
                </div>
              </div>
            </section></div>
        </div>
      </div>
    </div>
  );
}


