GOLDEN COFFEE ADMIN - PRODUCTION-READY (HTML + CSS + JS + FIREBASE)

Cách chạy:
1. Mở thư mục project bằng VS Code.
2. Chạy bằng Live Server hoặc bất kỳ local server nào.
3. Truy cập các trang:
   - index.html
   - banners.html
   - categories.html
   - news.html
   - orders.html
   - products.html
   - users.html

Kiến trúc JS mới:
js/
├── pages/
│   ├── dashboard.js
│   ├── banners.js
│   ├── categories.js
│   ├── news.js
│   ├── orders.js
│   ├── products.js
│   └── users.js
├── services/
│   ├── banner-service.js
│   ├── category-service.js
│   ├── news-service.js
│   ├── order-service.js
│   ├── product-service.js
│   └── user-service.js
├── utils/
│   ├── format.js
│   ├── dom.js
│   ├── validators.js
│   ├── confirm.js
│   ├── loading.js
│   └── firebase-date.js
└── firebase/
    ├── firebase-config.js
    ├── firebase-auth.js
    ├── firebase-firestore.js
    └── firebase-storage.js

Collection được dùng:
- banners
- categories
- news
- orders
- products
- users

Nâng cấp chính:
- Responsive chuẩn 4 breakpoint:
  >=1200, 992-1199, 768-991, <=767
- Sidebar chuyển thành drawer trên tablet/mobile
- Search thật bằng Firestore prefix query
- Filter thật theo từng collection
- Pagination dùng limit/startAfter cho:
  products, orders, users, news, categories
- Confirm xóa bằng modal custom
- Loading state:
  skeleton bảng, spinner panel, loading button
- Empty state rõ ràng
- Form ảnh hỗ trợ:
  1) Dán link ảnh
  2) Upload ảnh lên Firebase Storage
- Chuẩn hóa hiển thị tiền tệ VNĐ
- Chuẩn hóa xử lý ngày giờ cho Timestamp và int64 cũ
- Chuẩn hóa orders.items theo snapshot product mới
- Chuẩn hóa available -> isAvailable khi đọc dữ liệu cũ

Lưu ý Firestore:
- users tạo mới luôn lưu createdAt dạng serverTimestamp
- users update sẽ tự vá createdAt về Timestamp nếu dữ liệu cũ đang sai chuẩn
- products validate categoryId, không cho phép categoryId = 0
- Các index Firestore cần thiết đã được ghi chú trong:
  - js/services/product-service.js
  - js/services/order-service.js
  - js/services/user-service.js
