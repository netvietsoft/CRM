import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách giao hàng | Customer CRM',
  description: 'Tìm hiểu về chính sách giao hàng và vận chuyển tại Customer CRM',
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 py-6 md:py-12">
      <div className="w-full px-4 md:px-0 md:w-[80%] mx-auto">
        <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 p-0 sm:p-6 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
              Chính sách giao hàng
            </h1>
            <p className="text-gray-600 text-lg">
              Giao hàng nhanh chóng, an toàn trên toàn quốc
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                1. Khu vực giao hàng
              </h2>
              <div className="ml-5 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3 text-lg flex items-center">
                      <span className="text-2xl mr-2">🏙️</span>
                      Nội thành Hà Nội & TP.HCM
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Giao hàng trong <strong>2-4 giờ</strong></li>
                      <li>✓ Giao hàng nhanh trong <strong>1-2 giờ</strong> (phụ phí 30.000đ)</li>
                      <li>✓ Miễn phí ship cho đơn từ <strong>300.000đ</strong></li>
                      <li>✓ Giao hàng 7 ngày/tuần</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-green-200">
                    <h3 className="font-semibold text-green-900 mb-3 text-lg flex items-center">
                      <span className="text-2xl mr-2">🌆</span>
                      Các tỉnh thành khác
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Giao hàng trong <strong>2-5 ngày</strong></li>
                      <li>✓ Miễn phí ship cho đơn từ <strong>500.000đ</strong></li>
                      <li>✓ Hỗ trợ giao hàng đến tận tay</li>
                      <li>✓ Theo dõi đơn hàng realtime</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-purple-200">
                    <h3 className="font-semibold text-purple-900 mb-3 text-lg flex items-center">
                      <span className="text-2xl mr-2">🏔️</span>
                      Vùng sâu, vùng xa
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Giao hàng trong <strong>5-7 ngày</strong></li>
                      <li>✓ Phụ phí vận chuyển: 20.000-50.000đ</li>
                      <li>✓ Liên hệ để xác nhận khả năng giao hàng</li>
                      <li>✓ Hỗ trợ giao đến bưu điện gần nhất</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border-2 border-orange-200">
                    <h3 className="font-semibold text-orange-900 mb-3 text-lg flex items-center">
                      <span className="text-2xl mr-2">🏝️</span>
                      Đảo xa, hải đảo
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Giao hàng trong <strong>7-14 ngày</strong></li>
                      <li>✓ Phụ phí: Tùy theo khoảng cách</li>
                      <li>✓ Liên hệ trước khi đặt hàng</li>
                      <li>✓ Không áp dụng giao hàng nhanh</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                2. Phí vận chuyển
              </h2>
              <div className="ml-5 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <th className="p-4 text-left font-semibold">Giá trị đơn hàng</th>
                        <th className="p-4 text-left font-semibold">Nội thành HN/HCM</th>
                        <th className="p-4 text-left font-semibold">Tỉnh thành khác</th>
                        <th className="p-4 text-left font-semibold">Vùng xa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="p-4 font-medium">Dưới 200.000đ</td>
                        <td className="p-4">25.000đ</td>
                        <td className="p-4">35.000đ</td>
                        <td className="p-4">50.000đ</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="p-4 font-medium">200.000đ - 299.999đ</td>
                        <td className="p-4">20.000đ</td>
                        <td className="p-4">30.000đ</td>
                        <td className="p-4">45.000đ</td>
                      </tr>
                      <tr className="hover:bg-gray-50 bg-gray-50">
                        <td className="p-4 font-medium">300.000đ - 499.999đ</td>
                        <td className="p-4 text-green-600 font-semibold">Miễn phí</td>
                        <td className="p-4">25.000đ</td>
                        <td className="p-4">40.000đ</td>
                      </tr>
                      <tr className="hover:bg-gray-50 bg-gray-50">
                        <td className="p-4 font-medium">Từ 500.000đ trở lên</td>
                        <td className="p-4 text-green-600 font-semibold">Miễn phí</td>
                        <td className="p-4 text-green-600 font-semibold">Miễn phí</td>
                        <td className="p-4">30.000đ</td>
                      </tr>
                      <tr className="hover:bg-gray-50 bg-gray-50">
                        <td className="p-4 font-medium">Từ 1.000.000đ trở lên</td>
                        <td className="p-4 text-purple-600 font-semibold">Miễn phí</td>
                        <td className="p-4 text-purple-600 font-semibold">Miễn phí</td>
                        <td className="p-4 text-purple-600 font-semibold">Miễn phí</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">💡 Mẹo tiết kiệm phí ship:</h3>
                  <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                    <li>Mua đủ 300.000đ để được miễn phí ship nội thành</li>
                    <li>Mua đủ 500.000đ để được miễn phí ship toàn quốc</li>
                    <li>Thành viên Vàng và Kim Cương được giảm thêm 50% phí ship</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                3. Thời gian xử lý đơn hàng
              </h2>
              <div className="ml-5 space-y-4">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📦</div>
                      <h3 className="font-semibold text-gray-900 mb-2">Xác nhận đơn</h3>
                      <p className="text-sm text-gray-700">Trong vòng <strong>30 phút</strong></p>
                      <p className="text-xs text-gray-600 mt-1">(Giờ hành chính)</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl mb-2">📋</div>
                      <h3 className="font-semibold text-gray-900 mb-2">Chuẩn bị hàng</h3>
                      <p className="text-sm text-gray-700">Trong vòng <strong>2-4 giờ</strong></p>
                      <p className="text-xs text-gray-600 mt-1">(Ngày làm việc)</p>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl mb-2">🚚</div>
                      <h3 className="font-semibold text-gray-900 mb-2">Bàn giao shipper</h3>
                      <p className="text-sm text-gray-700">Trong vòng <strong>4-6 giờ</strong></p>
                      <p className="text-xs text-gray-600 mt-1">(Kể từ khi đặt hàng)</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-blue-900 mb-3">⏰ Lưu ý về thời gian:</h3>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
                    <li>Đơn hàng đặt sau <strong>18:00</strong> sẽ được xử lý vào sáng hôm sau</li>
                    <li>Đơn hàng đặt vào <strong>Chủ nhật</strong> sẽ được xử lý vào thứ 2</li>
                    <li>Thời gian có thể kéo dài hơn vào dịp lễ, Tết (1-2 ngày)</li>
                    <li>Đơn hàng có sản phẩm pre-order sẽ được thông báo riêng</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                4. Đối tác vận chuyển
              </h2>
              <div className="ml-5 space-y-4">
                <p className="text-gray-700">
                  Chúng tôi hợp tác với các đơn vị vận chuyển uy tín hàng đầu Việt Nam:
                </p>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 text-center hover:border-indigo-400 transition-colors">
                    <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl font-bold text-red-600">G</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">Giao Hàng Nhanh</h3>
                    <p className="text-xs text-gray-600 mt-1">Nội thành & Liên tỉnh</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 text-center hover:border-indigo-400 transition-colors">
                    <div className="w-16 h-16 bg-orange-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl font-bold text-orange-600">J&T</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">J&T Express</h3>
                    <p className="text-xs text-gray-600 mt-1">Toàn quốc</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 text-center hover:border-indigo-400 transition-colors">
                    <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl font-bold text-blue-600">VN</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">Viettel Post</h3>
                    <p className="text-xs text-gray-600 mt-1">Vùng xa</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-200 text-center hover:border-indigo-400 transition-colors">
                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                      <span className="text-2xl font-bold text-green-600">GR</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">Grab Express</h3>
                    <p className="text-xs text-gray-600 mt-1">Giao nhanh nội thành</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                5. Theo dõi đơn hàng
              </h2>
              <div className="ml-5 space-y-4">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Cách theo dõi đơn hàng:</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Qua website</h4>
                        <p className="text-sm text-gray-700">Đăng nhập → <strong>"Đơn hàng của tôi"</strong> → Xem chi tiết đơn hàng</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Qua email</h4>
                        <p className="text-sm text-gray-700">Nhận thông báo tự động khi đơn hàng thay đổi trạng thái</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Qua SMS</h4>
                        <p className="text-sm text-gray-700">Nhận mã vận đơn và link theo dõi trực tiếp từ đơn vị vận chuyển</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Qua hotline</h4>
                        <p className="text-sm text-gray-700">Gọi <strong>0987 654 321</strong> và cung cấp mã đơn hàng</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-green-900 mb-3">📍 Các trạng thái đơn hàng:</h3>
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
                      <span className="text-gray-700">Shipper đang trên đường giao hàng</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      <span className="font-medium">Đã giao:</span>
                      <span className="text-gray-700">Giao hàng thành công</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-red-400 rounded-full"></span>
                      <span className="font-medium">Đã hủy:</span>
                      <span className="text-gray-700">Đơn hàng bị hủy</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                6. Lưu ý khi nhận hàng
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-red-900 mb-3 text-lg">⚠️ Quan trọng:</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Kiểm tra kỹ sản phẩm trước khi nhận hàng từ shipper</li>
                    <li>Quay video unbox để bảo vệ quyền lợi (đặc biệt với đơn hàng giá trị cao)</li>
                    <li>Từ chối nhận hàng nếu bao bì bị rách, móp méo nghiêm trọng</li>
                    <li>Ký xác nhận chỉ khi đã kiểm tra xong sản phẩm</li>
                    <li>Giữ lại biên lai giao hàng để đối chiếu khi cần</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-yellow-900 mb-3 text-lg">📞 Shipper không liên lạc được?</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Kiểm tra số điện thoại đã cung cấp có chính xác không</li>
                    <li>Kiểm tra email/SMS có thông báo từ shipper không</li>
                    <li>Liên hệ hotline: <strong>0987 654 321</strong> để được hỗ trợ</li>
                    <li>Cập nhật địa chỉ/SĐT mới nếu cần thay đổi</li>
                  </ul>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-blue-900 mb-3 text-lg">🏠 Không có người nhận hàng?</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Shipper sẽ gọi điện 3 lần trong vòng 30 phút</li>
                    <li>Nếu không liên lạc được, đơn hàng sẽ được hoàn về kho</li>
                    <li>Bạn có thể đặt lịch giao lại (miễn phí lần đầu)</li>
                    <li>Giao lại lần 2 trở đi sẽ tính phí 15.000đ</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}


