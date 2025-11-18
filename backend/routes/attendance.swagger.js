/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get user attendance records
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Get today's attendance record
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Today's attendance record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 */

/**
 * @swagger
 * /api/attendance/stats:
 *   get:
 *     summary: Get attendance statistics
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDays:
 *                   type: integer
 *                 present:
 *                   type: integer
 *                 absent:
 *                   type: integer
 *                 late:
 *                   type: integer
 *                 attendanceRate:
 *                   type: integer
 */

/**
 * @swagger
 * /api/attendance/checkin:
 *   post:
 *     summary: Check in for the day
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checked in successfully
 *       400:
 *         description: Already checked in
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/checkout:
 *   post:
 *     summary: Check out for the day
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Checked out successfully
 *       400:
 *         description: Not checked in or already checked out
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/attendance/analytics/stats:
 *   get:
 *     summary: Get attendance analytics statistics
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmployees:
 *                   type: integer
 *                 presentToday:
 *                   type: integer
 *                 absentToday:
 *                   type: integer
 *                 lateToday:
 *                   type: integer
 *                 avgAttendanceRate:
 *                   type: integer
 */

/**
 * @swagger
 * /api/attendance/analytics/departments:
 *   get:
 *     summary: Get department attendance analytics
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Department analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   department:
 *                     type: string
 *                   totalEmployees:
 *                     type: integer
 *                   presentToday:
 *                     type: integer
 *                   attendanceRate:
 *                     type: integer
 */

/**
 * @swagger
 * /api/attendance/analytics/trends:
 *   get:
 *     summary: Get attendance trends
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Attendance trends
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                   totalRecords:
 *                     type: integer
 *                   presentCount:
 *                     type: integer
 *                   attendanceRate:
 *                     type: integer
 */
