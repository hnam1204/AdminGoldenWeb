GOLDEN COFFEE ADMIN - HTML + CSS + JS + FIREBASE

Cách chạy:
1. Giải nén file.
2. Mở thư mục bằng VS Code.
3. Có thể chạy bằng Live Server, bất kỳ local server nào, hoặc cách chạy khác bạn thuận tiện.
   Khuyến nghị dùng local server để tránh lỗi ES Module trên một số trình duyệt.
4. Các trang:
   - index.html
   - banners.html
   - categories.html
   - news.html
   - orders.html
   - products.html
   - users.html

Firebase:
- Cấu hình nằm trong firebase/firebase-config.js
- Dữ liệu đọc/ghi trực tiếp các collections:
  banners, categories, news, orders, products, users

Lưu ý:
- Trang users khi thêm mới sẽ dùng field id làm document id.
- categories/products/users tự thêm createdAt bằng serverTimestamp khi tạo mới.
- news.date lưu dạng Timestamp (từ đối tượng Date).
- Trường ảnh (imageUrl/avatar) hỗ trợ:
  1) Dán URL ảnh
  2) Chọn file ảnh từ thiết bị để upload lên Firebase Storage
