import jsPDF from "jspdf";

export interface LeaveRequest {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  appliedDate: string;
  comments?: { author: string; text: string; timestamp: string }[];
}

export const exportToCSV = (data: LeaveRequest[], filename: string = "leave-requests.csv") => {
  const headers = ["Employee", "Leave Type", "Start Date", "End Date", "Days", "Status", "Applied Date", "Reason"];
  
  const csvContent = [
    headers.join(","),
    ...data.map(row => [
      `"${row.employeeName}"`,
      `"${row.leaveType}"`,
      row.startDate,
      row.endDate,
      row.days,
      row.status,
      row.appliedDate,
      `"${row.reason.replace(/"/g, '""')}"` // Escape quotes
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: LeaveRequest[], filename: string = "leave-requests.pdf") => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  doc.setFontSize(18);
  doc.text("Leave Requests Report", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  // Generated date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Table data
  data.forEach((request, index) => {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${request.employeeName}`, 15, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Leave Type: ${request.leaveType}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Duration: ${request.startDate} to ${request.endDate} (${request.days} days)`, 20, yPosition);
    yPosition += 6;
    doc.text(`Status: ${request.status}`, 20, yPosition);
    yPosition += 6;
    doc.text(`Applied: ${request.appliedDate}`, 20, yPosition);
    yPosition += 6;
    
    // Wrap reason text
    const reasonLines = doc.splitTextToSize(`Reason: ${request.reason}`, pageWidth - 40);
    doc.text(reasonLines, 20, yPosition);
    yPosition += (reasonLines.length * 6) + 10;
  });

  doc.save(filename);
};

export const sendMockEmail = (to: string, subject: string, body: string) => {
  const email = {
    id: Date.now().toString(),
    to,
    subject,
    body,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const existingEmails = JSON.parse(localStorage.getItem("mockEmails") || "[]");
  localStorage.setItem("mockEmails", JSON.stringify([email, ...existingEmails]));

  // Also add to notifications
  const notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
  notifications.unshift({
    id: Date.now(),
    type: "email",
    title: subject,
    message: body,
    time: "Just now",
    read: false,
  });
  localStorage.setItem("notifications", JSON.stringify(notifications));
};

export const getEmailTemplate = (type: "approved" | "rejected", employeeName: string, leaveType: string, startDate: string, endDate: string, reason?: string) => {
  if (type === "approved") {
    return {
      subject: `Leave Request Approved - ${leaveType}`,
      body: `Dear ${employeeName},

Your leave request has been approved!

Leave Details:
- Type: ${leaveType}
- Duration: ${startDate} to ${endDate}

Please ensure all your work is properly handed over before your leave begins.

Best regards,
HR Department`
    };
  } else {
    return {
      subject: `Leave Request Rejected - ${leaveType}`,
      body: `Dear ${employeeName},

We regret to inform you that your leave request has been rejected.

Leave Details:
- Type: ${leaveType}
- Duration: ${startDate} to ${endDate}

${reason ? `Reason: ${reason}` : ''}

Please contact HR if you have any questions or would like to discuss alternative dates.

Best regards,
HR Department`
    };
  }
};
