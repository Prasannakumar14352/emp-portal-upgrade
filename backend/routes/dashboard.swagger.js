/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: User ID (optional, for user-specific stats)
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmployees:
 *                   type: integer
 *                   example: 150
 *                 presentToday:
 *                   type: integer
 *                   example: 142
 *                 onLeave:
 *                   type: integer
 *                   example: 8
 *                 pendingLeaves:
 *                   type: integer
 *                   example: 5
 *                 upcomingHolidays:
 *                   type: integer
 *                   example: 3
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/dashboard/recent-leaves:
 *   get:
 *     summary: Get recent leave requests
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent leaves to return
 *     responses:
 *       200:
 *         description: Recent leave requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/dashboard/upcoming-holidays:
 *   get:
 *     summary: Get upcoming holidays
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *         description: Number of days to look ahead
 *     responses:
 *       200:
 *         description: Upcoming holidays
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Holiday'
 *       401:
 *         description: Unauthorized
 */
