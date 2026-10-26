import Link from 'next/link';

export default function ProductActions() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/admin/integrations?fb=catalog"
        className="px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 font-medium transition-colors shadow-sm text-sm flex items-center gap-1.5"
        title="Đồng bộ sản phẩm lên Meta Commerce Catalog (catalog_management)"
      >
        <span className="text-base">🛍️</span>
        <span className="hidden sm:inline">Meta Catalog</span>
      </Link>
      <Link
        href="/admin/products/create-product"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm text-sm"
      >
        + Tạo Sản phẩm
      </Link>
    </div>
  );
}
