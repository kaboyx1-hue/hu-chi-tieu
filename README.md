# Hũ Chi Tiêu

Sổ theo dõi sinh hoạt phí theo tháng, dùng chủ yếu trên điện thoại. Dự án độc lập, không liên quan tới hệ thống khác.

## Cấu trúc

| Phần | Vai trò |
|---|---|
| `index.html`, `app.js` | Giao diện |
| `tinh.js` | Tính tiền, gộp dữ liệu (không đụng giao diện) |
| `sw.js`, `manifest.webmanifest` | Mở được khi mất mạng, thêm ra màn hình chính |
| `apps-script/` | Máy chủ: Google Apps Script gắn với Sheet riêng |
| `tests/` | Kiểm thử, chạy bằng `node --test "tests/*.js"` |

## Dữ liệu ở đâu

Repo này công khai và **không chứa dữ liệu nào**. Số tiền nằm trong Google Sheet riêng, mỗi máy giữ thêm một bản để dùng khi mất mạng. Địa chỉ máy chủ và khoá nằm sau dấu `#` của link riêng, trình duyệt không gửi phần đó lên GitHub. Lộ link riêng là lộ sổ.

Đổi khoá khi nghi lộ: trong Apps Script, xoá thuộc tính `KHOA` ở Project Settings → Script Properties, rồi mở link riêng mới.

## Phát hành

- Giao diện: đẩy lên `main`, GitHub Pages tự cập nhật.
- Máy chủ: trong `apps-script/` chạy `clasp push --force` rồi `clasp update-deployment <id đang dùng>`. Bản triển khai đang dùng phải được tạo từ trình soạn thảo Apps Script: bản tạo bằng lệnh `clasp` bị Google chặn người ngoài dù cấu hình đúng. Cần file `.clasp.json` (không nằm trong repo, lấy mã script từ Sheet → Tiện ích → Apps Script → Project Settings).
