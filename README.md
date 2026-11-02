# Khu sinh thái Thảo Đậu 🌿

Trò chơi cộng đồng 3D bằng tiếng Việt. Three.js dựng thế giới chiếm toàn màn hình: chánh điện với cột đỏ, sàn gỗ, tượng Phật và các khu nhà nằm gần nhau trong cùng một bản đồ làng.

Bản web: https://thao-dau-eco-village.funteal64.chatgpt.site

## Chạy trên máy

Cần Node.js 24 trở lên. Chạy `npm ci`, rồi `npm run dev`, sau đó mở http://localhost:3000. Sau khi đã build có thể chạy `npm start`. SQLite tự khởi tạo trong `.data/` và lưu tài khoản, tin nhắn, đội, nhiệm vụ, phiên hòa giải, vị trí. Giữ nguyên thư mục này nếu muốn giữ dữ liệu.

## Sổ tay trong game

Bấm 📖 ở góc trên để mở Sổ tay hướng dẫn. Sổ tay có mục lục 11 phần và tìm kiếm hỗ trợ tiếng Việt không dấu; mở đầu là hướng dẫn xin đất, nhận vật liệu và xây nhà từng bước. Các mục khác gồm trồng/bán rau, nhiệm vụ, chat/đội, túi đồ/động tác, điều tra, hòa giải/tạm giữ, Ma Sói (cả cách rời bàn) và camera/độ mượt. Giá đất, xây dựng, giống rau và vật liệu đọc từ cấu hình hiện tại của game.

## Điều khiển

- WASD / mũi tên: đi lại. Bấm vào sàn cũng có thể di chuyển đến điểm chọn.
- Kéo chuột hoặc kéo một ngón tay: xoay camera; cuộn chuột hoặc nút +/−: phóng to/thu nhỏ.
- Nút ↺ trên bản đồ nhỏ đặt lại góc nhìn về nhân vật. Trong phòng, camera được giới hạn bên trong tường; đổi khu sẽ đặt lại khoảng cách nhìn, nhà tạm giữ có góc nhìn riêng từ trên xuống.
- E: bước vào nhà khi đứng gần cửa; trong phòng là hành động nhiệm vụ. Phím cách cũng làm nhiệm vụ.
- Ra làng: đi từ phòng ra bản đồ chung; khi đăng nhập sẽ xuất hiện gần cửa căn nhà vừa rời.
- Bản đồ và thẻ nhiệm vụ cho phép đi nhanh; điện thoại có bàn phím điều hướng cảm ứng.
- Nút toàn màn hình dùng Fullscreen API khi trình duyệt hỗ trợ. Các bảng chat, nhiệm vụ, bạn bè có thể thu gọn.
- Nút ⚡ cho phép chọn Tự động / Ưu tiên mượt / Ưu tiên đẹp. Chế độ tự động điều chỉnh độ nét và bóng đổ theo tốc độ thực tế, lưu tùy chọn trên thiết bị. Tab ẩn ngừng dựng hình.
- Đứng gần ghế, quầy trà hoặc quầy quà rồi nhấn E để tương tác. Ngồi ghế rồi nhấn E để đứng dậy. Chọn Động tác để vẫy tay, nhảy múa, vui mừng, chắp tay. Các động tác hiển thị cho người chơi khác.
- Mua trà sen, bánh bao chay, nón lá bằng xu trong game; mở Túi đồ để ăn/uống hoặc đội/cất nón. Có thể uống trà khi đang ngồi. Mỗi tài khoản nhận 100 xu ban đầu; nhiệm vụ hằng ngày cộng thêm xu bên cạnh điểm tốt. Không có thanh toán tiền thật.
- Trong vườn hoặc cạnh luống ngoài làng, nhấn E để tưới, thu hoạch hoặc chọn lén nhổ rau. Tưới làm rau lớn sớm hơn và tính nhiệm vụ hằng ngày; thu hoạch được 1 bó rau, 2 xu và 5 điểm. Luống dùng chung, mọc lại sau khoảng 45 giây.
- Quầy trà và quầy quà có lựa chọn lén lấy bánh hoặc nón. Trộm là lựa chọn nhập vai có hậu quả trong game, không phải thao tác mua hàng.

## Trộm đồ, điều tra và tạm giữ

Mỗi vụ trộm phát cảnh báo đỏ cho cả làng, để lại dấu trang phục và danh sách tối đa 5 người có mặt gần thời điểm đó. Vòng đỏ dưới chân chỉ biểu thị người được khoanh vùng, không kết luận có tội. Mọi người bấm bảng vụ việc để đọc dấu vết, thảo luận qua chat và bỏ phiếu.

Với 2 người đang chơi, 1 nhân chứng có thể đưa phiếu; nhóm đông hơn cần 2 phiếu độc lập. Máy chủ đối chiếu với người thực sự thực hiện hành động: phiếu sai chỉ loại trừ nghi phạm, không nhốt người vô tội. Đúng thủ phạm sẽ tạm giữ 90 giây, trừ 10 xu, thu hồi món đồ còn lại rồi tự đưa về làng. Khi bị giữ vẫn chat và làm động tác được; không thể đổi khu để trốn. Tắt tab không dừng đồng hồ.

Vụ việc hết hạn sau 3 phút nếu chưa đủ bằng chứng; một người phải chờ 2 phút giữa các lần trộm và không mở thêm vụ khi vụ trước còn hoạt động. Tất cả là luật của trò chơi, không có hình phạt ngoài game.

## Đất đai, nhà riêng và vườn rau

Bấm 🏡 trên bản đồ nhỏ hoặc tới Nhà chính quyền ở phía bắc làng. Bản đầu có 12 lô ở Xóm Tây và Xóm Đông; mỗi tài khoản một lô, dữ liệu dùng chung và lưu lâu dài.

1. Đến Nhà chính quyền, chọn lô còn trống, điền tên nhà và mục đích sử dụng đất. Phí hồ sơ 20 xu. Cán bộ NPC tự cấp giấy phép sau 15 giây; đây là thủ tục nhập vai trong game.
2. Khi cấp phép, nhận một lần 6 gỗ, 3 đá và 8 gói hạt giống. Về lô đất để xây nhà gỗ (50 xu, 3 gỗ, 2 đá, 30 giây) và vườn 3 luống (20 xu, 2 gỗ, 15 giây). Công trình hoàn thành cả khi offline.
3. Đứng gần luống, nhấn E để gieo cải xanh (45 giây/2 bó), cà rốt (70 giây/3 bó) hoặc bí đỏ (90 giây/4 bó). Mỗi vụ dùng 1 hạt giống; tưới một lần giảm 10 giây. Chủ đất gieo và thu hoạch, bạn bè được tưới giúp.
4. Mang rau về Nhà chính quyền bán 3 xu/bó. Mua thêm gỗ 4 xu, đá 5 xu, hạt giống 2 xu. Có thể nâng vườn thành nhà kính với 40 xu, 4 gỗ, 2 đá; sau 30 giây cây sẽ lớn nhanh hơn 25%.

Nhà, biển tên, vườn và giàn nhà kính hiển thị trên thế giới 3D chung. Đường dân cư nối vào làng, bản đồ nhỏ đánh dấu lô của bạn. Mái nhà ẩn khi đứng bên trong để nhìn rõ nhân vật. Chưa có chuyển nhượng đất, cho thuê hay cấp phép bởi người chơi; bản hiện tại do NPC xử lý. Xu và đất chỉ tồn tại trong trò chơi.

## Chăn nuôi trong đất nhà

Mở 🏡 → Khu chăn nuôi riêng, hoặc nhấn E tại biển 🐔 trong sân. Chuồng xây với 10 xu, 1 gỗ, 1 đá trong 20 giây, hoàn thành nhận một lần 1 gà mái và 3 phần thức ăn. Chuồng tối đa 3 con; mua thêm gà 12 xu hoặc bò sữa 45 xu.

Gà dùng 1 thức ăn, sau 60 giây cho 2 trứng; bò dùng 2 thức ăn, sau 90 giây cho 1 sữa. Chủ đất thu sản phẩm, bạn bè có thể cho ăn giúp. Mỗi lượt thu thêm 3 điểm. Mỗi lần ăn tạo một mẻ, thu xong mới cho ăn tiếp; đồng hồ chạy cả khi offline. Quầy Nhà chính quyền bán thức ăn 2 xu, thu mua trứng 3 xu/quả và sữa 8 xu/phần. Nhà, vườn và chuồng cùng nằm trong một lô, không cần xin thêm đất.

## Ma Sói trong làng

Bấm 🐺 trên thanh trên cùng hoặc vào Bàn Ma Sói ở phía nam làng để tạo/vào phòng. Cần 4–12 người thật; chủ phòng bấm Bắt đầu khi đủ người. Mọi người ngồi quanh lửa trại, ngày/đêm và đồng hồ tự chuyển. Tải lại trang sẽ nối lại đúng bàn và vai của tài khoản.

- 4–5 người: 1 Sói; 6–8: 2 Sói; 9–12: 3 Sói. Luôn có 1 Tiên tri và 1 Bảo vệ, còn lại là Dân làng. Vai được chia ngẫu nhiên trên máy chủ và giữ kín.
- Đêm 30 giây: Sói chọn người cắn, Tiên tri soi một người, Bảo vệ che chở một người. Kết quả soi chỉ Tiên tri thấy lúc sáng. Bảo vệ được chọn chính mình nhưng không chọn cùng người hai đêm liên tiếp. Sói hòa mục tiêu thì không ai chết.
- Ngày: thảo luận 60 giây, bỏ phiếu 30 giây. Hòa phiếu hoặc Bỏ qua nhiều nhất thì không loại ai. Vai người bị loại được công bố.
- Hết Sói thì Dân thắng; Sói bằng hoặc đông hơn người còn lại thì Sói thắng. Chưa phân thắng bại sau 20 đêm thì hòa. Chủ phòng có thể mở ván mới và chia lại vai.
- Ban đêm chỉ Sói còn sống dùng kênh bầy Sói. Người bị loại dùng kênh linh hồn; ban ngày người còn sống dùng kênh bàn làng. Máy chủ kiểm soát quyền xem/gửi; chat ngoài làng và các hoạt động khác tạm khóa trong trận.
- Rời trận hoặc mất kết nối quá 90 giây bị tính loại. Trở lại trước mốc này vẫn tiếp tục được. Chủ phòng mất kết nối thì quyền chủ phòng được chuyển cho người đang online. Không có người chơi giả trong bản công khai.

`npm test` kiểm tra nhiều tài khoản, phân quyền chat, điểm nhiệm vụ, đăng nhập, hòa giải, vụ trộm và vòng đời Ma Sói (giấu vai, năng lực, đồng hồ, bỏ phiếu, thắng và chơi lại). `npm run build` đóng gói Cloudflare Worker cùng giao diện trong `dist/server/index.js`.

## Tính năng

- 8 địa điểm: nhà chùa, nhà thờ, hồ cá, bếp, vườn rau, nhà xí, họp cổ đông và phòng xét xử.
- Nhân vật cúi lạy tại chùa, chuông tổng hợp âm thanh; bật/tắt được.
- Cảnh ngoài làng gồm đường lát đá, quảng trường đài phun nước, giàn cây, ghế nghỉ, bồn hoa, đường đèn lồng, hàng rào và quầy bán hàng. Cây/hoa được dựng theo cụm bằng InstancedMesh để giảm chi phí vẽ.
- Đăng ký, đăng nhập và đăng xuất; mật khẩu PBKDF2-SHA256 (100.000 vòng), cookie HttpOnly, SameSite=Lax, Secure trên HTTPS.
- Chat chung, chat riêng hai người và chat đội được kiểm soát trên máy chủ.
- Tạo, tham gia, rời đội; thi đua tổng điểm thành viên.
- 7 nhiệm vụ hằng ngày, giới hạn điểm theo lượt, reset theo ngày Việt Nam.
- Báo xung đột nhập vai đưa hai người đến phòng xét xử. Người liên quan có thể làm hòa; 3 cư dân ngoài vụ việc bỏ phiếu cũng khép lại phiên. Không có chiến đấu vật lý hoặc hệ thống HP trong phiên bản này.
- Vị trí và hướng nhìn đồng bộ khoảng mỗi 250 ms khi đang di chuyển, 500 ms khi có bạn cùng chơi và 1,2 giây khi đứng một mình; các yêu cầu không chạy chồng nhau. Chuyển động bạn bè nội suy và dự đoán ngắn có giới hạn để giảm giật. Máy chủ kiểm tra tốc độ và phạm vi vị trí. Dữ liệu nhiệm vụ/chat đồng bộ mỗi 4 giây. Số online tính hoạt động trong 25 giây. Khách hành hương không có nhãn tên trong chánh điện là minh họa.
- Cảnh tĩnh được gom theo chất liệu và ô không gian, giữ nguyên va chạm. Bóng cảnh được tính lại khi đổi khu/chất lượng, nhân vật dùng bóng nhẹ riêng. Nhãn tương tác và bản đồ nhỏ cập nhật chậm hơn vòng dựng hình để tránh thay đổi giao diện mỗi khung hình.

## Triển khai

Sites: `.openai/hosting.json` gắn D1 với binding `DB`. Schema và migration bổ sung nằm trong `drizzle/`; cần áp dụng các migration theo thứ tự trước khi Worker nhận yêu cầu. Máy chủ local dùng SQLite, dữ liệu tách biệt với bản online. Three.js được đóng gói tại chỗ bằng esbuild, không tải engine từ CDN khi chơi.

Cũng có thể triển khai Node lên VPS/hosting hỗ trợ Node 24, đặt proxy HTTPS trước máy chủ và lưu bền vững `.data/`. Không thể dùng GitHub Pages để chạy máy chủ tài khoản/chat; Pages chỉ phục vụ trang tĩnh.

## Giới hạn hiện tại

Đây là bản MVP 3D dành cho nhóm nhỏ. Cần trình duyệt hỗ trợ WebGL. Chưa có khôi phục mật khẩu, xác minh email, quản trị viên/moderation, chặn tài khoản, voice chat hay hệ thống chiến đấu vật lý. Va chạm đồ vật hiện xử lý ở máy khách; máy chủ kiểm tra tốc độ và biên bản đồ. Đồng bộ bằng HTTP polling, chưa phải WebSocket tần số cao. Chat và đăng nhập/đăng ký có giới hạn tốc độ; vẫn cần công cụ quản trị khi mở rộng. Không dùng mật khẩu đã dùng cho dịch vụ khác.

### Nhà xí sạch sẽ
Mỗi ngày Việt Nam: hoàn thành 2 lần đi tiểu/đi nặng, xả nước và lau bồn. Camera chỉ ghi cửa; cô lao công kiểm tra 12:00 (xử lý khi có lượt truy cập nếu làng vắng). Bỏ bẩn tạo vụ việc cần 2–3 phiếu độc lập, chọn sai không nhốt. Tạm giữ tối đa 1 tiếng chờ phiên tòa; 3 cư dân ngoài vụ việc có thể bỏ phiếu cho về sớm, bạn bè có thể chuộc 20 xu game.

## Nhiều làng và trưởng làng
Tài khoản mới chọn lập làng miễn phí hoặc gia nhập sau đăng ký. Người lập là trưởng làng, sửa tên và lời giới thiệu. Mỗi tài khoản thuộc một làng cố định; chưa hỗ trợ chuyển làng, chuyển quyền, bầu cử hoặc xóa làng. Cư dân cũ và toàn bộ tài sản được giữ ở Thảo Đậu; làng cũ chưa tự gán trưởng làng.
Mỗi làng có một thế giới cùng bố cục, 12 lô đất, cư dân/chat/đội/nhiệm vụ/điều tra/tạm giữ/Ma Sói riêng. Tài khoản và phiên đăng nhập dùng chung, dữ liệu chơi được định tuyến phía máy chủ từ làng đã gắn với tài khoản, không lấy làng do máy khách tự khai.
Bảng gameplay ở làng mới được tạo với tiền tố ID làng từ schema hiện tại, trong cùng giao dịch với việc lập làng. Khi thêm migration gameplay trong tương lai phải nâng schema của cả các bảng có tiền tố trước khi phát hành, ngoài schema gốc của Thảo Đậu.
