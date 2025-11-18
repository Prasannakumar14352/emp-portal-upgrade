/**
 * @swagger
 * /api/leaves:
 *   get:
 *     summary: Get all leave requests (HR/Manager only)
 *     tags: [Leaves]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Manager Approved, Approved, Rejected]
 *         description: Filter by leave status
 *     responses:
 *       200:
 *         description: List of leave requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires HR or Manager role
 *   post:
 *     summary: Create new leave request
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRequest'
 *     responses:
 *       201:
 *         description: Leave request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Leave'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/leaves/user/{userId}:
 *   get:
 *     summary: Get user's leave requests
 *     tags: [Leaves]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User's leave requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only view own leaves
 */

/**
 * @swagger
 * /api/leaves/{leaveId}:
 *   patch:
 *     summary: Update leave status (Approve/Reject)
 *     tags: [Leaves]
 *     parameters:
 *       - in: path
 *         name: leaveId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Leave request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Manager Approved, Approved, Rejected]
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Leave'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Leave not found
 *   put:
 *     summary: Edit pending leave request (Employee only)
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leaveId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaveRequest'
 *     responses:
 *       200:
 *         description: Leave request updated
 *       400:
 *         description: Cannot edit non-pending leave
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Cancel leave request
 *     tags: [Leaves]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leaveId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Leave cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Leave not found
 */

/**
 * @swagger
 * /api/leaves/balances/{userId}:
 *   get:
 *     summary: Get leave balances for user
 *     tags: [Leaves]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year (defaults to current year)
 *     responses:
 *       200:
 *         description: Leave balances
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeaveBalance'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/leaves/conflicts:
 *   get:
 *     summary: Check for leave conflicts
 *     tags: [Leaves]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conflicting leaves
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Leave'
 */
