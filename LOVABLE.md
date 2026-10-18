# Việc cần Lovable làm

Xưởng hiện quay ảnh tĩnh trên trình duyệt. Nhanh, nhưng chưa phải một clip hoàn chỉnh. Hãy làm bản nhân viên dùng được, đẹp hơn, vẫn trung thực.

## Giữ

- Hai thương hiệu trong `src/lib/xuong.ts`. Không thêm giá, không thêm số suất, không hứa lợi nhuận.
- Ảnh và video phải là file người dùng tải lên. Không gọi model vẽ lại phòng, mặt tiền, mặt bằng.
- Clip dọc 9:16, 10 hoặc 12 giây, tải được trên điện thoại.
- Chân hình có trang và hotline đúng số đang ghi trong `xuong.ts`.
- Nút sao chép bài đăng: tiêu đề, lời, hashtag.

## Làm thêm

1. Ô "Hướng clip": người dùng viết một câu, chữ trên hình lấy từ câu đó, không chỉ mẫu có sẵn.
2. Nhận cả ảnh lẫn video ngắn quay tại chỗ. Cắt đúng file đó vào timeline. Không tải footage stock.
3. Nhạc nền đỡ giả, hoặc nút Không tiếng để tự gắn nhạc trên TikTok, Reels, Zalo.
4. Mở đầu phải dừng người lướt. Giữa clip mỗi ảnh một câu. Cuối clip là tên, trang, số điện thoại.

## Không làm

- Không nhúng MoneyPrinterTurbo, OpenMontage, Remotion server, hay một pipeline tự kiếm ảnh stock.
- Không biến thành trình sửa timeline kiểu CapCut.
- Không bịa phòng nghỉ, giá thuê, phí ký gửi, mức giảm giá.
- Ảnh mẫu chỉ để thử máy. Trên hình phải còn chữ ẢNH MẪU khi chưa có ảnh thật.

## File quan trọng

- `src/lib/xuong.ts` — thương hiệu, lời, hashtag, hotline.
- `src/lib/reel.ts` — vẽ khung hình và quay MediaRecorder.
- `src/components/xuong/bench.tsx` — màn hình người dùng.
