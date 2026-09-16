# Tối Nay Xem Gì? 🎰

**Tiếng Việt** · [English](README.en.md)

Ứng dụng local mở hòm để chọn ngẫu nhiên một bộ phim đáng xem. Danh sách phim được lấy từ API công khai của [Nguồn Phim](https://phim.nguonc.com/api-document), sau đó bạn có thể xem mô tả, mở link xem phim và lưu phim vào kho đồ cá nhân trên trình duyệt.

<video src="assets/promo.mp4" controls="controls" muted="muted" width="100%"></video>

## Chạy trên máy

Cần Node.js 22.12+ và pnpm theo `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Mở [127.0.0.1:3000](http://127.0.0.1:3000). Khi không có snapshot cục bộ, ứng dụng tự lấy trang phim mới cập nhật từ API Nguồn Phim. Nếu dùng `npm`, có thể chạy tương đương bằng `npm install` và `npm run dev`.

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

Ứng dụng chỉ phục vụ cho việc chạy local, không có đăng nhập, tài khoản, backend hay đồng bộ đám mây. API công khai được gọi khi cần để tải danh sách và thông tin phim; link xem phim chỉ được mở sau thao tác của người dùng.

## Tính năng chính
- **Mở hòm phim:** chọn phim theo các hạng độ hiếm và hiệu ứng mở hòm.
- **Xem mô tả:** tải poster, tên gốc, năm phát hành, thời lượng, chất lượng, ngôn ngữ, đạo diễn, diễn viên và mô tả từ endpoint chi tiết.
- **Xem phim:** lấy tập đầu tiên từ dữ liệu tập phim sau khi người dùng bấm nút xem.
- **Kho đồ cá nhân:** lưu tối đa 12 phim yêu thích bằng cookie host-only của trình duyệt; không gửi bộ sưu tập lên máy chủ.
- **Bộ đếm local:** số lượt mở chỉ thuộc trình duyệt hiện tại, không phải tổng số người dùng.

## API sử dụng

- Danh sách phim mới: `https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1`
- Chi tiết phim và tập phim: `https://phim.nguonc.com/api/film/{slug}`
- Tài liệu API: [phim.nguonc.com/api-document](https://phim.nguonc.com/api-document)

Thông tin từ API là dữ liệu bên ngoài. Ứng dụng kiểm tra các trường cần thiết trước khi đưa phim vào hòm và hiển thị thông báo khi dữ liệu hoặc cookie không khả dụng.

## GitHub Pages, đóng góp và nguồn gốc

GitHub Pages chỉ redirect đến https://truanayangi.com/; chỉ `pages-redirect/` được publish lên `gh-pages`, còn app này chạy local từ `main`. Chào đón issue/fork PR vào `main` bằng Việt hoặc Anh, kể cả draft PR.

Dự án lấy cảm hứng từ [nagisanzenin/truanayangi](https://github.com/nagisanzenin/truanayangi). Repo giữ lịch sử từ `nagisanzenin/truanayangi`. Xem nguồn asset tại [ATTRIBUTION.md](ATTRIBUTION.md).
