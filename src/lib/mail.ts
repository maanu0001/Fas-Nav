/**
 * E-Mail-Versand. Ohne SMTP-Konfiguration werden Nachrichten lediglich
 * protokolliert, damit die Anwendung auch ohne Mailserver lauffähig bleibt.
 */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Ergebnis eines Versands.
 *
 * `reason` unterscheidet den Fall „es gibt gar keinen Mailserver" vom Fall
 * „der Versand ist gescheitert". Aufrufer, die eine Wiederholung steuern,
 * brauchen diesen Unterschied: Ohne Mailserver ist nichts passiert und ein
 * späterer Versuch sinnvoll; ein gescheiterter Versand sollte dagegen nicht
 * endlos wiederholt werden.
 */
export type MailResult = { sent: boolean; reason?: "not_configured" | "failed" };

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    console.info(
      `[mail] SMTP nicht konfiguriert – Nachricht an ${message.to}: ${message.subject}`,
    );
    return { sent: false, reason: "not_configured" };
  }

  try {
    // nodemailer wird nur geladen, wenn SMTP tatsächlich konfiguriert ist.
    const nodemailer = await import("nodemailer");

    const transport = nodemailer.default.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });

    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "Fas-Nav.ch <noreply@fas-nav.ch>",
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { sent: true };
  } catch (error) {
    console.error("[mail] Versand fehlgeschlagen:", error);
    return { sent: false, reason: "failed" };
  }
}

export function passwordResetMail(name: string, url: string): Omit<MailMessage, "to"> {
  return {
    subject: "Passwort zurücksetzen – Fas-Nav.ch",
    text: `Hallo ${name}

Du hast das Zurücksetzen deines Passworts angefordert.

Öffne den folgenden Link, um ein neues Passwort zu setzen:
${url}

Der Link ist 60 Minuten gültig. Falls du die Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.

Freundliche Grüsse
Fas-Nav.ch`,
  };
}
