import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách hoàn tiền | Customer CRM',
  description: 'Tìm hiểu về chính sách hoàn tiền và đổi trả sản phẩm tại Customer CRM',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 py-6 md:py-12">
      <div className="w-full px-4 md:px-0 md:w-[80%] mx-auto">
        <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 p-0 sm:p-6 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
              Chính sách hoàn tiền & Đổi trả
            </h1>
            <p className="text-gray-600 text-lg">
              Cam kết bảo vệ quyền lợi khách hàng với chính sách hoàn tiền minh bạch
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                1. Điều kiện đổi trả sản phẩm
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-green-900 mb-3 text-lg">✅ Sản phẩm được chấp nhận đổi trả</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Sản phẩm còn nguyên tem mác, nhãn hiệu của nhà sản xuất</li>
                    <li>Sản phẩm chưa qua sử dụng, không có dấu hiệu bị hư hỏng</li>
                    <li>Sản phẩm còn đầy đủ phụ kiện, hộp, tài liệu kèm theo</li>
                    <li>Sản phẩm không thuộc danh mục không được đổi trả (xem bên dưới)</li>
                    <li>Có hóa đơn mua hàng hoặc mã đơn hàng hợp lệ</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-red-900 mb-3 text-lg">❌ Sản phẩm không được đổi trả</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Sản phẩm đã qua sử dụng hoặc có dấu hiệu sử dụng</li>
                    <li>Sản phẩm đã bị rách, bẩn, hư hỏng do lỗi người dùng</li>
                    <li>Sản phẩm đã qua chỉnh sửa, sửa chữa</li>
                    <li>Sản phẩm thuộc chương trình khuyến mãi đặc biệt (có ghi chú)</li>
                    <li>Đồ lót, đồ bơi, mỹ phẩm, nước hoa đã mở seal</li>
                    <li>Sản phẩm làm theo yêu cầu riêng (custom)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                2. Thời gian đổi trả
              </h2>
              <div className="ml-5 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-blue-200">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-blue-600 mb-2">7 ngày</div>
                      <h3 className="font-semibold text-blue-900">Đổi trả miễn phí</h3>
                    </div>
                    <p className="text-sm text-gray-700 text-center">
                      Đổi size, màu sắc hoặc hoàn tiền 100% nếu sản phẩm lỗi
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-yellow-200">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-yellow-600 mb-2">15 ngày</div>
                      <h3 className="font-semibold text-yellow-900">Đổi trả có phí</h3>
                    </div>
                    <p className="text-sm text-gray-700 text-center">
                      Phí xử lý 10% giá trị sản phẩm (tối thiểu 20.000đ)
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-purple-200">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-purple-600 mb-2">30 ngày</div>
                      <h3 className="font-semibold text-purple-900">Bảo hành sản phẩm</h3>
                    </div>
                    <p className="text-sm text-gray-700 text-center">
                      Bảo hành lỗi kỹ thuật, lỗi nhà sản xuất
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-4">
                  <p className="text-sm text-gray-700">
                    <strong>Lưu ý:</strong> Thời gian được tính từ ngày nhận hàng thành công (theo xác nhận của đơn vị vận chuyển hoặc khách hàng).
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                3. Quy trình đổi trả
              </h2>
              <div className="ml-5 space-y-4">
                <div className="relative">
                  {/* Timeline */}
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                        <div className="w-0.5 h-full bg-indigo-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <h3 className="font-semibold text-gray-900 mb-2">Gửi yêu cầu đổi trả</h3>
                        <p className="text-gray-700 text-sm mb-2">
                          Truy cập <strong>"Đơn hàng của tôi"</strong> → Chọn đơn hàng → Nhấn <strong>"Yêu cầu đổi trả"</strong>
                        </p>
                        <p className="text-gray-600 text-sm">
                          Hoặc liên hệ hotline: <strong>0987 654 321</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                        <div className="w-0.5 h-full bg-indigo-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <h3 className="font-semibold text-gray-900 mb-2">Cung cấp thông tin</h3>
                        <ul className="text-gray-700 text-sm space-y-1 list-disc list-inside">
                          <li>Mã đơn hàng</li>
                          <li>Lý do đổi trả</li>
                          <li>Hình ảnh sản phẩm (nếu có lỗi)</li>
                          <li>Video unbox (nếu sản phẩm bị hư hỏng khi nhận)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                        <div className="w-0.5 h-full bg-indigo-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <h3 className="font-semibold text-gray-900 mb-2">Xác nhận yêu cầu</h3>
                        <p className="text-gray-700 text-sm">
                          Bộ phận CSKH sẽ xem xét và phản hồi trong vòng <strong>24 giờ</strong> (ngày làm việc)
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                        <div className="w-0.5 h-full bg-indigo-200 mt-2"></div>
                      </div>
                      <div className="flex-1 pb-8">
                        <h3 className="font-semibold text-gray-900 mb-2">Gửi sản phẩm về</h3>
                        <p className="text-gray-700 text-sm mb-2">
                          Sau khi được chấp nhận, đóng gói sản phẩm cẩn thận và gửi về địa chỉ:
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg text-sm">
                          <p className="font-semibold">Bộ phận Đổi trả - Customer CRM</p>
                          <p>72 Trần Đăng Ninh, Cầu Giấy, Hà Nội</p>
                          <p>SĐT: 0987 654 321</p>
                        </div>
                        <p className="text-gray-600 text-sm mt-2">
                          <strong>Lưu ý:</strong> Nếu lỗi từ nhà bán, chúng tôi sẽ hỗ trợ phí vận chuyển
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">5</div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">Nhận hoàn tiền/sản phẩm mới</h3>
                        <p className="text-gray-700 text-sm">
                          Sau khi kiểm tra sản phẩm (2-3 ngày làm việc), chúng tôi sẽ:
                        </p>
                        <ul className="text-gray-700 text-sm space-y-1 list-disc list-inside mt-2">
                          <li>Hoàn tiền về tài khoản/ví điện tử (3-7 ngày làm việc)</li>
                          <li>Gửi sản phẩm mới (nếu đổi hàng)</li>
                          <li>Hoàn điểm thưởng (nếu có)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                4. Phương thức hoàn tiền
              </h2>
              <div className="ml-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 text-lg">💳 Chuyển khoản ngân hàng</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Thời gian: 3-5 ngày làm việc</li>
                      <li>• Áp dụng: Tất cả ngân hàng tại Việt Nam</li>
                      <li>• Phí: Miễn phí</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-green-200">
                    <h3 className="font-semibold text-green-900 mb-3 text-lg">📱 Ví điện tử</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Thời gian: 1-2 ngày làm việc</li>
                      <li>• Hỗ trợ: MoMo, ZaloPay, VNPay</li>
                      <li>• Phí: Miễn phí</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-3 text-lg">🎁 Hoàn điểm thưởng</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Thời gian: Ngay lập tức</li>
                      <li>• Giá trị: 110% số tiền hoàn</li>
                      <li>• Điểm có hiệu lực 12 tháng</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-3 text-lg">🔄 Đổi sản phẩm khác</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Thời gian: 3-5 ngày giao hàng</li>
                      <li>• Bù trừ chênh lệch (nếu có)</li>
                      <li>• Miễn phí vận chuyển</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                5. Trường hợp đặc biệt
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-red-900 mb-3 text-lg">🚨 Sản phẩm lỗi khi nhận hàng</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Chụp ảnh/quay video ngay khi mở hàng (bắt buộc)</li>
                    <li>Liên hệ ngay hotline: <strong>0987 654 321</strong></li>
                    <li>Hoàn tiền 100% + bồi thường phí vận chuyển</li>
                    <li>Không tính phí xử lý</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-yellow-900 mb-3 text-lg">📦 Giao sai sản phẩm</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Chúng tôi chịu hoàn toàn trách nhiệm</li>
                    <li>Đổi sản phẩm đúng miễn phí</li>
                    <li>Tặng voucher 100.000đ để xin lỗi</li>
                    <li>Ưu tiên xử lý trong 24h</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-blue-900 mb-3 text-lg">💔 Không hài lòng về sản phẩm</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Đổi trả trong vòng 7 ngày</li>
                    <li>Sản phẩm phải còn nguyên vẹn</li>
                    <li>Phí xử lý: 10% (nếu không lỗi)</li>
                    <li>Khách hàng chịu phí vận chuyển</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                6. Lưu ý quan trọng
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <ul className="space-y-3 list-disc list-inside">
                    <li>Vui lòng kiểm tra kỹ sản phẩm trước khi nhận hàng từ shipper</li>
                    <li>Giữ lại hóa đơn, tem mác, bao bì để thuận tiện cho việc đổi trả</li>
                    <li>Đối với sản phẩm điện tử, vui lòng quay video unbox để bảo vệ quyền lợi</li>
                    <li>Thời gian xử lý có thể kéo dài hơn vào dịp lễ, Tết</li>
                    <li>Customer CRM có quyền từ chối đổi trả nếu sản phẩm không đáp ứng điều kiện</li>
                    <li>Chính sách này có thể thay đổi mà không cần báo trước</li>
                  </ul>
                </div>
              </div>
            </section></div>
        </div>
      </div>
    </div>
  );
}


