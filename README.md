# Khu sinh thái Thảo Đậu 🌿

Trò chơi cộng đồng bằng tiếng Việt, với khung cảnh 2.5D vẽ bằng Canvas, không cần thư viện giao diện.

## Chạy trên máy

Cần Node.js 24 trở lên. Trong thư mục dự án, chạy `npm start`, sau đó mở http://localhost:3000. Không cần cài thêm thư viện. SQLite tự khởi tạo trong `.data/` và lưu tài khoản, tin nhắn, đội, nhiệm vụ, phiên hòa giải. Giữ nguyên thư mục này nếu muốn giữ dữ liệu.

`npm test` kiểm tra nhiều tài khoản, phân quyền chat riêng/chat đội, điểm nhiệm vụ, đăng nhập, đăng xuất và hòa giải. `npm run build` đóng gói Cloudflare Worker cùng giao diện trong `dist/server/index.js`.

## Tính năng

- 8 địa điểm: nhà chùa, nhà thờ, hồ cá, bếp, vườn rau, nhà xí, họp cổ đông và phòng xét xử.
- Nhân vật cúi lạy tại chùa, chuông tổng hợp âm thanh; bật/tắt được.
- Đăng ký, đăng nhập và đăng xuất; mật khẩu PBKDF2-SHA256 (100.000 vòng), cookie HttpOnly, SameSite=Lax, Secure trên HTTPS.
- Chat chung, chat riêng hai người và chat đội được kiểm soát trên máy chủ.
- Tạo, tham gia, rời đội; thi đua tổng điểm thành viên.
- 7 nhiệm vụ hằng ngày, giới hạn điểm theo lượt, reset theo ngày Việt Nam.
- Báo xung đột nhập vai đưa hai người đến phòng xét xử. Người liên quan có thể làm hòa; 3 cư dân ngoài vụ việc bỏ phiếu cũng khép lại phiên. Không có chiến đấu vật lý hoặc hệ thống HP trong phiên bản này.
- Đồng bộ người chơi và tin nhắn mỗi 4 giây. Số online tính tài khoản có hoạt động trong 25 giây. Khi làng vắng, khung cảnh có nhân vật minh họa, không tính vào số online.

## Triển khai

Sites: `.openai/hosting.json` gắn D1 với binding `DB`. Schema nằm trong `drizzle/0000_village.sql`; cần áp dụng migration trước khi Worker nhận yêu cầu. Máy chủ local dùng SQLite, dữ liệu tách biệt với bản online.

Cũng có thể triển khai Node lên VPS/hosting hỗ trợ Node 24, đặt proxy HTTPS trước máy chủ và lưu bền vững `.data/`. Không thể dùng GitHub Pages để chạy máy chủ tài khoản/chat; Pages chỉ phục vụ trang tĩnh.

## Giới hạn hiện tại

Đây là bản MVP dành cho nhóm nhỏ. Chưa có khôi phục mật khẩu, xác minh email, quản trị viên/moderation, chặn tài khoản, voice chat, di chuyển tự do hay mô hình 3D như ảnh tham khảo. Chat có giới hạn tốc độ; cần bổ sung kiểm soát spam đăng ký/đăng nhập ở lớp hosting trước khi mở rộng công khai. Không dùng mật khẩu đã dùng cho dịch vụ khác.
