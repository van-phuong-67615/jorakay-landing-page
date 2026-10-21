# Google Sheets — hướng dẫn cấu hình Phase 2

Đã triển khai mã nguồn: form → POST /api/consultation → Google Apps Script → Google Sheet của khách hàng. Chưa kiểm tra ghi trên Google thật vì chưa có thông tin cấu hình/tài khoản khách hàng. Không dùng API key Google, service account hay database.

## 1. Cấu hình Next.js trong .env.local

Copy `.env.example` thành `.env.local` ở thư mục gốc. Không commit hoặc gửi khóa bí mật qua chat.

| Biến | Giá trị / cách lấy |
| --- | --- |
| APP_URL | Origin chính xác của website, ví dụ https://example.vn; local dùng http://127.0.0.1:3000. Nếu truy cập bằng localhost hoặc đổi port thì đổi origin tương ứng. Không có đường dẫn. |
| GOOGLE_APPS_SCRIPT_URL | URL Web App sau deploy Apps Script, dạng https://script.google.com/macros/s/DEPLOYMENT_ID/exec. Không dùng /dev hoặc URL chỉnh sửa script. |
| GOOGLE_APPS_SCRIPT_SECRET | Chuỗi ngẫu nhiên tối thiểu 32 ký tự. Trùng hoàn toàn với Script Property cùng tên bên Apps Script. |
| NEXT_PUBLIC_TURNSTILE_SITE_KEY | Site key công khai từ widget Cloudflare Turnstile. Đây là biến duy nhất được đưa xuống browser. |
| TURNSTILE_SECRET_KEY | Secret key của cùng widget Turnstile, chỉ lưu trên server. |
| PRIVACY_POLICY_VERSION | Phiên bản nội dung đồng ý/chính sách, ví dụ 2026-10-20; đổi khi nội dung consent thay đổi. |

Tạo secret trên máy bạn bằng lệnh sau, rồi tự copy kết quả vào `.env.local` và Script Properties:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Không cần SPREADSHEET_ID trong Next.js; ID Sheet chỉ cấu hình bên Apps Script. Không thêm NEXT_PUBLIC_ vào URL Apps Script hoặc hai secret.

## 2. Google Sheet và Apps Script thuộc tài khoản khách hàng

1. Tạo Google Sheet riêng để nhận lead, dùng tài khoản Google của khách hàng.
2. Lấy Sheet ID: phần giữa `/d/` và `/edit` trong URL Sheet.
3. Trong Sheet mở **Extensions → Apps Script**. Dán `google-apps-script/Code.gs` vào file Code.gs.
4. Trong Project Settings bật hiển thị manifest nếu cần; dùng nội dung `google-apps-script/appsscript.json` (runtime V8, múi giờ Việt Nam, quyền spreadsheets).
5. Trong **Project Settings → Script Properties**, thêm:

| Script Property | Giá trị |
| --- | --- |
| SPREADSHEET_ID | ID Google Sheet vừa tạo |
| SHEET_NAME | Tên tab nhận lead, ví dụ Leads. Dùng tab trống hoặc tab mẫu A–O của khách hàng; script tự tạo nếu chưa có. |
| GOOGLE_APPS_SCRIPT_SECRET | Chính xác cùng secret trong .env.local |

Hai Script Properties tùy chọn (không cần thêm env ở Next.js): `LEAD_SOURCE` cho cột J, mặc định `Website`; `SOURCE_PAGE` cho cột K, mặc định `Tư vấn & báo giá Jorakay`. Với chiến dịch cụ thể, đặt SOURCE_PAGE thành tên bài/trang thực tế, ví dụ tên trang SEM của khách hàng.

6. **Deploy → New deployment → Web app**. Execute as: **Me** (khách hàng). Who has access: **Anyone**, để server Next.js gọi được. Web app vẫn kiểm tra HMAC; không mở quyền đọc Sheet. Workspace có thể bị tổ chức hạn chế kiểu deployment này; cần quản trị viên khách hàng xác nhận cách triển khai được phép.
7. Chủ tài khoản tự cấp quyền khi Google yêu cầu. Copy URL `/exec` vào GOOGLE_APPS_SCRIPT_URL.
8. Khi sửa Code.gs, cập nhật deployment sang version mới.

Script chỉ có doPost; không có API đọc dữ liệu hoặc health công khai. Không log event/body/lead/secret. ContentService trả JSON qua redirect của Google, server bật redirect follow.

## 3. Cloudflare Turnstile

Tạo widget Turnstile trong tài khoản Cloudflare khách hàng, thêm đúng hostname website. Điền site key và secret key tương ứng vào env. Kiểm tra local cần cấu hình hostname local theo hướng dẫn Turnstile; hostname trả về phải trùng APP_URL. Không bỏ kiểm tra hostname/action để dùng token thử. Widget render explicit, compact, action consultation. Token browser gửi tới Next.js; server kiểm tra success, hostname và action qua Siteverify. Token hết hạn/đã dùng cần xác minh mới khi retry.

Thiếu CAPTCHA key hoặc cấu hình server sai: nút gửi không hoạt động hoặc API trả 503, không có thành công giả. Đổi NEXT_PUBLIC_TURNSTILE_SITE_KEY cần restart dev hoặc build/deploy lại vì key được nhúng lúc build.

## 4. Chạy và kiểm tra

```sh
npm run dev
```

Mở đúng APP_URL. Dùng dữ liệu test, đồng ý liên hệ, hoàn tất Turnstile rồi gửi. Chỉ báo thành công khi Apps Script trả `ok:true`, `status:saved|duplicate` và requestId khớp. Kiểm tra Sheet có một dòng mới, số điện thoại giữ 0 đầu và tiếng Việt đúng. Retry cùng ID/dữ liệu không thêm dòng. Không dùng dữ liệu khách hàng thật để thử.

Form Khu vực bắt buộc dạng **Tỉnh/Thành phố, Quận/Huyện**, ví dụ **Quảng Ninh, Hạ Long**. Phải có đúng một dấu phẩy ASCII, cả hai phần đều có nội dung, không có xuống dòng. Form kiểm tra khi rời ô và lúc gửi; API và Apps Script cũng kiểm tra độc lập. Không tự đoán/đảo địa chỉ; phần trước dấu phẩy vào D, phần sau vào E. Đây là kiểm tra định dạng, không tra cứu danh mục hành chính.

| Cột | Tiêu đề khách hàng | Giá trị |
| --- | --- | --- |
| A | Thời gian gửi | Giờ Việt Nam, dd/MM/yyyy HH:mm:ss |
| B | Họ và Tên | fullName |
| C | Số Điện Thoại | phone, chuẩn hóa 0xxxxxxxxx và giữ 0 đầu |
| D | Tỉnh/Thành phố | Phần trước dấu phẩy của location |
| E | Quận/Huyện | Phần sau dấu phẩy của location |
| F | Nhu cầu | Nhãn consultationType |
| G | Hệ sản phẩm cần tư vấn | Nhãn productCategory |
| H | Thông tin khác | otherProductCategory khi chọn Khác; trường hợp khác để trống |
| I | Ghi chú thêm | note |
| J | Nguồn lead | Script Property LEAD_SOURCE, mặc định Website |
| K | Bài viết/Trang nguồn | Script Property SOURCE_PAGE |
| L | Trạng thái xử lý | Mới |
| M | Nhân viên phụ trách | Trống, nhân viên cập nhật sau |
| N | Ngày liên hệ | Trống, nhân viên cập nhật sau |
| O | Kết quả tư vấn | Trống, nhân viên cập nhật sau |

P–S là bốn cột kỹ thuật tự ẩn: Request ID, Payload SHA256, Đồng ý liên hệ, Phiên bản chính sách. Ghi cùng một row với A–O để không mất chống trùng khi request bị ngắt. Không xóa hoặc chỉnh P–S; khi sắp xếp, sắp xếp toàn bộ dòng A–S để metadata đi cùng lead. Ẩn cột chỉ để giữ bố cục, không phải cơ chế phân quyền.

Có thể dùng tab mẫu A–O có sẵn; script giữ nguyên tiêu đề có ngắt dòng/khoảng trắng/khác hoa thường và giữ nguyên dữ liệu cũ. Nếu P–S trống, script thêm header kỹ thuật và ẩn. Nếu P–S đã có dữ liệu khác hoặc thứ tự A–O sai, script từ chối ghi thay vì ghi đè. Tab trống được tạo đầy đủ header A–S. Tab của schema cũ 12 cột không được tự chuyển đổi; dùng tab mẫu mới hoặc di chuyển dữ liệu thủ công sau khi sao lưu. Giá trị giống công thức được escape; toàn bộ dòng định dạng text.

## 5. Bảo vệ và tránh trùng

- Server Zod; JSON tối đa 16KiB; Origin khớp APP_URL; honeypot và Turnstile.
- HMAC-SHA256 ký `timestamp.payload` (payload là nguyên chuỗi JSON), hiệu lực ±5 phút. Script kiểm tra chữ ký, dữ liệu và tự tính lại khóa throttle.
- Script Lock bao quanh tra requestId/hash, hạn mức và ghi dòng. ID/hash trong Sheet chống trùng qua các instance server. Cùng ID khác dữ liệu bị từ chối.
- Script Properties lưu bộ đếm chia sẻ dưới lock: 3 yêu cầu mới / phone / 10 phút, 60 yêu cầu mới / phút toàn script. Phone được HMAC trong khóa bộ đếm; khóa hết hạn được dọn trong request kế tiếp. Retry dòng đã lưu không tiêu hạn mức. Đây là cửa sổ cố định, không phải rolling window.
- Hạn mức bảo vệ ghi Sheet; CAPTCHA chống bot trước Apps Script. Lưu lượng lớn cần thêm rate limit tại CDN/hosting trước API và xem xét quota Apps Script/Properties.
- Timeout Siteverify 8s, Apps Script 15s, browser 28s. Timeout có thể xảy ra sau khi đã ghi: hiển thị kết quả chưa xác nhận, giữ ID trong bộ nhớ tab và retry ID cũ/cùng dữ liệu với CAPTCHA mới. Không tự retry mù. Đổi dữ liệu hoặc tải lại tab tạo ID mới; không bảo đảm dedup giữa các ID khác nhau.
- Không lưu form trong localStorage, không gửi raw IP từ server tới Google/Cloudflare, không log PII. Giữ form khi lỗi, khóa ô nhập khi gửi, reset sau receipt thành công.

## 6. Deployment và bàn giao

Hosting phải chạy Next.js Node Route Handlers; static-only hosting không chạy API. Điền env trên hosting, build lại, bật HTTPS và APP_URL đúng canonical origin. Preview domain cấu hình riêng. Dùng Sheet test trước; tách keys/dev/prod khi phù hợp.

Khách hàng sở hữu Sheet, Script và Turnstile; hạn chế chia sẻ Sheet, thống nhất thời gian lưu/xóa lead và chính sách bảo mật. Không commit secrets. Bàn giao deployment ID/tên tab; thu hồi quyền developer; đổi secret đồng thời phía server và Script. Theo dõi quota Apps Script và dung lượng Script Properties. Thiết kế này dành cho landing page lưu lượng vừa/nhỏ. Xác minh live và cấu hình hosting còn chờ env/tài khoản khách hàng.

Tham khảo: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [ContentService](https://developers.google.com/apps-script/guides/content), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service), [Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/), [Server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
