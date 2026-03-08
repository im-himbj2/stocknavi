"""
Email Service - Gmail SMTP
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


async def send_verification_email(to_email: str, token: str):
    """이메일 인증 메일 발송"""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # SMTP 미설정 시 콘솔에 토큰 출력 (개발용)
        print(f"[Email] SMTP 미설정 - 개발 모드. 인증 링크:")
        print(f"  {settings.FRONTEND_URL}/api/auth/verify-email?token={token}")
        return

    verify_url = f"{settings.FRONTEND_URL}/api/auth/verify-email?token={token}"
    from_addr = settings.FROM_EMAIL or settings.SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "[StockNavi] 이메일 인증을 완료해주세요"
    msg["From"] = f"StockNavi <{from_addr}>"
    msg["To"] = to_email

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0a0f15;font-family:-apple-system,sans-serif;">
      <div style="max-width:520px;margin:40px auto;padding:40px;background:#0e1a29;border-radius:16px;border:1px solid #1e3a5f;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="display:inline-block;width:48px;height:48px;background:#00498C;border-radius:12px;line-height:48px;font-size:22px;font-weight:900;color:white;">S</div>
          <h1 style="color:white;font-size:22px;margin:16px 0 4px;">StockNavi</h1>
          <p style="color:#64748b;font-size:13px;margin:0;">주식 투자 네비게이터</p>
        </div>

        <h2 style="color:white;font-size:18px;margin:0 0 12px;">이메일 인증</h2>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
          StockNavi에 가입해주셔서 감사합니다!<br>
          아래 버튼을 클릭해 이메일 인증을 완료해주세요.
        </p>

        <div style="text-align:center;margin-bottom:28px;">
          <a href="{verify_url}"
             style="display:inline-block;padding:14px 36px;background:#00498C;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
            이메일 인증하기
          </a>
        </div>

        <p style="color:#475569;font-size:12px;line-height:1.5;margin:0 0 8px;">
          버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣으세요:
        </p>
        <p style="color:#3b82f6;font-size:11px;word-break:break-all;margin:0 0 28px;">
          {verify_url}
        </p>

        <hr style="border:none;border-top:1px solid #1e3a5f;margin:0 0 20px;">
        <p style="color:#475569;font-size:11px;margin:0;text-align:center;">
          이 이메일은 StockNavi 계정 생성 요청에 의해 발송되었습니다.<br>
          본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
        </p>
      </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(from_addr, to_email, msg.as_string())
        print(f"[Email] 인증 메일 발송 완료: {to_email}")
    except Exception as e:
        print(f"[Email] 발송 실패 ({to_email}): {e}")
        raise
