# Khu sinh thái Thảo Đậu 🌿

Trò chơi cộng đồng 3D bằng tiếng Việt. Three.js dựng thế giới chiếm toàn màn hình: chánh điện với cột đỏ, sàn gỗ, tượng Phật và các khu nhà nằm gần nhau trong cùng một bản đồ làng.

Bản web: https://thao-dau-eco-village.funteal64.chatgpt.site

## Chạy trên máy

Cần Node.js 24 trở lên. Chạy `npm ci`, rồi `npm run dev`, sau đó mở http://localhost:3000. Sau khi đã build có thể chạy `npm start`. SQLite tự khởi tạo trong `.data/` và lưu tài khoản, tin nhắn, đội, nhiệm vụ, phiên hòa giải, vị trí. Giữ nguyên thư mục này nếu muốn giữ dữ liệu.

## Điều khiển

- WASD / mũi tên: đi lại. Bấm vào sàn cũng có thể di chuyển đến điểm chọn.
- Kéo chuột hoặc kéo một ngón tay: xoay camera; cuộn chuột hoặc nút +/−: phóng to/thu nhỏ.
- E: bước vào nhà khi đứng gần cửa; trong phòng là hành động nhiệm vụ. Phím cách cũng làm nhiệm vụ.
- Ra làng: đi từ phòng ra bản đồ chung; khi đăng nhập sẽ xuất hiện gần cửa căn nhà vừa rời.
- Bản đồ và thẻ nhiệm vụ cho phép đi nhanh; điện thoại có bàn phím điều hướng cảm ứng.
- Nút toàn màn hình dùng Fullscreen API khi trình duyệt hỗ trợ. Các bảng chat, nhiệm vụ, bạn bè có thể thu gọn.

`npm test` kiểm tra nhiều tài khoản, phân quyền chat riêng/chat đội, điểm nhiệm vụ, đăng nhập, đăng xuất và hòa giải. `npm run build` đóng gói Cloudflare Worker cùng giao diện trong `dist/server/index.js`.

## Tính năng

- 8 địa điểm: nhà chùa, nhà thờ, hồ cá, bếp, vườn rau, nhà xí, họp cổ đông và phòng xét xử.
- Nhân vật cúi lạy tại chùa, chuông tổng hợp âm thanh; bật/tắt được.
- Đăng ký, đăng nhập và đăng xuất; mật khẩu PBKDF2-SHA256 (100.000 vòng), cookie HttpOnly, SameSite=Lax, Secure trên HTTPS.
- Chat chung, chat riêng hai người và chat đội được kiểm soát trên máy chủ.
- Tạo, tham gia, rời đội; thi đua tổng điểm thành viên.
- 7 nhiệm vụ hằng ngày, giới hạn điểm theo lượt, reset theo ngày Việt Nam.
- Báo xung đột nhập vai đưa hai người đến phòng xét xử. Người liên quan có thể làm hòa; 3 cư dân ngoài vụ việc bỏ phiếu cũng khép lại phiên. Không có chiến đấu vật lý hoặc hệ thống HP trong phiên bản này.
- Vị trí và hướng nhìn gửi lên máy chủ khoảng mỗi 0,75 giây, nội suy chuyển động của bạn bè. Máy chủ giới hạn tốc độ và phạm vi vị trí. Các dữ liệu nhiệm vụ/chat đồng bộ mỗi 4 giây. Số online tính tài khoản có hoạt động trong 25 giây. Chánh điện có các khách hành hương minh họa không có nhãn tên, không tính vào số online.

## Triển khai

Sites: `.openai/hosting.json` gắn D1 với binding `DB`. Schema và migration bổ sung nằm trong `drizzle/`; cần áp dụng các migration theo thứ tự trước khi Worker nhận yêu cầu. Máy chủ local dùng SQLite, dữ liệu tách biệt với bản online. Three.js được đóng gói tại chỗ bằng esbuild, không tải engine từ CDN khi chơi.

Cũng có thể triển khai Node lên VPS/hosting hỗ trợ Node 24, đặt proxy HTTPS trước máy chủ và lưu bền vững `.data/`. Không thể dùng GitHub Pages để chạy máy chủ tài khoản/chat; Pages chỉ phục vụ trang tĩnh.

## Giới hạn hiện tại

Đây là bản MVP 3D dành cho nhóm nhỏ. Cần trình duyệt hỗ trợ WebGL. Chưa có khôi phục mật khẩu, xác minh email, quản trị viên/moderation, chặn tài khoản, voice chat hay hệ thống chiến đấu vật lý. Va chạm đồ vật hiện xử lý ở máy khách; máy chủ kiểm tra tốc độ và biên bản đồ. Đồng bộ bằng HTTP polling, chưa phải WebSocket tần số cao. Chat và đăng nhập/đăng ký có giới hạn tốc độ; vẫn cần công cụ quản trị khi mở rộng. Không dùng mật khẩu đã dùng cho dịch vụ khác.
