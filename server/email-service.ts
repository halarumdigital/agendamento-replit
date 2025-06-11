import nodemailer from 'nodemailer';
import { GlobalSettings } from '@shared/schema';

export class EmailService {
  private createTransporter(settings: GlobalSettings) {
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      throw new Error('SMTP settings not configured');
    }

    return nodemailer.createTransporter({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    });
  }

  async sendPasswordResetEmail(
    settings: GlobalSettings,
    to: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      const transporter = this.createTransporter(settings);
      
      const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/company/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: `"${settings.smtpFromName || settings.systemName || 'Sistema'}" <${settings.smtpFrom || settings.smtpUser}>`,
        to,
        subject: 'Recuperação de Senha',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperação de Senha</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, ${settings.primaryColor || '#2563eb'} 0%, ${settings.secondaryColor || '#64748b'} 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Recuperação de Senha</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Olá,</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Recebemos uma solicitação para recuperar a senha da sua conta. 
                Clique no botão abaixo para redefinir sua senha:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: ${settings.primaryColor || '#2563eb'}; 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;
                          font-size: 16px;">
                  Redefinir Senha
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Se você não solicitou esta recuperação de senha, ignore este email. 
                Este link expira em 1 hora por motivos de segurança.
              </p>
              
              <p style="font-size: 14px; color: #666; margin-top: 20px;">
                Se o botão não funcionar, copie e cole este link no seu navegador:<br>
                <a href="${resetUrl}" style="color: ${settings.primaryColor || '#2563eb'}; word-break: break-all;">
                  ${resetUrl}
                </a>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
              © ${new Date().getFullYear()} ${settings.systemName || 'Sistema'}. Todos os direitos reservados.
            </div>
          </body>
          </html>
        `,
      };

      await transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();