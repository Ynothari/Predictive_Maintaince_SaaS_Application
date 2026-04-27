import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(`[Mock Email] To: ${to} | Subject: ${subject}`);
    console.warn(`Content: ${html}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"PredictIQ Analytics" <${process.env.SMTP_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      html, // html body
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
  }
};

export const sendAnomalyReport = async (to: string, metrics: any) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">PredictIQ Anomaly Report</h2>
      </div>
      <div style="padding: 20px; color: #333;">
        <p>Hello,</p>
        <p>This is your automated anomaly digest from PredictIQ. We've detected high-risk machine readings spanning across your recent analyses.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f9fafb;">
            <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: left;">Metric</th>
            <th style="padding: 10px; border-bottom: 2px solid #ddd; text-align: right;">Value</th>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Total Analyses Reviewed</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><b>${metrics.totalAnalyses}</b></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">High-Risk Failures Detected</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #ef4444;"><b>${metrics.highRiskCount}</b></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Overall Failure Rate</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><b>${metrics.failureRate.toFixed(1)}%</b></td>
          </tr>
        </table>
        
        <p style="font-size: 14px; text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Full Dashboard
          </a>
        </p>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #ddd;">
        &copy; ${new Date().getFullYear()} PredictIQ. All rights reserved.
      </div>
    </div>
  `;
  await sendEmail(to, `URGENT: ${metrics.highRiskCount} High-Risk Machine Anomalies Detected`, html);
};
