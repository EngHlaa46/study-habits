import { Resend } from "resend";

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log("\n--- PASSWORD RESET (local dev) ---");
    console.log(`To: ${email}`);
    console.log(`Reset link: ${resetLink}`);
    console.log("----------------------------------\n");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Study Skills Builder <noreply@studyskillsbuilder.com>",
    to: email,
    subject: "Reset your password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0d0d14; color: #e2e8f0; border-radius: 12px;">
        <h2 style="color: #38bdf8; margin-top: 0;">Password Reset</h2>
        <p>You requested a password reset for your Study Habits account.</p>
        <p>Click the button below to set a new password. This link expires in 1 hour.</p>
        <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #38bdf8; color: #000; font-weight: 600; text-decoration: none; border-radius: 8px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
