# KLCN - Hệ Thống Giám Sát Sức Khỏe Người Cao Tuổi

# Những thay đổi
- Có comment seed data tài khoản Doctor trong file AdminAccountSeeder.java 
- Bên Admin đã tạo 1 tài khoản Doctor:
Thông tin Email: bacsinguyen@gmail.com 
Thông tin mật khẩu: Doctor@123

### Cập nhật hệ thống (Ngày 5/10/2026):
1. **Quản lý phân công Bác sĩ**:
   - Thêm API mới `POST /api/admin/doctor-assignments` cho phép Admin gán hồ sơ Người cao tuổi cho Bác sĩ.
   - Bổ sung các DTO: `AssignDoctorRequest`, `DoctorAssignmentResponse`.

2. **Cập nhật Model và Database (Clean DB)**:
   - Xóa bỏ các trường `failedLoginAttempts` và `lockedUntil` trong bảng `users` (Entity `User`).
   - Xóa bỏ trạng thái `DISABLED` trong hệ thống, chỉ giữ lại `ACTIVE` (hoạt động) và `LOCKED` (đã khóa).
   - Đơn giản hóa logic khóa tài khoản: Không còn khóa tạm thời tự động khi đăng nhập sai nhiều lần. Nếu nhập sai chỉ báo lỗi trực tiếp.
   - Hàm vô hiệu hóa tài khoản (`softDeleteUser`) của Admin nay sẽ đổi trạng thái tài khoản thành `LOCKED`.
   - Cập nhật các DTO Response và `JwtAuthenticationFilter` để tương thích với thay đổi cấu trúc bảng `users`.
