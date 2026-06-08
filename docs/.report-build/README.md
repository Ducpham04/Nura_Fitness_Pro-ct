# Bộ sinh báo cáo (Markdown → DOCX)

Cập nhật nội dung trong các file `.md` ở thư mục `docs/`, rồi chạy lại để sinh `.docx`.

## Cách dùng
```bash
cd docs/.report-build
npm install docx          # cài 1 lần
node md2docx.js ../bao-cao-du-an-fitnit-challenge.md   ../bao-cao-du-an-fitnit-challenge.docx   "BÁO CÁO DỰ ÁN FITNIT CHALLENGE" "Ứng dụng Fitness AI"
node md2docx.js ../bao-cao-nang-luc-ai.md              ../bao-cao-nang-luc-ai.docx              "BÁO CÁO NĂNG LỰC AI" "Kiến trúc & Lộ trình"
node md2docx.js ../bao-cao-ky-thuat-he-thong.md        ../bao-cao-ky-thuat-he-thong.docx        "BÁO CÁO KỸ THUẬT HỆ THỐNG" "Entity · Quan hệ data · Công thức"
```

`md2docx.js` hỗ trợ: heading, bảng, bullet/numbered list, code block, blockquote, **bold**, `code`, horizontal rule.
