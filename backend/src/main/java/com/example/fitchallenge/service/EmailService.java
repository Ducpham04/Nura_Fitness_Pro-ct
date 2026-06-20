package com.example.fitchallenge.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Service gửi email hệ thống.
 *
 * Nếu SMTP chưa cấu hình (MAIL_USERNAME rỗng) thì token được log ra console
 * để tiện debug local — email không thực sự được gửi nhưng app không bị crash.
 */
@Slf4j
@Service
public class EmailService {

    /** Null nếu Spring không thể auto-configure (thiếu mail host). */
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@fitnit.vn}")
    private String fromAddress;

    @Value("${app.mail.from-name:Fitnit Challenge}")
    private String fromName;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    /**
     * Gửi email đặt lại mật khẩu.
     *
     * @param toEmail   địa chỉ nhận
     * @param userName  tên hiển thị của user
     * @param token     UUID token (gắn vào link reset)
     */
    public void sendPasswordResetEmail(String toEmail, String userName, String token) {
        String resetLink = frontendUrl + "/reset-password?token=" + token;

        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.warn("[Email] SMTP chưa cấu hình. Token reset cho {} : {}", toEmail, resetLink);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("[Fitnit] Đặt lại mật khẩu của bạn");
            helper.setText(buildResetEmailHtml(userName, resetLink), true);

            mailSender.send(message);
            log.info("[Email] Đã gửi email đặt lại mật khẩu tới {}", toEmail);

        } catch (MailException | MessagingException e) {
            log.error("[Email] Gửi email thất bại tới {}: {}", toEmail, e.getMessage());
            // Không throw — caller tự quyết định hiển thị lỗi hay không
        } catch (Exception e) {
            log.error("[Email] Lỗi không xác định khi gửi mail tới {}: {}", toEmail, e.getMessage());
        }
    }

    /**
     * Gửi email nhắc gói AI sắp hết hạn.
     *
     * @param toEmail     địa chỉ nhận
     * @param userName    tên hiển thị
     * @param packageName tên gói (vd "Fitnit PLUS")
     * @param daysLeft    số ngày còn lại trước khi hết hạn
     */
    public void sendPackageExpiryReminder(String toEmail, String userName, String packageName, long daysLeft) {
        String upgradeLink = frontendUrl + "/profile";

        if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
            log.warn("[Email] SMTP chưa cấu hình. Nhắc hết hạn gói {} cho {} (còn {} ngày)", packageName, toEmail, daysLeft);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("[Fitnit] Gói " + packageName + " của bạn sắp hết hạn");
            helper.setText(buildExpiryReminderHtml(userName, packageName, daysLeft, upgradeLink), true);

            mailSender.send(message);
            log.info("[Email] Đã gửi nhắc hết hạn gói {} tới {} (còn {} ngày)", packageName, toEmail, daysLeft);

        } catch (MailException | MessagingException e) {
            log.error("[Email] Gửi email nhắc hết hạn thất bại tới {}: {}", toEmail, e.getMessage());
        } catch (Exception e) {
            log.error("[Email] Lỗi không xác định khi gửi mail nhắc hết hạn tới {}: {}", toEmail, e.getMessage());
        }
    }

    private String buildExpiryReminderHtml(String userName, String packageName, long daysLeft, String upgradeLink) {
        String name = (userName != null && !userName.isBlank()) ? userName : "bạn";
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
            <body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
                    <tr>
                      <td style="background:#131313;padding:24px 32px;border-bottom:1px solid #2a2a2a;">
                        <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">⚡ Fitnit</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px;">
                        <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Gói của bạn sắp hết hạn</h2>
                        <p style="margin:0 0 20px;color:#a0a0a0;line-height:1.6;">
                          Xin chào <strong style="color:#fff;">%s</strong>,<br/>
                          Gói <strong style="color:#ccff00;">%s</strong> của bạn sẽ hết hạn sau
                          <strong style="color:#fff;">%d ngày</strong>. Gia hạn ngay để không gián đoạn
                          quyền dùng AI (kế hoạch ăn, tập, phân tích tư thế).
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                          <tr>
                            <td style="background:#ccff00;border-radius:12px;">
                              <a href="%s" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0d0d0d;text-decoration:none;letter-spacing:0.3px;">
                                Gia hạn ngay →
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:24px 0 0;color:#555;font-size:12px;border-top:1px solid #2a2a2a;padding-top:16px;">
                          Sau khi hết hạn, tài khoản sẽ tự động chuyển về gói FREE.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#131313;padding:16px 32px;border-top:1px solid #2a2a2a;">
                        <p style="margin:0;color:#444;font-size:12px;">© 2026 Fitnit Challenge. Tất cả quyền được bảo lưu.</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(name, packageName, daysLeft, upgradeLink);
    }

    private String buildResetEmailHtml(String userName, String resetLink) {
        String name = (userName != null && !userName.isBlank()) ? userName : "bạn";
        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
            <body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background:#131313;padding:24px 32px;border-bottom:1px solid #2a2a2a;">
                        <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">⚡ Fitnit</span>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:32px;">
                        <h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Đặt lại mật khẩu</h2>
                        <p style="margin:0 0 20px;color:#a0a0a0;line-height:1.6;">
                          Xin chào <strong style="color:#fff;">%s</strong>,<br/>
                          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                          Nhấn nút bên dưới để tiếp tục — link có hiệu lực trong <strong style="color:#fff;">30 phút</strong>.
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                          <tr>
                            <td style="background:#ccff00;border-radius:12px;">
                              <a href="%s" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0d0d0d;text-decoration:none;letter-spacing:0.3px;">
                                Đặt lại mật khẩu →
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:0 0 8px;color:#666;font-size:13px;">
                          Hoặc copy link này vào trình duyệt:<br/>
                          <span style="color:#888;word-break:break-all;">%s</span>
                        </p>
                        <p style="margin:24px 0 0;color:#555;font-size:12px;border-top:1px solid #2a2a2a;padding-top:16px;">
                          Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                          Tài khoản của bạn vẫn an toàn.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background:#131313;padding:16px 32px;border-top:1px solid #2a2a2a;">
                        <p style="margin:0;color:#444;font-size:12px;">© 2026 Fitnit Challenge. Tất cả quyền được bảo lưu.</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(name, resetLink, resetLink);
    }
}
