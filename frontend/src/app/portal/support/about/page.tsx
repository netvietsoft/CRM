import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thông tin cơ bản | Customer CRM',
  description: 'Tìm hiểu về Customer CRM - Hệ thống mua sắm và quản lý khách hàng',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white md:bg-gray-50 py-6 md:py-12">
      <div className="w-full px-4 md:px-0 md:w-[80%] mx-auto">
        <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 p-0 sm:p-6 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
              Về Customer CRM
            </h1>
            <p className="text-gray-600 text-lg">
              Hệ thống mua sắm và quản lý khách hàng cao cấp
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Giới thiệu
              </h2>
              <div className="ml-5 space-y-4 text-gray-700 leading-relaxed">
                <p>
                  <strong>Customer CRM</strong> là nền tảng thương mại điện tử hiện đại, kết hợp giữa trải nghiệm mua sắm trực tuyến và hệ thống quản lý khách hàng thông minh. Chúng tôi cam kết mang đến cho khách hàng những sản phẩm chất lượng cao cùng dịch vụ chăm sóc khách hàng tận tâm.
                </p>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">🎯 Sứ mệnh của chúng tôi</h3>
                  <p className="text-sm">
                    Tạo ra một hệ sinh thái mua sắm toàn diện, nơi khách hàng không chỉ tìm thấy sản phẩm yêu thích mà còn được trải nghiệm dịch vụ chuyên nghiệp, nhận được những ưu đãi hấp dẫn và xây dựng mối quan hệ lâu dài với thương hiệu.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Giá trị cốt lõi
              </h2>
              <div className="ml-5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-3xl mb-3">🌟</div>
                    <h3 className="font-semibold text-blue-900 mb-2 text-lg">Chất lượng</h3>
                    <p className="text-sm text-gray-700">
                      Cam kết cung cấp sản phẩm chính hãng, chất lượng cao từ các thương hiệu uy tín trong và ngoài nước.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-3xl mb-3">💎</div>
                    <h3 className="font-semibold text-green-900 mb-2 text-lg">Uy tín</h3>
                    <p className="text-sm text-gray-700">
                      Minh bạch trong mọi giao dịch, bảo vệ quyền lợi khách hàng và xây dựng niềm tin bền vững.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-3xl mb-3">🚀</div>
                    <h3 className="font-semibold text-purple-900 mb-2 text-lg">Đổi mới</h3>
                    <p className="text-sm text-gray-700">
                      Không ngừng cải tiến công nghệ và dịch vụ để mang đến trải nghiệm mua sắm tốt nhất.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="text-3xl mb-3">❤️</div>
                    <h3 className="font-semibold text-orange-900 mb-2 text-lg">Tận tâm</h3>
                    <p className="text-sm text-gray-700">
                      Đặt khách hàng làm trung tâm, lắng nghe và đáp ứng mọi nhu cầu một cách nhanh chóng.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Tính năng nổi bật
              </h2>
              <div className="ml-5 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-xl border-2 border-indigo-200 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🎁</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Tích điểm thưởng</h3>
                    <p className="text-sm text-gray-700">
                      Tích điểm mỗi lần mua sắm, đổi điểm lấy quà hoặc giảm giá cho đơn hàng tiếp theo.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-green-200 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Vòng quay may mắn</h3>
                    <p className="text-sm text-gray-700">
                      Tham gia vòng quay để nhận voucher, điểm thưởng và nhiều phần quà hấp dẫn.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-purple-200 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">👥</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Giới thiệu bạn bè</h3>
                    <p className="text-sm text-gray-700">
                      Nhận hoa hồng và điểm thưởng khi giới thiệu bạn bè tham gia mua sắm.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-blue-200 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🏆</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Hạng thành viên</h3>
                    <p className="text-sm text-gray-700">
                      Nâng cấp hạng thành viên để nhận ưu đãi độc quyền và dịch vụ VIP.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-orange-200 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">🚚</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Giao hàng nhanh</h3>
                    <p className="text-sm text-gray-700">
                      Giao hàng nhanh chóng trong 2-4 giờ tại nội thành Hà Nội và TP.HCM.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-xl border-2 border-pink-200 hover:shadow-lg transition-shadow">
                    <div className="text-4xl mb-3">💳</div>
                    <h3 className="font-semibold text-gray-900 mb-2">Thanh toán đa dạng</h3>
                    <p className="text-sm text-gray-700">
                      Hỗ trợ nhiều phương thức thanh toán: COD, thẻ, ví điện tử, crypto.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Con số ấn tượng
              </h2>
              <div className="ml-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-6 rounded-xl text-center border border-gray-200">
                    <div className="text-4xl font-bold text-indigo-600 mb-2">50K+</div>
                    <p className="text-sm text-gray-700 font-medium">Khách hàng</p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl text-center border border-gray-200">
                    <div className="text-4xl font-bold text-green-600 mb-2">10K+</div>
                    <p className="text-sm text-gray-700 font-medium">Sản phẩm</p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl text-center border border-gray-200">
                    <div className="text-4xl font-bold text-purple-600 mb-2">100K+</div>
                    <p className="text-sm text-gray-700 font-medium">Đơn hàng</p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl text-center border border-gray-200">
                    <div className="text-4xl font-bold text-orange-600 mb-2">98%</div>
                    <p className="text-sm text-gray-700 font-medium">Hài lòng</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-8 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full mr-3"></span>
                Thông tin liên hệ
              </h2>
              <div className="ml-5 space-y-4">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">📍 Trụ sở chính</h3>
                      <p className="text-sm text-gray-700 mb-2">
                        72 Trần Đăng Ninh, Cầu Giấy, Hà Nội
                      </p>
                      <p className="text-sm text-gray-700">
                        Giờ làm việc: 8:00 - 18:00 (Thứ 2 - Thứ 6)
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">📞 Liên hệ</h3>
                      <p className="text-sm text-gray-700 mb-1">
                        Hotline: <strong>0987 654 321</strong>
                      </p>
                      <p className="text-sm text-gray-700 mb-1">
                        Email: <strong>support@customercrm.vn</strong>
                      </p>
                      <p className="text-sm text-gray-700">
                        CSKH: 8:00 - 22:00 (Tất cả các ngày)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section></div>
        </div>
      </div>
    </div>
  );
}


