import { supabase } from "@/integrations/supabase/client";

interface LeaveEmailData {
  to: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: "approved" | "rejected";
  reason?: string;
  comments?: string;
}

export async function sendLeaveNotification(data: LeaveEmailData) {
  try {
    const subject = `Leave Request ${data.status === "approved" ? "Approved" : "Rejected"} - ${data.leaveType}`;
    
    const { data: result, error } = await supabase.functions.invoke('send-leave-notification', {
      body: {
        ...data,
        subject,
      },
    });

    if (error) {
      console.error("Error sending email:", error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error("Failed to send email notification:", error);
    throw error;
  }
}
