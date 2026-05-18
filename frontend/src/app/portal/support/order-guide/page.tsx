import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hướng dẫn đặt hàng | Customer CRM',
  description: 'Hướng dẫn chi tiết cách đặt hàng tại Customer CRM',
};

export default function OrderGuidePage() {
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 py-6 md:py-12">
      <div className="w-full px-4 md:px-0 md:w-[80%] mx-auto">
        <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 p-0 sm:p-6 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
              Hướng dẫn đặt hàng
            </h1>
            <p className="text-gray-600 text-lg">
              Mua sắm dễ dàng chỉ với vài bước đơn giản
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Quick Steps */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Quy trình đặt hàng
              </h2>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="bg-gray-50 p-6 rounded-xl border-2 border-blue-200 text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Chọn sản phẩm</h3>
                  <p className="text-xs text-gray-600">Tìm kiếm và chọn sản phẩm yêu thích</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border-2 border-green-200 text-center">
                  <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Thêm giỏ hàng</h3>
                  <p className="text-xs text-gray-600">Chọn size, màu và số lượng</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border-2 border-purple-200 text-center">
                  <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Thanh toán</h3>
                  <p className="text-xs text-gray-600">Điền thông tin và chọn phương thức</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border-2 border-orange-200 text-center">
                  <div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">4</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Xác nhận</h3>
                  <p className="text-xs text-gray-600">Nhận email xác nhận đơn hàng</p>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border-2 border-pink-200 text-center">
                  <div className="w-12 h-12 bg-pink-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">5</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Nhận hàng</h3>
                  <p className="text-xs text-gray-600">Kiểm tra và nhận hàng</p>
                </div>
              </div>
            </section>

            {/* Detailed Steps */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Hướng dẫn chi tiết
              </h2>

              {/* Step 1 */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Tìm kiếm và chọn sản phẩm</h3>
                  </div>
                </div>
                <div className="ml-14 space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-blue-900 mb-3">Cách tìm sản phẩm:</h4>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li><strong>Tìm kiếm:</strong> Nhập tên sản phẩm vào ô tìm kiếm ở đầu trang</li>
                      <li><strong>Danh mục:</strong> Chọn danh mục sản phẩm từ menu</li>
                      <li><strong>Bộ lọc:</strong> Sử dụng bộ lọc theo giá, màu sắc, size, thương hiệu</li>
                      <li><strong>Sắp xếp:</strong> Sắp xếp theo giá, độ phổ biến, mới nhất</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-green-900 mb-3">Xem chi tiết sản phẩm:</h4>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li>Nhấn vào sản phẩm để xem thông tin chi tiết</li>
                      <li>Xem hình ảnh, mô tả, thông số kỹ thuật</li>
                      <li>Đọc đánh giá từ khách hàng khác</li>
                      <li>Kiểm tra tình trạng còn hàng</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Thêm sản phẩm vào giỏ hàng</h3>
                  </div>
                </div>
                <div className="ml-14 space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-purple-900 mb-3">Các bước thêm vào giỏ:</h4>
                    <ol className="space-y-3 text-sm text-gray-700 list-decimal list-inside">
                      <li>Chọn <strong>màu sắc</strong> (nếu có nhiều màu)</li>
                      <li>Chọn <strong>kích thước</strong> (S, M, L, XL, ...)</li>
                      <li>Nhập <strong>số lượng</strong> muốn mua</li>
                      <li>Nhấn nút <strong>"Thêm vào giỏ hàng"</strong></li>
                      <li>Chọn <strong>"Tiếp tục mua sắm"</strong> hoặc <strong>"Thanh toán ngay"</strong></li>
                    </ol>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">💡 Mẹo:</h4>
                    <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                      <li>Thêm sản phẩm vào <strong>Yêu thích</strong> để mua sau</li>
                      <li>Kiểm tra <strong>voucher</strong> có thể áp dụng</li>
                      <li>Xem <strong>sản phẩm tương tự</strong> để so sánh</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Thanh toán đơn hàng</h3>
                  </div>
                </div>
                <div className="ml-14 space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-indigo-900 mb-3">Thông tin cần điền:</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">📋 Thông tin người nhận:</p>
                        <ul className="space-y-1 text-gray-700 list-disc list-inside">
                          <li>Họ và tên</li>
                          <li>Số điện thoại</li>
                          <li>Email</li>
                          <li>Địa chỉ giao hàng</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-2">💳 Phương thức thanh toán:</p>
                        <ul className="space-y-1 text-gray-700 list-disc list-inside">
                          <li>COD (Thanh toán khi nhận hàng)</li>
                          <li>Thẻ ATM/Visa/Mastercard</li>
                          <li>Ví điện tử (MoMo, ZaloPay)</li>
                          <li>Chuyển khoản ngân hàng</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-green-900 mb-3">🎁 Áp dụng ưu đãi:</h4>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li>Nhập <strong>mã voucher</strong> để giảm giá</li>
                      <li>Sử dụng <strong>điểm thưởng</strong> để thanh toán (1 điểm = 1.000đ)</li>
                      <li>Kiểm tra <strong>miễn phí vận chuyển</strong> nếu đủ điều kiện</li>
                      <li>Áp dụng <strong>ưu đãi thành viên</strong> (nếu có)</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-orange-900 mb-3">📝 Ghi chú đơn hàng:</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      Bạn có thể thêm ghi chú đặc biệt cho đơn hàng:
                    </p>
                    <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                      <li>Yêu cầu giao hàng vào thời gian cụ thể</li>
                      <li>Ghi chú về địa chỉ giao hàng</li>
                      <li>Yêu cầu đóng gói quà</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Xác nhận và theo dõi đơn hàng</h3>
                  </div>
                </div>
                <div className="ml-14 space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-blue-900 mb-3">📧 Sau khi đặt hàng thành công:</h4>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li>Nhận <strong>email xác nhận</strong> với mã đơn hàng</li>
                      <li>Nhận <strong>SMS thông báo</strong> trạng thái đơn hàng</li>
                      <li>Xem chi tiết đơn hàng trong mục <strong>"Đơn hàng của tôi"</strong></li>
                      <li>Theo dõi <strong>trạng thái vận chuyển</strong> realtime</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-purple-900 mb-3">📍 Các trạng thái đơn hàng:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                        <span className="font-medium">Chờ xác nhận:</span>
                        <span className="text-gray-700">Đơn hàng đang được xử lý</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                        <span className="font-medium">Đang chuẩn bị:</span>
                        <span className="text-gray-700">Đang đóng gói sản phẩm</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                        <span className="font-medium">Đang giao:</span>
                        <span className="text-gray-700">Shipper đang giao hàng</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                        <span className="font-medium">Đã giao:</span>
                        <span className="text-gray-700">Giao hàng thành công</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="mb-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">5</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nhận hàng và đánh giá</h3>
                  </div>
                </div>
                <div className="ml-14 space-y-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-red-900 mb-3">⚠️ Khi nhận hàng:</h4>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li><strong>Kiểm tra kỹ</strong> sản phẩm trước khi ký nhận</li>
                      <li><strong>Quay video unbox</strong> để bảo vệ quyền lợi</li>
                      <li><strong>Từ chối nhận</strong> nếu bao bì bị hư hỏng nghiêm trọng</li>
                      <li><strong>Liên hệ ngay</strong> nếu phát hiện sản phẩm lỗi</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-green-900 mb-3">⭐ Sau khi nhận hàng:</h4>
                    <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                      <li><strong>Đánh giá sản phẩm</strong> để nhận điểm thưởng (5-10 điểm)</li>
                      <li><strong>Chia sẻ hình ảnh</strong> sản phẩm thực tế</li>
                      <li><strong>Giới thiệu bạn bè</strong> để nhận hoa hồng</li>
                      <li><strong>Tích điểm</strong> cho lần mua tiếp theo</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Mẹo mua sắm thông minh
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">💰</span> Tiết kiệm chi phí
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                    <li>Mua đủ 300k để miễn phí ship nội thành</li>
                    <li>Theo dõi flash sale và khuyến mãi</li>
                    <li>Sử dụng điểm thưởng và voucher</li>
                    <li>Mua combo để được giá tốt hơn</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🎁</span> Tích điểm hiệu quả
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                    <li>Đánh giá sản phẩm có hình ảnh (+10 điểm)</li>
                    <li>Giới thiệu bạn bè (+100 điểm/người)</li>
                    <li>Tham gia vòng quay may mắn</li>
                    <li>Hoàn thành hồ sơ cá nhân (+20 điểm)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🛡️</span> Mua sắm an toàn
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                    <li>Đọc kỹ mô tả và đánh giá sản phẩm</li>
                    <li>Kiểm tra chính sách đổi trả</li>
                    <li>Quay video khi mở hàng</li>
                    <li>Giữ lại hóa đơn và bao bì</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">⚡</span> Mua hàng nhanh chóng
                  </h3>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                    <li>Lưu địa chỉ giao hàng thường dùng</li>
                    <li>Lưu phương thức thanh toán</li>
                    <li>Sử dụng tính năng "Mua ngay"</li>
                    <li>Bật thông báo để không bỏ lỡ deal</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Câu hỏi thường gặp
              </h2>
              <div className="space-y-3">
                <details className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
                  <summary className="font-semibold text-gray-900 cursor-pointer text-sm">
                    Tôi có thể hủy đơn hàng không?
                  </summary>
                  <p className="mt-2 text-sm text-gray-700">
                    Bạn có thể hủy đơn hàng miễn phí khi đơn hàng đang ở trạng thái "Chờ xác nhận". Sau khi đơn hàng đã được xác nhận và đang chuẩn bị, bạn cần liên hệ hotline để được hỗ trợ.
                  </p>
                </details>

                <details className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
                  <summary className="font-semibold text-gray-900 cursor-pointer text-sm">
                    Tôi có thể thay đổi địa chỉ giao hàng không?
                  </summary>
                  <p className="mt-2 text-sm text-gray-700">
                    Bạn có thể thay đổi địa chỉ giao hàng trước khi đơn hàng được giao cho shipper. Sau khi shipper đã nhận hàng, việc thay đổi địa chỉ sẽ khó khăn hơn và có thể phát sinh phí.
                  </p>
                </details>

                <details className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
                  <summary className="font-semibold text-gray-900 cursor-pointer text-sm">
                    Tôi có thể đặt hàng mà không cần tài khoản không?
                  </summary>
                  <p className="mt-2 text-sm text-gray-700">
                    Hiện tại bạn cần có tài khoản để đặt hàng. Việc đăng ký rất đơn giản và nhanh chóng, đồng thời bạn sẽ nhận được nhiều ưu đãi dành cho thành viên.
                  </p>
                </details>
              </div>
            </section></div>
        </div>
      </div>
    </div>
  );
}


