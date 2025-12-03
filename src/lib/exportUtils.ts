import jsPDF from "jspdf";
import * as XLSX from "xlsx";

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

// Statistics export interfaces
export interface StatisticsData {
  employeeStats?: {
    leave_stats: {
      total_leaves: number;
      pending_leaves: number;
      approved_leaves: number;
      rejected_leaves: number;
      total_days_taken: number;
    };
    balance_stats: {
      total_allocated: number;
      total_used: number;
      total_remaining: number;
      total_carry_forward: number;
    };
    leave_type_breakdown: Array<{
      leave_type: string;
      count: number;
      total_days: number;
    }>;
    monthly_trends: Array<{
      month: number;
      month_name: string;
      leave_count: number;
      days_taken: number;
    }>;
  };
  attendanceStats?: {
    total_working_days: number;
    present_days: number;
    leave_days: number;
    leave_count: number;
    attendance_rate: number;
    period: {
      start_date: string;
      end_date: string;
    };
  };
}

export const exportStatisticsToExcel = (data: StatisticsData, filename: string = "statistics-report.xlsx") => {
  const workbook = XLSX.utils.book_new();

  // Leave Statistics Sheet
  if (data.employeeStats) {
    const leaveStatsData = [
      ["Leave Statistics Summary", ""],
      ["Metric", "Value"],
      ["Total Leaves", data.employeeStats.leave_stats.total_leaves],
      ["Pending Leaves", data.employeeStats.leave_stats.pending_leaves],
      ["Approved Leaves", data.employeeStats.leave_stats.approved_leaves],
      ["Rejected Leaves", data.employeeStats.leave_stats.rejected_leaves],
      ["Total Days Taken", data.employeeStats.leave_stats.total_days_taken],
      [""],
      ["Balance Summary", ""],
      ["Total Allocated", data.employeeStats.balance_stats.total_allocated],
      ["Total Used", data.employeeStats.balance_stats.total_used],
      ["Total Remaining", data.employeeStats.balance_stats.total_remaining],
      ["Carry Forward", data.employeeStats.balance_stats.total_carry_forward],
    ];

    const leaveStatsSheet = XLSX.utils.aoa_to_sheet(leaveStatsData);
    XLSX.utils.book_append_sheet(workbook, leaveStatsSheet, "Leave Summary");

    // Leave Type Breakdown
    if (data.employeeStats.leave_type_breakdown.length > 0) {
      const breakdownData = [
        ["Leave Type Breakdown", "", ""],
        ["Leave Type", "Count", "Total Days"],
        ...data.employeeStats.leave_type_breakdown.map(item => [
          item.leave_type,
          item.count,
          item.total_days
        ])
      ];
      const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownData);
      XLSX.utils.book_append_sheet(workbook, breakdownSheet, "Leave Types");
    }

    // Monthly Trends
    if (data.employeeStats.monthly_trends.length > 0) {
      const trendsData = [
        ["Monthly Leave Trends", "", ""],
        ["Month", "Leave Count", "Days Taken"],
        ...data.employeeStats.monthly_trends.map(item => [
          item.month_name,
          item.leave_count,
          item.days_taken
        ])
      ];
      const trendsSheet = XLSX.utils.aoa_to_sheet(trendsData);
      XLSX.utils.book_append_sheet(workbook, trendsSheet, "Monthly Trends");
    }
  }

  // Attendance Statistics Sheet
  if (data.attendanceStats) {
    const attendanceData = [
      ["Attendance Statistics", ""],
      ["Period", `${new Date(data.attendanceStats.period.start_date).toLocaleDateString()} - ${new Date(data.attendanceStats.period.end_date).toLocaleDateString()}`],
      [""],
      ["Metric", "Value"],
      ["Total Working Days", data.attendanceStats.total_working_days],
      ["Present Days", data.attendanceStats.present_days],
      ["Leave Days", data.attendanceStats.leave_days],
      ["Leave Count", data.attendanceStats.leave_count],
      ["Attendance Rate", `${data.attendanceStats.attendance_rate}%`],
    ];

    const attendanceSheet = XLSX.utils.aoa_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, "Attendance");
  }

  XLSX.writeFile(workbook, filename);
};

export const exportStatisticsToPDF = (data: StatisticsData, filename: string = "statistics-report.pdf") => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  doc.setFontSize(20);
  doc.text("Employee Statistics Report", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  // Generated date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 15;

  // Leave Statistics
  if (data.employeeStats) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Leave Statistics Summary", 15, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const leaveStats = [
      `Total Leaves: ${data.employeeStats.leave_stats.total_leaves}`,
      `Pending: ${data.employeeStats.leave_stats.pending_leaves}`,
      `Approved: ${data.employeeStats.leave_stats.approved_leaves}`,
      `Rejected: ${data.employeeStats.leave_stats.rejected_leaves}`,
      `Total Days Taken: ${data.employeeStats.leave_stats.total_days_taken}`,
    ];

    leaveStats.forEach(stat => {
      doc.text(stat, 20, yPosition);
      yPosition += 6;
    });

    yPosition += 5;

    // Balance Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Balance Summary", 15, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const balanceStats = [
      `Total Allocated: ${data.employeeStats.balance_stats.total_allocated} days`,
      `Total Used: ${data.employeeStats.balance_stats.total_used} days`,
      `Total Remaining: ${data.employeeStats.balance_stats.total_remaining} days`,
      `Carry Forward: ${data.employeeStats.balance_stats.total_carry_forward} days`,
    ];

    balanceStats.forEach(stat => {
      doc.text(stat, 20, yPosition);
      yPosition += 6;
    });

    yPosition += 10;

    // Leave Type Breakdown
    if (data.employeeStats.leave_type_breakdown.length > 0) {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Leave Type Breakdown", 15, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      data.employeeStats.leave_type_breakdown.forEach(item => {
        doc.text(`${item.leave_type}: ${item.count} requests (${item.total_days} days)`, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 10;
    }
  }

  // Attendance Statistics
  if (data.attendanceStats) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Attendance Statistics", 15, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Period: ${new Date(data.attendanceStats.period.start_date).toLocaleDateString()} - ${new Date(data.attendanceStats.period.end_date).toLocaleDateString()}`,
      20,
      yPosition
    );
    yPosition += 10;

    const attendanceStats = [
      `Total Working Days: ${data.attendanceStats.total_working_days}`,
      `Present Days: ${data.attendanceStats.present_days}`,
      `Leave Days: ${data.attendanceStats.leave_days}`,
      `Leave Count: ${data.attendanceStats.leave_count}`,
      `Attendance Rate: ${data.attendanceStats.attendance_rate}%`,
    ];

    attendanceStats.forEach(stat => {
      doc.text(stat, 20, yPosition);
      yPosition += 6;
    });
  }

  doc.save(filename);
};
