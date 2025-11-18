/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: Get all holidays
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [public, optional, restricted]
 *         description: Filter by holiday type
 *     responses:
 *       200:
 *         description: List of holidays
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Holiday'
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create new holiday (HR/Manager only)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: New Year's Day
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-01
 *               type:
 *                 type: string
 *                 enum: [public, optional, restricted]
 *                 example: public
 *               description:
 *                 type: string
 *                 example: Public holiday for New Year
 *     responses:
 *       201:
 *         description: Holiday created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Holiday'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires HR or Manager role
 */

/**
 * @swagger
 * /api/holidays/{id}:
 *   get:
 *     summary: Get holiday by ID
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Holiday details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Holiday'
 *       404:
 *         description: Holiday not found
 *   patch:
 *     summary: Update holiday (HR/Manager only)
 *     tags: [Holidays]
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
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [public, optional, restricted]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Holiday updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Holiday'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Holiday not found
 *   delete:
 *     summary: Delete holiday (HR/Manager only)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Holiday not found
 */

/**
 * @swagger
 * /api/holidays/upcoming:
 *   get:
 *     summary: Get upcoming holidays
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
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
 */
