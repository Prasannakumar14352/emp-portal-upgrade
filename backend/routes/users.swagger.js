/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (HR/Manager only)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires HR or Manager role
 */

/**
 * @swagger
 * /api/users/{userId}/role:
 *   get:
 *     summary: Get user role
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User role
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: string
 *                   enum: [employee, manager, hr]
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *   patch:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               full_name:
 *                 type: string
 *                 example: John Doe
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               department:
 *                 type: string
 *                 example: Engineering
 *               position:
 *                 type: string
 *                 example: Senior Developer
 *               avatar_url:
 *                 type: string
 *                 example: https://example.com/avatar.jpg
 *               hire_date:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only update own profile
 */

/**
 * @swagger
 * /api/users/with-roles:
 *   get:
 *     summary: Get all users with their roles (HR only)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users with roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   email:
 *                     type: string
 *                   full_name:
 *                     type: string
 *                   department:
 *                     type: string
 *                   position:
 *                     type: string
 *                   roles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role:
 *                           type: string
 *                           enum: [employee, manager, hr]
 *                         role_id:
 *                           type: integer
 *                         role_assigned_at:
 *                           type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires HR role
 */

/**
 * @swagger
 * /api/users/{userId}/roles:
 *   post:
 *     summary: Assign role to user (HR only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [employee, manager, hr]
 *                 example: manager
 *     responses:
 *       201:
 *         description: Role assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 role:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     role:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Role already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/users/roles/{roleId}:
 *   delete:
 *     summary: Remove role from user (HR only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Role assignment ID
 *     responses:
 *       200:
 *         description: Role removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot remove last role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */

/**
 * @swagger
 * /api/users/{userId}/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dark_mode:
 *                   type: boolean
 *                 email_notifications:
 *                   type: boolean
 *                 push_notifications:
 *                   type: boolean
 *                 compact_view:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update user preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *               dark_mode:
 *                 type: boolean
 *               email_notifications:
 *                 type: boolean
 *               push_notifications:
 *                 type: boolean
 *               compact_view:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         description: Unauthorized
 */
