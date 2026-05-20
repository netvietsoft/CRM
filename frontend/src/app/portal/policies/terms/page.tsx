import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều khoản dịch vụ | Customer CRM',
  description: 'Các quy tắc chung khi sử dụng nền tảng, quyền lợi và trách nhiệm của người dùng trên Customer CRM.',
};

const lastUpdated = '20/05/2026';

export default function TermsPolicyPage() {
  return (
    <div className="min-h-screen bg-white py-6 md:bg-gray-50 md:py-12">
      <div className="mx-auto w-full px-4 md:w-[80%] md:px-0">
        <div className="bg-white p-0 sm:p-6 md:rounded-lg md:border md:border-gray-200 md:p-12 md:shadow-sm">
          <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
              Điều khoản dịch vụ
            </h1>
            <p className="text-lg text-gray-600">
              Các quy tắc chung khi sử dụng nền tảng, quyền lợi và trách nhiệm của người dùng.
            </p>
            <p className="mt-2 text-sm text-gray-500">Cập nhật lần cuối: {lastUpdated}</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                1. Phạm vi áp dụng
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>
                  Điều khoản này áp dụng cho toàn bộ hoạt động truy cập, đăng ký tài khoản, mua hàng, thanh toán, sử dụng voucher,
                  tích điểm, referral và các tính năng chăm sóc khách hàng trên nền tảng Customer CRM.
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Khi truy cập hoặc sử dụng dịch vụ, bạn được hiểu là đã đọc và đồng ý với toàn bộ điều khoản này.</li>
                    <li>Nếu bạn không đồng ý, vui lòng ngừng sử dụng nền tảng và các dịch vụ liên quan.</li>
                    <li>Trong một số tính năng riêng, các chính sách hoặc điều kiện bổ sung có thể được áp dụng song song.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                2. Tài khoản và bảo mật
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-blue-900">Thông tin tài khoản</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Bạn cần cung cấp thông tin chính xác, đầy đủ và cập nhật.</li>
                      <li>Bạn chịu trách nhiệm với mọi hoạt động phát sinh từ tài khoản của mình.</li>
                      <li>Tài khoản có thể bị tạm khóa nếu phát hiện thông tin giả mạo hoặc vi phạm chính sách.</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-green-900">Bảo mật truy cập</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Bạn phải tự bảo mật mật khẩu, mã OTP và các thông tin xác thực khác.</li>
                      <li>Không chia sẻ tài khoản cho người khác sử dụng trái mục đích cá nhân hoặc vận hành hợp lệ.</li>
                      <li>Phải thông báo ngay khi phát hiện truy cập trái phép hoặc dấu hiệu rủi ro bảo mật.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                3. Quy tắc sử dụng nền tảng
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <p>Bạn đồng ý không sử dụng nền tảng cho các hành vi trái pháp luật, gây gián đoạn hệ thống hoặc xâm phạm quyền lợi của bên khác.</p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Không đăng tải, truyền đưa hoặc cung cấp thông tin sai lệch, lừa đảo hoặc xúc phạm.</li>
                    <li>Không can thiệp trái phép vào mã nguồn, dữ liệu, API, hạ tầng hoặc cơ chế vận hành của hệ thống.</li>
                    <li>Không sử dụng bot, script hoặc công cụ tự động để khai thác, spam, quét dữ liệu hoặc lạm dụng khuyến mãi.</li>
                    <li>Không tạo đơn hàng ảo, thao túng điểm thưởng, voucher, referral hoặc các chương trình ưu đãi.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                4. Đơn hàng, giá và thanh toán
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Giá bán, tình trạng tồn kho và phương thức thanh toán có thể thay đổi theo từng thời điểm mà không cần báo trước.</li>
                    <li>Đơn hàng chỉ được xem là xác nhận khi hệ thống hoặc bộ phận vận hành ghi nhận thành công theo quy trình nội bộ.</li>
                    <li>Bạn có trách nhiệm kiểm tra kỹ sản phẩm, địa chỉ nhận hàng, phương thức thanh toán và thông tin liên hệ trước khi đặt đơn.</li>
                    <li>Nền tảng có quyền từ chối hoặc hủy đơn trong trường hợp nghi ngờ gian lận, sai giá nghiêm trọng, thiếu hàng hoặc lỗi hệ thống.</li>
                    <li>Mọi giao dịch thanh toán phải được thực hiện hợp pháp và bằng nguồn tiền hợp lệ thuộc quyền sử dụng của bạn.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                5. Voucher, điểm thưởng và ưu đãi
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-purple-900">Điều kiện áp dụng</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Mỗi voucher hoặc ưu đãi có thể đi kèm điều kiện riêng về hạn dùng, giá trị đơn tối thiểu hoặc nhóm sản phẩm áp dụng.</li>
                      <li>Điểm thưởng và mã khuyến mãi chỉ có giá trị trong phạm vi được công bố tại thời điểm phát hành.</li>
                      <li>Ưu đãi không được quy đổi thành tiền mặt, trừ khi có quy định khác được công bố rõ ràng.</li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <h3 className="mb-3 text-lg font-semibold text-orange-900">Hành vi không hợp lệ</h3>
                    <ul className="list-inside list-disc space-y-2 text-sm text-gray-700">
                      <li>Không được tạo nhiều tài khoản hoặc giả mạo giao dịch để trục lợi khuyến mãi.</li>
                      <li>Không được mua bán, chuyển nhượng, trao đổi trái phép voucher hoặc điểm thưởng nếu hệ thống không hỗ trợ.</li>
                      <li>Hệ thống có quyền thu hồi ưu đãi hoặc điều chỉnh số dư điểm nếu phát hiện lạm dụng.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                6. Giao hàng, đổi trả và khiếu nại
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Việc giao hàng, đổi trả và hoàn tiền được thực hiện theo chính sách cụ thể đang công bố trên hệ thống.</li>
                    <li>Bạn cần kiểm tra hàng hóa và phản hồi sớm khi phát sinh thiếu sót, hư hỏng hoặc giao sai thông tin.</li>
                    <li>Khiếu nại cần đi kèm thông tin đơn hàng và bằng chứng liên quan để được hỗ trợ nhanh và chính xác.</li>
                    <li>Thời gian xử lý hỗ trợ có thể khác nhau tùy theo mức độ phức tạp của vụ việc và đối tác liên quan.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                7. Quyền sở hữu trí tuệ
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Toàn bộ giao diện, nội dung, hình ảnh, logo, dữ liệu và tài liệu trên nền tảng thuộc quyền sở hữu của Customer CRM hoặc đối tác hợp pháp.</li>
                    <li>Bạn không được sao chép, chỉnh sửa, tái phân phối hoặc khai thác thương mại nếu chưa có chấp thuận bằng văn bản.</li>
                    <li>Việc trích dẫn hoặc sử dụng lại thông tin phải tuân thủ quy định pháp luật và phạm vi cho phép của chủ sở hữu.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                8. Giới hạn trách nhiệm
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Nền tảng cố gắng duy trì dịch vụ ổn định nhưng không cam kết hệ thống luôn liên tục, không gián đoạn hoặc không phát sinh lỗi.</li>
                    <li>Chúng tôi không chịu trách nhiệm cho thiệt hại phát sinh từ sự kiện bất khả kháng, lỗi từ bên thứ ba hoặc hành vi sử dụng sai quy định của người dùng.</li>
                    <li>Trong phạm vi pháp luật cho phép, trách nhiệm nếu có sẽ được xem xét phù hợp với bản chất vụ việc và giao dịch liên quan.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                9. Thay đổi điều khoản và quyền tạm ngừng dịch vụ
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <ul className="list-inside list-disc space-y-3">
                    <li>Chúng tôi có thể cập nhật điều khoản này để phù hợp với hoạt động thực tế, sản phẩm mới hoặc yêu cầu pháp lý.</li>
                    <li>Phiên bản cập nhật có hiệu lực kể từ thời điểm được công bố trên hệ thống, trừ khi có thông báo khác.</li>
                    <li>Tài khoản hoặc quyền truy cập có thể bị giới hạn, tạm khóa hoặc chấm dứt nếu phát hiện vi phạm nghiêm trọng.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-4 flex items-center text-2xl font-bold text-gray-900">
                <span className="mr-3 h-8 w-2 rounded-full bg-gradient-to-b from-indigo-600 to-purple-600"></span>
                10. Liên hệ hỗ trợ
              </h2>
              <div className="ml-5 space-y-4 leading-relaxed text-gray-700">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                  <p className="mb-3">Nếu cần giải thích thêm về điều khoản dịch vụ hoặc cần hỗ trợ liên quan đến tài khoản và giao dịch, bạn có thể liên hệ:</p>
                  <ul className="list-inside list-disc space-y-2">
                    <li>Hotline: <strong>0987 654 321</strong></li>
                    <li>Email: <strong>support@customercrm.vn</strong></li>
                    <li>Địa chỉ: <strong>72 Trần Đăng Ninh, Cầu Giấy, Hà Nội</strong></li>
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
