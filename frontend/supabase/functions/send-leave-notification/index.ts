import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "approved" | "rejected";
  reason?: string;
  comments?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const emailData: EmailRequest = await req.json();
    
    console.log("Sending email notification:", emailData.to);

    // Get Gmail SMTP credentials from secrets
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 587,
        tls: true,
        auth: {
          username: gmailUser,
          password: gmailPassword,
        },
      },
    });

    // Prepare email content
    const statusColor = emailData.status === "approved" ? "#10b981" : "#ef4444";
    const statusText = emailData.status === "approved" ? "APPROVED" : "REJECTED";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-badge { display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 4px; font-weight: bold; }
            .detail-row { margin: 15px 0; padding: 10px; background-color: white; border-radius: 4px; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Leave Request ${statusText}</h1>
            </div>
            <div class="content">
              <p>Dear ${emailData.employeeName},</p>
              
              <p>Your leave request has been <span class="status-badge">${statusText}</span></p>
              
              <div class="detail-row">
                <span class="label">Leave Type:</span> 
                <span class="value">${emailData.leaveType}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Start Date:</span> 
                <span class="value">${emailData.startDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">End Date:</span> 
                <span class="value">${emailData.endDate}</span>
              </div>
              
              <div class="detail-row">
                <span class="label">Number of Days:</span> 
                <span class="value">${emailData.days}</span>
              </div>
              
              ${emailData.reason ? `
              <div class="detail-row">
                <span class="label">Reason:</span> 
                <span class="value">${emailData.reason}</span>
              </div>
              ` : ''}
              
              ${emailData.comments ? `
              <div class="detail-row">
                <span class="label">HR Comments:</span> 
                <span class="value">${emailData.comments}</span>
              </div>
              ` : ''}
              
              <p style="margin-top: 20px;">
                ${emailData.status === "approved" 
                  ? "Your leave has been approved. Please ensure you have completed all necessary handover procedures before your leave begins." 
                  : "Your leave request has been rejected. Please contact HR for more information or to discuss alternative dates."}
              </p>
              
              <div class="footer">
                <p>This is an automated message from the Employee Portal.</p>
                <p>Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    await client.send({
      from: gmailUser,
      to: emailData.to,
      subject: emailData.subject,
      content: htmlContent,
      html: htmlContent,
    });

    await client.close();

    console.log("Email sent successfully to:", emailData.to);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
