import { Resend } from "resend";
import type { Locale } from "@/lib/dictionary";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Palmyra Automotive <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

type AuthPurpose = "VERIFY" | "RESET";

const copy: Record<Locale, Record<AuthPurpose, { subject: string; heading: string; intro: string; note: string; ignore: string }>> = {
  en: {
    VERIFY: {
      subject: "Verify your email",
      heading: "Confirm your email",
      intro: "Use the code below to finish creating your account.",
      note: "This code expires in 10 minutes.",
      ignore: "If you didn’t create an account, you can safely ignore this email.",
    },
    RESET: {
      subject: "Reset your password",
      heading: "Password reset",
      intro: "Use the code below to reset your password.",
      note: "This code expires in 10 minutes.",
      ignore: "If you didn’t request a password reset, you can safely ignore this email.",
    },
  },
  ar: {
    VERIFY: {
      subject: "تأكيد بريدك الإلكتروني",
      heading: "أكّد بريدك الإلكتروني",
      intro: "استخدم الرمز أدناه لإكمال إنشاء حسابك.",
      note: "تنتهي صلاحية هذا الرمز خلال 10 دقائق.",
      ignore: "إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذه الرسالة بأمان.",
    },
    RESET: {
      subject: "إعادة تعيين كلمة المرور",
      heading: "إعادة تعيين كلمة المرور",
      intro: "استخدم الرمز أدناه لإعادة تعيين كلمة المرور.",
      note: "تنتهي صلاحية هذا الرمز خلال 10 دقائق.",
      ignore: "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.",
    },
  },
};

function render(code: string, c: (typeof copy)["en"]["VERIFY"], locale: Locale) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  return `<!doctype html>
<html dir="${dir}" lang="${locale}">
  <body style="margin:0;background:#f0fdf4;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#052e16;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <div style="background:#ffffff;border:1px solid #d1fae5;border-radius:16px;padding:32px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#052e16;">${c.heading}</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#059669;">${c.intro}</p>
        <div style="text-align:center;background:#ecfdf5;border-radius:12px;padding:20px;margin-bottom:16px;">
          <span style="font-size:34px;font-weight:800;letter-spacing:8px;color:#047857;">${code}</span>
        </div>
        <p style="margin:0 0 4px;font-size:13px;color:#65a30d;">${c.note}</p>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">${c.ignore}</p>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Sends a one-time auth code by email. When RESEND_API_KEY is not configured
 * (e.g. local development) the code is logged to the console instead.
 */
export async function sendAuthCodeEmail(
  email: string,
  code: string,
  purpose: AuthPurpose,
  locale: Locale
): Promise<void> {
  const c = copy[locale][purpose];

  if (!resend) {
    console.info(`[email:dev] ${purpose} code for ${email}: ${code}`);
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: c.subject,
    html: render(code, c, locale),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
