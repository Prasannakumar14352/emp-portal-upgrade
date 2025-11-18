/**
 * @swagger
 * /api/payslips/user/{userId}:
 *   get:
 *     summary: Get user payslips
 *     tags: [Payslips]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month
 *     responses:
 *       200:
 *         description: User payslips
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payslip'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only view own payslips
 */

/**
 * @swagger
 * /api/payslips:
 *   post:
 *     summary: Create new payslip (HR only)
 *     tags: [Payslips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - month
 *               - year
 *               - basic_salary
 *               - net_salary
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               month:
 *                 type: string
 *                 example: January
 *               year:
 *                 type: integer
 *                 example: 2024
 *               basic_salary:
 *                 type: number
 *                 format: float
 *                 example: 5000.00
 *               allowances:
 *                 type: number
 *                 format: float
 *                 example: 1000.00
 *               deductions:
 *                 type: number
 *                 format: float
 *                 example: 500.00
 *               net_salary:
 *                 type: number
 *                 format: float
 *                 example: 5500.00
 *               file_url:
 *                 type: string
 *                 example: https://example.com/payslips/jan2024.pdf
 *     responses:
 *       201:
 *         description: Payslip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payslip'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires HR role
 */

/**
 * @swagger
 * /api/payslips/{id}:
 *   get:
 *     summary: Get payslip by ID
 *     tags: [Payslips]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payslip details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payslip'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payslip not found
 *   patch:
 *     summary: Update payslip (HR only)
 *     tags: [Payslips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basic_salary:
 *                 type: number
 *               allowances:
 *                 type: number
 *               deductions:
 *                 type: number
 *               net_salary:
 *                 type: number
 *               file_url:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payslip updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Payslip not found
 */
