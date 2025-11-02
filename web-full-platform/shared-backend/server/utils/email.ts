import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

interface EmailSettings {
  email_service_provider?: string;
  email_api_key?: string;
  email_from_address?: string;
  email_from_name?: string;
  email_reply_to?: string;
  email_mailgun_domain?: string;
  email_smtp_host?: string;
  email_smtp_port?: string;
  email_smtp_user?: string;
  email_smtp_pass?: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(settings: EmailSettings, emailData: EmailData): Promise<void> {
  const provider = settings.email_service_provider?.toLowerCase();

  console.log(`[Email] Attempting to send email using provider: ${provider}`);
  console.log(`[Email] From: ${settings.email_from_address}, To: ${emailData.to}`);

  if (!settings.email_from_address) {
    throw new Error("From email address not configured");
  }

  const fromEmail = settings.email_from_name 
    ? `${settings.email_from_name} <${settings.email_from_address}>`
    : settings.email_from_address;

  switch (provider) {
    case "sendgrid":
      return sendWithSendGrid(settings, emailData, fromEmail);
    
    case "mailgun":
      return sendWithMailgun(settings, emailData, fromEmail);
    
    case "resend":
      return sendWithResend(settings, emailData, fromEmail);
    
    case "smtp":
      return sendWithSMTP(settings, emailData, fromEmail);
    
    default:
      throw new Error(`Unsupported email provider: ${provider || 'not configured'}`);
  }
}

async function sendWithSendGrid(settings: EmailSettings, emailData: EmailData, fromEmail: string): Promise<void> {
  if (!settings.email_api_key) {
    throw new Error("SendGrid API key not configured");
  }

  sgMail.setApiKey(settings.email_api_key);

  const msg = {
    to: emailData.to,
    from: fromEmail,
    subject: emailData.subject,
    text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
    html: emailData.html,
  };

  try {
    await sgMail.send(msg);
  } catch (error: any) {
    // Log detailed SendGrid error for debugging
    console.error('SendGrid error details:', {
      message: error.message,
      code: error.code,
      response: error.response?.body,
    });
    
    // Throw a more helpful error message
    if (error.response?.body?.errors?.[0]?.message) {
      throw new Error(`SendGrid: ${error.response.body.errors[0].message}`);
    }
    throw error;
  }
}

async function sendWithMailgun(settings: EmailSettings, emailData: EmailData, fromEmail: string): Promise<void> {
  // For Mailgun, we'll use their REST API
  if (!settings.email_api_key) {
    throw new Error("Mailgun API key not configured");
  }

  if (!settings.email_mailgun_domain) {
    throw new Error("Mailgun domain not configured");
  }

  const domain = settings.email_mailgun_domain;
  const apiKey = settings.email_api_key;

  console.log(`[Mailgun] Sending email via domain: ${domain}`);
  console.log(`[Mailgun] API Key (first 20 chars): ${apiKey.substring(0, 20)}...`);

  const formData = new URLSearchParams();
  formData.append('from', fromEmail);
  formData.append('to', emailData.to);
  formData.append('subject', emailData.subject);
  formData.append('html', emailData.html);
  if (emailData.text) {
    formData.append('text', emailData.text);
  }
  // Add Reply-To header if configured
  if (settings.email_reply_to) {
    formData.append('h:Reply-To', settings.email_reply_to);
  }

  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  console.log(`[Mailgun] Endpoint: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  console.log(`[Mailgun] Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Mailgun] Error response:`, errorText);
    
    // Provide helpful error messages
    if (response.status === 401) {
      throw new Error(`Mailgun Authentication Failed: Invalid API key. Please check your Mailgun API key in settings.`);
    }
    if (response.status === 403) {
      throw new Error(`Mailgun Forbidden: The API key doesn't have permission for domain "${domain}". Make sure the API key and domain are from the same Mailgun account.`);
    }
    if (response.status === 404) {
      throw new Error(`Mailgun Domain Not Found: Domain "${domain}" not found. Please verify the domain name in settings.`);
    }
    
    throw new Error(`Mailgun error (${response.status}): ${errorText}`);
  }

  console.log(`[Mailgun] Email sent successfully!`);
}

async function sendWithResend(settings: EmailSettings, emailData: EmailData, fromEmail: string): Promise<void> {
  if (!settings.email_api_key) {
    throw new Error("Resend API key not configured");
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${settings.email_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [emailData.to],
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(`Resend error: ${error.message || response.statusText}`);
  }
}

async function sendWithSMTP(settings: EmailSettings, emailData: EmailData, fromEmail: string): Promise<void> {
  // For SMTP, use dedicated fields
  if (!settings.email_smtp_host || !settings.email_smtp_port || !settings.email_smtp_user || !settings.email_smtp_pass) {
    throw new Error("SMTP configuration incomplete. Please configure host, port, user, and password");
  }

  const host = settings.email_smtp_host;
  const port = settings.email_smtp_port;
  const user = settings.email_smtp_user;
  const pass = settings.email_smtp_pass;

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: parseInt(port) === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    console.log(`[SMTP] Connecting to ${host}:${port} as ${user}`);
    const info = await transporter.sendMail({
      from: fromEmail,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
      html: emailData.html,
    });
    console.log(`[SMTP] Email sent successfully! Message ID: ${info.messageId}`);
    console.log(`[SMTP] Response:`, info.response);
  } catch (error: any) {
    // Provide helpful error messages for common SMTP issues
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('Username and Password not accepted') || errorMessage.includes('BadCredentials')) {
      throw new Error(
        'SMTP Authentication Failed: Invalid username or password. ' +
        'If using Gmail, you must use an App Password instead of your regular password. ' +
        'Visit https://myaccount.google.com/apppasswords to generate one.'
      );
    }
    
    if (errorMessage.includes('ECONNREFUSED')) {
      throw new Error(`SMTP Connection Failed: Unable to connect to ${host}:${port}. Please check your host and port settings.`);
    }
    
    if (errorMessage.includes('ETIMEDOUT')) {
      throw new Error(`SMTP Timeout: Connection to ${host}:${port} timed out. Please check your network and firewall settings.`);
    }
    
    // Handle temporary SMTP errors (421, 450, 451, 452)
    if (errorMessage.includes('421') || errorMessage.includes('Temporary System Problem')) {
      throw new Error(
        'SMTP Temporary Error: The email server is temporarily unavailable or rate limiting. ' +
        'This is usually due to sending too many emails in a short time. Please try again in a few minutes.'
      );
    }
    
    if (errorMessage.includes('450') || errorMessage.includes('451') || errorMessage.includes('452')) {
      throw new Error(
        'SMTP Temporary Error: The email server rejected the request temporarily. ' +
        'Please wait a few minutes and try again.'
      );
    }
    
    throw new Error(`SMTP Error: ${errorMessage}`);
  }
}
