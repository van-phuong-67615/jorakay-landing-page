# Hướng dẫn kết nối form JORAKAY với Google Sheets

Tài liệu dành cho khách hàng và người phụ trách triển khai website JORAKAY. Thực hiện lần lượt các bước bên dưới để nhận thông tin tư vấn từ form vào Google Sheets, bật chống bot và kiểm tra trước khi vận hành.

Phiên bản tài liệu: 1.0 · Ngày cập nhật: 20/10/2026.

Các giá trị trong dấu `<...>` là chỗ cần thay bằng thông tin thực tế. Không dùng nguyên các giá trị mẫu để triển khai. Tài liệu mô tả cấu hình của mã nguồn hiện tại; việc kết nối thành công cần được xác nhận bằng một lần gửi thử trên hệ thống thực tế.

## 1 Chuẩn bị trước khi thiết lập

Cần có tài khoản Google của khách hàng có quyền chỉnh sửa Sheet, tài khoản Cloudflare để tạo Turnstile và quyền cấu hình biến môi trường của website. Khách hàng nên đứng tên sở hữu các tài khoản để thuận tiện bàn giao và vận hành.

Chuẩn bị hai file mã nguồn được bàn giao cùng dự án: `google-apps-script/Code.gs` và `google-apps-script/appsscript.json`. Luôn dùng bản mới nhất đã thống nhất với đơn vị triển khai; không lấy lại đoạn mã cũ trong lịch sử chat.

Luồng gửi dữ liệu: **Form website → API của website → Google Apps Script → Google Sheets**. Turnstile xác minh chống bot trước khi API chuyển dữ liệu sang Apps Script. Với cách kết nối này, không cần Google API key hoặc service account.

Phân biệt hai nơi cấu hình:

| Nơi cấu hình | Thông tin lưu tại đây |
| --- | --- |
| Apps Script — Script Properties | ID Sheet, tên tab, khóa xác thực dùng chung và thông tin nguồn lead tùy chọn |
| Website — `.env.local` hoặc Environment Variables trên hosting | Địa chỉ website, URL Apps Script, khóa xác thực dùng chung, hai Turnstile key và phiên bản chính sách |

## 2 Tạo Sheet và dự án Apps Script

### Bước 1 Chuẩn bị Google Sheet

1. Đăng nhập tài khoản Google của khách hàng và tạo hoặc mở Sheet dùng để nhận thông tin tư vấn.
2. Tạo tab nhận dữ liệu, ví dụ `Leads`. Có thể dùng tab trống hoặc mẫu A–O nêu ở mục 7. Nếu dùng tab cũ, sao lưu dữ liệu trước khi điều chỉnh cấu trúc.
3. Để trống các cột P–S cho dữ liệu kỹ thuật. Không đặt dữ liệu nghiệp vụ khác vào các cột này.
4. Sao chép ID trong URL của Sheet. Ví dụ, với `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`, chỉ lấy phần `<SPREADSHEET_ID>`, không lấy toàn bộ URL hay giá trị `gid`.

Tên tab ở thanh phía dưới Sheet là `SHEET_NAME`; tên file Sheet ở góc trên không phải tên tab.

### Bước 2 Mở trình chỉnh sửa và dán mã nguồn

1. Trong Google Sheet, chọn **Extensions → Apps Script** hoặc **Tiện ích mở rộng → Apps Script**.
2. Đặt tên dự án dễ nhận biết, ví dụ `JORAKAY Lead API`.
3. Mở `Code.gs`, thay toàn bộ mã mẫu bằng nội dung file `google-apps-script/Code.gs` đã bàn giao. Không dán các dấu mở và đóng khối Markdown như ba dấu backtick.
4. Lưu thay đổi. Không điền secret trực tiếp vào mã nguồn.

### Bước 3 Cấu hình manifest

Trong **Project Settings** có biểu tượng bánh răng, bật tùy chọn hiển thị file manifest `appsscript.json` trong trình chỉnh sửa. Quay lại Editor, mở file này và thay bằng nội dung file manifest đã bàn giao:

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {},
  "runtimeVersion": "V8",
  "oauthScopes": ["https://www.googleapis.com/auth/spreadsheets"]
}
```

Lưu lại. Mã hiện tại dùng quyền Google Sheets, không cần quyền đọc Gmail. Quyền được cấp thuộc tài khoản triển khai; mã nguồn chọn Sheet đích theo ID đã cấu hình.

## 3 Điền Script Properties

### Bước 4 Tạo khóa xác thực dùng chung

Người triển khai chạy lệnh sau trên máy có Node.js để tạo chuỗi ngẫu nhiên 64 ký tự hexadecimal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Lưu kết quả riêng tư. Giá trị này sẽ được điền giống hệt nhau ở Apps Script và website, dưới cùng tên `GOOGLE_APPS_SCRIPT_SECRET`. Không dùng chuỗi mẫu dễ đoán và không gửi secret qua chat công khai.

### Bước 5 Thêm các thuộc tính

Vào **Project Settings → Script Properties → Add script property**, thêm rồi lưu các giá trị sau:

| Thuộc tính | Bắt buộc | Giá trị cần nhập |
| --- | --- | --- |
| `SPREADSHEET_ID` | Có | ID lấy ở bước 1, không phải toàn bộ URL |
| `SHEET_NAME` | Có | Tên tab nhận dữ liệu, ví dụ `Leads` |
| `GOOGLE_APPS_SCRIPT_SECRET` | Có | Khóa ngẫu nhiên vừa tạo, trùng với cấu hình website |
| `LEAD_SOURCE` | Không | Giá trị cột J; bỏ qua thì dùng `Website` |
| `SOURCE_PAGE` | Không | Giá trị cột K; bỏ qua thì dùng `Tư vấn & báo giá Jorakay` |

Nếu cần phân biệt chiến dịch, đặt `SOURCE_PAGE` thành tên bài hoặc trang thực tế đang nhận lead. Đây là giá trị cấu hình tại Script, không tự suy ra tên chiến dịch của từng lượt truy cập.

**Giải đáp về SPREADSHEET_ID:** Biến này cho Apps Script biết phải mở file Google Sheet nào để ghi dữ liệu. Website chỉ gọi URL của Apps Script nên không cần biến này trong `.env.local`. Vì vậy, việc không thấy `SPREADSHEET_ID` trong file env là đúng với thiết kế hiện tại.

## 4 Triển khai Web App và cấp quyền Google

### Bước 6 Tạo deployment

1. Chọn **Deploy → New deployment** hoặc **Triển khai → Lần triển khai mới**.
2. Chọn loại **Web app**; có thể cần bấm biểu tượng bánh răng để chọn loại.
3. Nhập mô tả, ví dụ `JORAKAY Lead API v1`.
4. Tại **Execute as**, chọn **Me** — tài khoản khách hàng đang triển khai.
5. Tại **Who has access**, chọn **Anyone** để server website có thể gọi mà không cần đăng nhập Google.
6. Bấm **Deploy** và thực hiện cấp quyền bằng tài khoản của khách hàng.

Quyền Anyone áp dụng cho endpoint Web App. Không cần chuyển quyền chia sẻ Google Sheet thành công khai; mã Apps Script vẫn kiểm tra chữ ký xác thực của yêu cầu trước khi ghi. Nếu Google Workspace không cho phép lựa chọn này, liên hệ quản trị viên để thống nhất cách triển khai được phép.

### Khi Google hiện cảnh báo ứng dụng chưa được xác minh

Thông báo **Google hasn’t verified this app** có thể xuất hiện vì dự án Apps Script riêng đang xin quyền truy cập Google Sheets và chưa được Google xác minh. Cảnh báo này không tự khẳng định rằng mã nguồn đã lỗi.

Chỉ tiếp tục khi đã xác nhận đúng dự án vừa tạo và đúng danh tính tài khoản phát triển của khách hàng hoặc đơn vị được khách hàng ủy quyền:

1. Bấm **Advanced** hoặc **Nâng cao**.
2. Chọn **Go to [tên dự án] (unsafe)** hoặc liên kết tương ứng bằng tiếng Việt.
3. Đọc quyền truy cập được yêu cầu và chỉ bấm **Allow** khi đúng với việc ghi Google Sheets đã chủ động thiết lập.

Nếu tên dự án, email người phát triển hoặc quyền truy cập khác dự kiến, dừng lại để kiểm tra. Nếu bị tổ chức chặn và không có lựa chọn tiếp tục, nhờ quản trị viên xử lý theo chính sách của tổ chức. Thao tác này không làm ứng dụng trở thành ứng dụng đã được Google xác minh.

### Bước 7 Lấy URL Web App

Sau khi triển khai thành công, sao chép **Web app URL**, có dạng:

```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

Dùng URL kết thúc bằng `/exec`. Không dùng `/dev`, URL trình chỉnh sửa hay chỉ riêng deployment ID. URL này sẽ được điền vào `GOOGLE_APPS_SCRIPT_URL` của website.

## 5 Lấy Turnstile key và thiết lập localhost

### Bước 8 Tạo widget chống bot

Hai biến Turnstile được lấy từ **Cloudflare**, không phải từ Google Apps Script:

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/) bằng tài khoản của khách hàng.
2. Mở **Turnstile**, chọn **Add widget**.
3. Đặt tên widget, ví dụ `JORAKAY Consultation`.
4. Trong phần quản lý hostname, thêm hostname thật của website, ví dụ `tuvan.jorakay.vn`. Ví dụ này cần thay bằng tên miền thực tế.
5. Chọn chế độ **Managed** và tạo widget.
6. Sao chép **Site key** và **Secret key** của cùng widget để cấu hình website.

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` là Site key công khai hiển thị cho trình duyệt. `TURNSTILE_SECRET_KEY` là khóa riêng để server xác minh token; không thêm tiền tố `NEXT_PUBLIC_` cho khóa riêng. Không điền hai key này vào Script Properties.

### Giải đáp về localhost trong quá trình phát triển

**Turnstile vẫn chạy được trên localhost** khi cấu hình đúng. Với mã nguồn hiện tại, nên tạo widget riêng cho môi trường phát triển và dùng cặp key thật của widget đó:

1. Thêm `localhost` và/hoặc `127.0.0.1` vào danh sách hostname của widget phát triển. Chỉ nhập hostname, không thêm `http://`, port hay đường dẫn.
2. Nếu mở site bằng `http://localhost:3000`, đặt `APP_URL=http://localhost:3000`.
3. Nếu mở bằng `http://127.0.0.1:3000`, đặt `APP_URL=http://127.0.0.1:3000` và cho phép hostname `127.0.0.1` ở widget.
4. Khởi động lại server sau khi thay đổi env. Nếu port thực tế thay đổi, cập nhật `APP_URL` cho khớp.

`localhost` và `127.0.0.1` là hai hostname khác nhau. Widget dùng production nên chỉ cho phép hostname production; tách widget phát triển giúp quản lý rõ ràng hơn.

Cloudflare có bộ dummy key dành cho kiểm thử, nhưng không thể thay trực tiếp rồi kỳ vọng form hiện tại luôn gửi thành công: API còn kiểm tra hostname và action `consultation`, trong khi phản hồi dummy dùng action `test`. Hướng dẫn này dùng widget thật cho local, không tắt kiểm tra chống bot.

## 6 Cấu hình env của website

### Bước 9 Điền đủ sáu biến

Người triển khai sao chép `.env.example` thành `.env.local` tại thư mục gốc dự án. Khi đưa lên hosting, nhập các biến tương ứng vào phần **Environment Variables** của môi trường triển khai.

```ini
APP_URL=http://localhost:3000
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
GOOGLE_APPS_SCRIPT_SECRET=<KHOA_NGAU_NHIEN_DUNG_CHUNG>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<SITE_KEY_CLOUDFLARE>
TURNSTILE_SECRET_KEY=<SECRET_KEY_CLOUDFLARE>
PRIVACY_POLICY_VERSION=2026-10-20
```

| Biến | Cách điền |
| --- | --- |
| `APP_URL` | Origin chính xác của site, gồm giao thức, hostname và port nếu có; không kèm đường dẫn. Production dùng địa chỉ HTTPS thực tế. |
| `GOOGLE_APPS_SCRIPT_URL` | URL Web App `/exec` vừa lấy ở bước 7 |
| `GOOGLE_APPS_SCRIPT_SECRET` | Trùng hoàn toàn với Script Property cùng tên; tối thiểu 32 ký tự ngẫu nhiên |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Site key của widget phù hợp môi trường |
| `TURNSTILE_SECRET_KEY` | Secret key của chính widget đó |
| `PRIVACY_POLICY_VERSION` | Phiên bản nội dung đồng ý/chính sách; cập nhật khi nội dung này thay đổi |

Không thêm `SPREADSHEET_ID` hoặc `SHEET_NAME` vào env của website. Không đưa file `.env.local` vào kho mã nguồn và không gửi các giá trị secret trong tài liệu bàn giao thông thường.

### Bước 10 Khởi động hoặc triển khai lại

Trong môi trường phát triển, dừng server cũ rồi chạy lại:

```sh
npm run dev
```

Mở đúng địa chỉ đã khai báo trong `APP_URL`. Khi đổi public Site key trên production, cần build và deploy lại vì giá trị được nhúng vào bản build. Hosting phải hỗ trợ Next.js chạy API trên Node.js; hosting chỉ phục vụ file tĩnh không chạy được API nhận form.

## 7 Định dạng dữ liệu trong Sheet

### Quy tắc nhập Khu vực

Form bắt buộc nhập **Tỉnh/Thành phố, Quận/Huyện**, có đúng một dấu phẩy ASCII và hai phần đều có nội dung. Ví dụ đúng: **Quảng Ninh, Hạ Long**. Phần trước dấu phẩy vào cột D; phần sau vào cột E.

Các trường hợp không hợp lệ gồm `Hạ Long` vì thiếu dấu phẩy, `Quảng Ninh,` vì thiếu phần sau, `, Hạ Long` vì thiếu phần trước và địa chỉ có nhiều dấu phẩy. Không nhập xuống dòng. Giới hạn của trường là 200 ký tự sau chuẩn hóa.

Form kiểm tra khi rời ô và khi gửi; API và Apps Script cũng kiểm tra. Đây là kiểm tra định dạng, không tra cứu địa giới hành chính và không tự phát hiện hai phần bị nhập đảo thứ tự.

### Các cột nghiệp vụ từ A đến O

| Cột | Tiêu đề | Dữ liệu ghi vào |
| --- | --- | --- |
| A | Thời gian gửi | Giờ Việt Nam, dạng `dd/MM/yyyy HH:mm:ss` |
| B | Họ và Tên | Họ tên trên form |
| C | Số Điện Thoại | Chuẩn hóa về đầu 0, lưu dạng text để giữ số 0 đầu |
| D | Tỉnh/Thành phố | Phần trước dấu phẩy của Khu vực |
| E | Quận/Huyện | Phần sau dấu phẩy của Khu vực |
| F | Nhu cầu | Báo giá và tư vấn về sản phẩm hoặc Tư vấn giải pháp |
| G | Hệ sản phẩm cần tư vấn | Keo dán gạch, Keo chà ron, Chống thấm, Sửa chữa hoặc Khác |
| H | Thông tin khác | Nội dung bổ sung khi chọn hệ sản phẩm Khác; trường hợp khác để trống |
| I | Ghi chú thêm | Nội dung ghi chú trên form |
| J | Nguồn lead | `LEAD_SOURCE`, mặc định `Website` |
| K | Bài viết/Trang nguồn | `SOURCE_PAGE`, mặc định `Tư vấn & báo giá Jorakay` |
| L | Trạng thái xử lý | Tự điền `Mới` |
| M | Nhân viên phụ trách | Để trống để nhân viên cập nhật sau |
| N | Ngày liên hệ | Để trống để nhân viên cập nhật sau |
| O | Kết quả tư vấn | Để trống để nhân viên cập nhật sau |

### Các cột kỹ thuật từ P đến S

P lưu Request ID, Q lưu Payload SHA256, R lưu thông tin đồng ý liên hệ và S lưu phiên bản chính sách. Script ghi chúng cùng dòng lead rồi tự ẩn để giữ bố cục mẫu.

Không xóa hoặc chỉnh các cột này. Khi sắp xếp dữ liệu, chọn toàn bộ vùng A–S để dữ liệu kỹ thuật đi cùng lead. Ẩn cột chỉ phục vụ trình bày, không phải cơ chế bảo mật hoặc phân quyền.

Tab trống được tạo header tự động. Tab mẫu A–O đúng cấu trúc được giữ dữ liệu cũ; tiêu đề có thể khác cách xuống dòng, khoảng trắng hoặc hoa thường. Nếu thứ tự cột sai hoặc P–S có dữ liệu khác, script từ chối ghi. Mẫu cũ 12 cột không tự chuyển đổi; dùng tab mới hoặc chuyển dữ liệu sau khi sao lưu.

## 8 Kiểm tra và cập nhật sau triển khai

### Bước 11 Gửi thử từ form

1. Dùng dữ liệu giả có ghi rõ là bản thử; không dùng thông tin khách hàng thật. Nhập số điện thoại thử hợp lệ do bên triển khai quản lý.
2. Điền đủ thông tin, nhập Khu vực theo đúng thứ tự có dấu phẩy và chọn hệ sản phẩm. Khi chọn Khác, điền nội dung bổ sung.
3. Đánh dấu đồng ý liên hệ, hoàn tất Turnstile và bấm gửi một lần.
4. Chờ thông báo thành công rồi mở Sheet kiểm tra đúng một dòng mới, tiếng Việt hiển thị đúng và số điện thoại giữ số 0 đầu.
5. Kiểm tra D và E đã tách đúng, J và K đúng nguồn, L là Mới, M–O trống và P–S đã ẩn.
6. Thử nhập thiếu dấu phẩy để xác nhận form chặn định dạng sai. Sau kiểm thử, xử lý dòng test theo quy trình quản lý dữ liệu của khách hàng.

Website chỉ xác nhận thành công khi nhận phản hồi lưu thành công hoặc nhận diện yêu cầu đã lưu với mã yêu cầu phù hợp. Việc chỉ mở được trang hoặc lưu được mã Apps Script chưa chứng minh dữ liệu đã ghi thành công.

### Giải đáp về cách thử Apps Script

Không bấm **Run** trực tiếp cho `doPost` để thử ghi lead: cách này không có dữ liệu request và chữ ký xác thực. Cũng không kiểm tra bằng cách mở URL `/exec` trong trình duyệt; mã hiện tại chỉ có `doPost`, nên GET có thể báo không tìm thấy `doGet`. Hãy gửi từ form để kiểm tra toàn bộ luồng.

### Bước 12 Cập nhật khi thay đổi Code gs

Lưu mã mới, sau đó vào **Deploy → Manage deployments → Edit** với biểu tượng bút chì, chọn **Version → New version** và bấm **Deploy**. Lưu `Code.gs` đơn thuần chưa cập nhật bản Web App đang chạy.

Cập nhật deployment hiện có thường giữ nguyên URL. Nếu tạo deployment mới và URL đổi, cập nhật `GOOGLE_APPS_SCRIPT_URL` của website rồi khởi động hoặc triển khai lại. Sau mỗi thay đổi, gửi thử lại trên môi trường phù hợp.

## 9 Xử lý các tình huống thường gặp

### Form chưa gửi được hoặc Turnstile không hiển thị

Kiểm tra đã có Site key, hostname đã được cho phép, trình duyệt tải được Turnstile và đã restart hoặc build lại sau khi đổi env. Kiểm tra Site key và Secret key có thuộc cùng widget. Nếu trình chặn nội dung cản widget, thử cho phép Turnstile trong trình duyệt dùng kiểm tra.

### Website báo lỗi cấu hình hoặc HTTP 503

Người triển khai kiểm tra đủ sáu biến env, URL Apps Script đúng dạng `/exec`, secret đủ độ dài và env nằm ở đúng môi trường đang chạy. Hệ thống không ghi nhận thành công giả khi thiếu cấu hình.

### Yêu cầu bị từ chối với HTTP 400 hoặc 403

Kiểm tra các trường bắt buộc, dấu phẩy ở Khu vực và token Turnstile còn hợp lệ. Với lỗi Origin, kiểm tra `APP_URL` trùng địa chỉ thực tế, bao gồm `localhost` hay `127.0.0.1`, giao thức và port. Không bỏ kiểm tra Origin, hostname hoặc action để xử lý lỗi cấu hình.

### Không ghi được Sheet hoặc API báo HTTP 502

Kiểm tra `SPREADSHEET_ID`, tên tab, quyền chỉnh sửa của tài khoản triển khai, secret hai phía, chế độ Anyone và phiên bản deployment. Kiểm tra thứ tự header A–O và các cột P–S. Người kỹ thuật có thể xem mục **Executions** của Apps Script để chẩn đoán lỗi; không thêm log chứa dữ liệu form hoặc secret.

### Gửi quá nhiều và nhận HTTP 429

Mã hiện tại giới hạn ba yêu cầu mới cho một số điện thoại trong cửa sổ 10 phút và 60 yêu cầu mới mỗi phút cho toàn script. Chờ cửa sổ giới hạn kết thúc rồi thử lại khi cần; không tạo nhiều yêu cầu để né giới hạn. Lưu lượng lớn cần đánh giá thêm quota và giới hạn tại hosting hoặc CDN.

### Hết thời gian chờ và chưa xác nhận được kết quả

Timeout có thể xảy ra sau khi Sheet đã ghi dữ liệu. Kiểm tra Sheet trước. Nếu cần thử lại, giữ nguyên tab và nội dung form, hoàn tất CAPTCHA mới rồi gửi lại để hệ thống dùng lại mã yêu cầu và tránh thêm dòng đã lưu.

Tải lại trang hoặc đổi nội dung có thể tạo mã yêu cầu mới, nên không bảo đảm chống trùng với lần trước. Không hướng dẫn người dùng bấm gửi liên tục hoặc tải lại trang ngay khi chưa rõ kết quả.

## 10 Danh sách kiểm tra khi bàn giao

- Khách hàng sở hữu hoặc kiểm soát Sheet, Apps Script, Cloudflare và hosting; đã thống nhất người quản trị.
- Đã ghi lại tên tab, tài khoản sở hữu và deployment đang dùng; secret được bàn giao qua kênh riêng phù hợp.
- Production dùng HTTPS; `APP_URL` và hostname Turnstile khớp tên miền thực tế.
- Đã gửi thử thành công từ website thực tế và kiểm tra các cột dữ liệu trong Sheet.
- Nhân viên biết cập nhật M–O, giữ nguyên P–S và sắp xếp cả vùng A–S.
- Đã thống nhất quyền xem Sheet, thời gian lưu hoặc xóa dữ liệu và nội dung đồng ý liên hệ.
- Khi thu hồi quyền người triển khai, kiểm tra lại tài khoản thực thi deployment; thay khóa dùng chung đồng thời ở website và Apps Script nếu cần.

Chỉ đánh dấu hoàn tất bàn giao kết nối sau khi đã xác minh gửi thử trên môi trường thực tế. Tài liệu này không chứa thông tin xác thực và không thay thế bước kiểm tra đó.

## 11 Tài liệu chính thức để tra cứu

- [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web) — mô hình Web App và quyền thực thi.
- [Google Apps Script Properties Service](https://developers.google.com/apps-script/guides/properties) — lưu cấu hình tại Script Properties.
- [Google Apps Script Manifests](https://developers.google.com/apps-script/concepts/manifests) — cấu hình manifest.
- [Google Apps Script Deployments](https://developers.google.com/apps-script/concepts/deployments) — phiên bản và deployment.
- [Google Apps Script Authentication and Authorization Troubleshooting](https://developers.google.com/apps-script/api/troubleshoot-authentication-authorization) — xử lý cảnh báo và cấp quyền.
- [Cloudflare Turnstile Widget Management](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/) — tạo widget và lấy key.
- [Cloudflare Turnstile Hostname Management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/) — quản lý hostname.
- [Cloudflare Turnstile Testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) — localhost và đặc tính của dummy key.
- [Cloudflare Turnstile Server Side Validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) — xác minh token tại server.
