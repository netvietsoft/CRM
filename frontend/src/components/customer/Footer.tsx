import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8 mt-12 w-full">
      {/* Container: 80% width matching the portal layout */}
      <div className="w-[80%] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Info/Brand */}
          <div>
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-4 h-8 flex items-center">
              Customer CRM
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Hệ thống mua sắm và quản lý khách hàng cao cấp, đem lại trải nghiệm dịch vụ tuyệt vời và chuyên nghiệp.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-colors">
                Facebook
              </a>
              <a href="#" className="text-sm font-semibold text-gray-500 hover:text-pink-600 transition-colors">
                Instagram
              </a>
              <a href="#" className="text-sm font-semibold text-gray-500 hover:text-blue-500 transition-colors">
                Twitter
              </a>
            </div>
          </div>

          {/* Column 2: Hỗ trợ khách hàng */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 h-8 flex items-center">
              Hỗ trợ khách hàng
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/portal/support/about" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Thông tin cơ bản
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/support/contact" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Liên hệ hỗ trợ
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/support/order-guide" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Hướng dẫn đặt hàng
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/orders" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Theo dõi đơn hàng
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/seller-register" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Đăng ký bán hàng
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Chính sách */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 h-8 flex items-center">
              Chính sách
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/portal/policies/points" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Chính sách tích điểm - Tiêu điểm
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/policies/refund" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Chính sách hoàn tiền
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/policies/shipping" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Chính sách giao hàng
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
              <li>
                <Link href="/portal/policies/privacy" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors relative inline-block group">
                  Chính sách bảo mật
                  <span className="absolute -bottom-0.5 left-0 w-0 h-[1.5px] bg-indigo-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 h-8 flex items-center">
              Liên hệ
            </h3>
            <ul className="space-y-4">
              <li className="text-sm text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-900 block mb-0.5">Địa chỉ:</span>
                72 Trần Đăng Ninh, Cầu Giấy, Hà Nội
              </li>
              <li className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900 block mb-0.5">Điện thoại:</span>
                0987 654 321
              </li>
              <li className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900 block mb-0.5">Email:</span>
                support@customercrm.vn
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} Customer CRM. All rights reserved.
          </p>
          <div className="flex gap-4 items-center">
            <span className="text-xs font-semibold text-gray-400">Secure Payments</span>
            <div className="flex gap-2 opacity-60">
              <div className="w-10 h-6 bg-gray-200 rounded"></div>
              <div className="w-10 h-6 bg-gray-200 rounded"></div>
              <div className="w-10 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
