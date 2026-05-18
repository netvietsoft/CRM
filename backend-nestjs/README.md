# CRM Backend - NestJS Migration

## 📋 Tổng Quan

Đây là dự án migration backend từ Next.js API Routes sang NestJS framework. Backend này quản lý hệ thống CRM với các tính năng:

- 🔐 Authentication & Authorization (JWT + Google OAuth)
- 👥 User Management với Multi-level Referral System
- 🛍️ E-commerce (Products, Orders, Cart, Wishlist)
- 🎟️ Voucher & Promotion System
- 🎰 Gamification (Spin Wheel, Reviews)
- 💰 Commission & Ranking System
- 🏪 Multi-store Management
- 🔗 External Integrations (Pancake POS, ViettelPost)

## 🚀 Cài Đặt

### 1. Clone và Install Dependencies

```bash
cd backend-nestjs
npm install
```

### 2. Copy Prisma Schema

```bash
# Copy prisma schema từ project cũ
cp ../prisma/schema.prisma ./prisma/schema.prisma
cp ../prisma/seed.ts ./prisma/seed.ts
```

### 3. Cấu Hình Environment

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:

```env
DATABASE_URL="mysql://user:password@localhost:3306/crm_db"
JWT_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
# ... các biến khác
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Run Migrations

```bash
npm run prisma:migrate
```

### 6. Seed Database (Optional)

```bash
npm run seed
```

### 7. Start Development Server

```bash
npm run start:dev
```

Server sẽ chạy tại: `http://localhost:3001`
Swagger docs: `http://localhost:3001/api/docs`

## 📁 Cấu Trúc Thư Mục

```
backend-nestjs/
├── src/
│   ├── auth/                    # Authentication module
│   │   ├── decorators/          # Custom decorators (GetUser, Roles, Public)
│   │   ├── dto/                 # Data Transfer Objects
│   │   ├── guards/              # Auth guards (JWT, Roles)
│   │   ├── strategies/          # Passport strategies (JWT, Google)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/                   # User management
│   ├── products/                # Product management
│   ├── categories/              # Category management
│   ├── orders/                  # Order processing
│   ├── vouchers/                # Voucher system
│   ├── stores/                  # Store management
│   ├── integrations/            # External integrations (Pancake, ViettelPost)
│   ├── cart/                    # Shopping cart
│   ├── wishlist/                # Wishlist
│   ├── reviews/                 # Product reviews
│   ├── spin/                    # Spin wheel gamification
│   ├── commissions/             # Commission system
│   ├── notifications/           # Notification system
│   ├── address/                 # Address utilities
│   ├── prisma/                  # Prisma service
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.example
├── package.json
└── README.md
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký user mới
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Users
- `GET /api/users/me` - Lấy thông tin user hiện tại

### Products (Coming soon)
- `GET /api/products` - List products
- `POST /api/products` - Create product (Admin)
- `GET /api/products/:id` - Get product detail
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Orders (Coming soon)
- `POST /api/orders` - Create order
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order detail
- `PATCH /api/orders/:id` - Update order status (Admin)

## 🔐 Authentication Flow

### JWT Token Strategy
1. **Access Token**: 15 phút expiry, lưu trong httpOnly cookie
2. **Refresh Token**: 30 ngày expiry, lưu trong httpOnly cookie + hash trong DB
3. **Auto-refresh**: Frontend tự động refresh khi access token hết hạn

### Google OAuth Flow
1. User click "Login with Google"
2. Redirect đến Google consent screen
3. Google redirect về `/api/auth/google/callback`
4. Backend tạo/update user và set session cookies
5. Redirect về frontend

## 🛡️ Guards & Decorators

### Guards
- `JwtAuthGuard` - Bảo vệ routes yêu cầu authentication
- `JwtRefreshGuard` - Bảo vệ refresh token endpoint
- `RolesGuard` - Kiểm tra role của user

### Decorators
- `@GetUser()` - Lấy thông tin user từ request
- `@Roles('ADMIN', 'STAFF')` - Chỉ định roles được phép truy cập
- `@Public()` - Đánh dấu endpoint không cần authentication

### Sử dụng

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  @Get('dashboard')
  @Roles('ADMIN', 'STAFF')
  getDashboard(@GetUser() user) {
    return { user };
  }

  @Post('public-endpoint')
  @Public()
  publicEndpoint() {
    return { message: 'No auth required' };
  }
}
```

## 📊 Database Schema

Sử dụng Prisma ORM với MySQL database. Schema bao gồm:

- **User**: Users với roles (ADMIN, STAFF, MODERATOR, CUSTOMER)
- **Product**: Sản phẩm với variants (size, color)
- **Order**: Đơn hàng với order items
- **Voucher**: Voucher templates
- **UserVoucher**: Vouchers của user
- **Store**: Cửa hàng của sellers
- **StoreIntegration**: Tích hợp với platforms (Pancake, Shopee, etc.)
- **CommissionLedger**: Hoa hồng multi-level
- **ReferralClosure**: Closure table cho referral network
- **SpinPrize**: Giải thưởng vòng quay
- **Review**: Đánh giá sản phẩm
- **Cart**: Giỏ hàng
- **Wishlist**: Danh sách yêu thích

## 🔄 Migration Roadmap

### ✅ Phase 1: Core Setup (Completed)
- [x] Project structure
- [x] Prisma integration
- [x] Authentication module (JWT + Google OAuth)
- [x] User module
- [x] Guards & Decorators

### 🚧 Phase 2: E-commerce Core (In Progress)
- [ ] Products module
- [ ] Categories module
- [ ] Orders module
- [ ] Cart module
- [ ] Wishlist module

### 📋 Phase 3: Advanced Features
- [ ] Vouchers module
- [ ] Stores module
- [ ] Integrations module (Pancake, ViettelPost)
- [ ] Commissions module
- [ ] Spin wheel module
- [ ] Reviews module

### 📋 Phase 4: Admin & Utilities
- [ ] Admin dashboard endpoints
- [ ] Notifications module
- [ ] Address utilities
- [ ] Cron jobs
- [ ] File upload

### 📋 Phase 5: Testing & Optimization
- [ ] Unit tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Documentation

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 Development Guidelines

### 1. Module Structure
Mỗi module nên có:
- `*.module.ts` - Module definition
- `*.controller.ts` - HTTP endpoints
- `*.service.ts` - Business logic
- `dto/*.dto.ts` - Data Transfer Objects
- `entities/*.entity.ts` - Database entities (optional)

### 2. DTOs & Validation
Sử dụng `class-validator` cho validation:

```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}
```

### 3. Error Handling
Sử dụng NestJS built-in exceptions:

```typescript
throw new NotFoundException('Product not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Access denied');
```

### 4. Swagger Documentation
Thêm decorators cho API docs:

```typescript
@ApiTags('Products')
@ApiOperation({ summary: 'Create product' })
@ApiResponse({ status: 201, description: 'Product created' })
```

## 🔧 Scripts

```bash
npm run start          # Start production
npm run start:dev      # Start development with watch
npm run start:debug    # Start debug mode
npm run build          # Build for production
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run migrations
npm run prisma:studio   # Open Prisma Studio
npm run seed           # Seed database
```

## 🌐 Environment Variables

Xem file `.env.example` để biết danh sách đầy đủ các biến môi trường cần thiết.

## 📚 Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Passport.js](http://www.passportjs.org/)
- [Class Validator](https://github.com/typestack/class-validator)

## 🤝 Contributing

1. Tạo branch mới từ `main`
2. Implement feature/fix
3. Write tests
4. Submit pull request

## 📄 License

MIT
