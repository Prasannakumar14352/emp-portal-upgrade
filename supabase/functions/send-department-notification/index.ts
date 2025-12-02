import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DepartmentNotificationRequest {
  employeeId: number;
  employeeEmail: string;
  employeeName: string;
  departmentName: string;
  action: "assigned" | "removed";
  assignedBy?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: DepartmentNotificationRequest = await req.json();
    
    console.log("Processing department notification:", data);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create in-app notification
    const notificationTitle = data.action === "assigned" 
      ? "Department Assignment" 
      : "Department Change";
    
    const notificationMessage = data.action === "assigned"
      ? `You have been assigned to the ${data.departmentName} department.`
      : `You have been removed from the ${data.departmentName} department.`;

    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: data.employeeId,
        title: notificationTitle,
        message: notificationMessage,
        type: "department",
        metadata: {
          department_name: data.departmentName,
          action: data.action,
          assigned_by: data.assignedBy,
        },
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    } else {
      console.log("In-app notification created for employee:", data.employeeId);
    }

    // Send email notification
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (gmailUser && gmailPassword && data.employeeEmail) {
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

      const statusColor = data.action === "assigned" ? "#10b981" : "#f59e0b";
      const actionText = data.action === "assigned" ? "Assigned" : "Removed";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
              .detail-row { margin: 15px 0; padding: 10px; background-color: white; border-radius: 4px; }
              .label { font-weight: bold; color: #666; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Department ${actionText}</h1>
              </div>
              <div class="content">
                <p>Dear ${data.employeeName},</p>
                
                <p>${notificationMessage}</p>
                
                <div class="detail-row">
                  <span class="label">Department:</span> 
                  <span class="value">${data.departmentName}</span>
                </div>
                
                ${data.assignedBy ? `
                <div class="detail-row">
                  <span class="label">${data.action === "assigned" ? "Assigned By" : "Updated By"}:</span> 
                  <span class="value">${data.assignedBy}</span>
                </div>
                ` : ''}
                
                <p style="margin-top: 20px;">
                  ${data.action === "assigned" 
                    ? "Please contact your department manager for onboarding details." 
                    : "Please contact HR if you have any questions."}
                </p>
                
                <div class="footer">
                  <p>This is an automated message from the Employee Portal.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      try {
        await client.send({
          from: gmailUser,
          to: data.employeeEmail,
          subject: `Department ${actionText}: ${data.departmentName}`,
          content: htmlContent,
          html: htmlContent,
        });
        await client.close();
        console.log("Email sent successfully to:", data.employeeEmail);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
