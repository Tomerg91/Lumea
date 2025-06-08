import express from 'express';
import { body, param, query } from 'express-validator';
import { DataRetentionController } from '../controllers/dataRetentionController';
import { isAuthenticated, hasRole } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const dataRetentionController = new DataRetentionController();

// Rate limiting for data retention operations
const dataRetentionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many data retention requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for execution operations
const executionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 executions per hour
  message: {
    success: false,
    message: 'Too many policy executions from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and admin role requirement to all routes
router.use(isAuthenticated);
router.use(hasRole('admin', 'data_protection_officer'));

// Validation schemas
const createPolicyValidation = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('description')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be 1-500 characters'),
  body('dataType')
    .isIn([
      'user', 'session', 'reflection', 'coach_note', 'audit_log',
      'notification', 'feedback', 'file', 'session_history',
      'consent', 'encryption_key', 'password_reset_token',
      'invite_token', 'session_timing', 'coach_availability'
    ])
    .withMessage('Invalid data type'),
  body('modelName')
    .isIn([
      'User', 'Session', 'Reflection', 'CoachNote', 'AuditLog',
      'Notification', 'SessionFeedback', 'File', 'SessionHistory',
      'Consent', 'EncryptionKey', 'PasswordResetToken',
      'InviteToken', 'SessionTiming', 'CoachAvailability'
    ])
    .withMessage('Invalid model name'),
  body('category')
    .isIn(['personal_data', 'medical_data', 'financial_data', 'system_data', 'audit_data'])
    .withMessage('Invalid category'),
  body('retentionPeriod.value')
    .isInt({ min: 1 })
    .withMessage('Retention period value must be a positive integer'),
  body('retentionPeriod.unit')
    .isIn(['days', 'months', 'years'])
    .withMessage('Retention period unit must be days, months, or years'),
  body('deletionMethod')
    .isIn(['soft_delete', 'hard_delete', 'anonymize', 'archive'])
    .withMessage('Invalid deletion method'),
  body('complianceRequirements.hipaaMinimum')
    .optional()
    .isInt({ min: 1 })
    .withMessage('HIPAA minimum must be a positive integer'),
  body('schedulePattern')
    .optional()
    .isString()
    .withMessage('Schedule pattern must be a valid cron expression'),
];

const updatePolicyValidation = [
  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be 1-500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('retentionPeriod.value')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Retention period value must be a positive integer'),
  body('deletionMethod')
    .optional()
    .isIn(['soft_delete', 'hard_delete', 'anonymize', 'archive'])
    .withMessage('Invalid deletion method'),
];

const legalHoldValidation = [
  body('dataType')
    .isString()
    .withMessage('Data type is required'),
  body('recordIds')
    .isArray({ min: 1 })
    .withMessage('Record IDs must be a non-empty array'),
  body('recordIds.*')
    .isString()
    .withMessage('Each record ID must be a string'),
  body('reason')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be 10-500 characters'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid date'),
];

// Policy Management Routes

/**
 * @route   GET /api/data-retention/policies
 * @desc    Get all data retention policies with filtering
 * @access  Admin/DPO
 */
router.get('/policies', 
  dataRetentionLimiter,
  [
    query('active').optional().isBoolean().withMessage('Active must be a boolean'),
    query('dataType').optional().isString().withMessage('Data type must be a string'),
    query('category').optional().isIn(['personal_data', 'medical_data', 'financial_data', 'system_data', 'audit_data']),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  ],
  dataRetentionController.getPolicies
);

/**
 * @route   GET /api/data-retention/policies/:policyId
 * @desc    Get a specific data retention policy
 * @access  Admin/DPO
 */
router.get('/policies/:policyId',
  dataRetentionLimiter,
  [
    param('policyId').isMongoId().withMessage('Invalid policy ID'),
    query('includeExecutionHistory').optional().isBoolean()
  ],
  dataRetentionController.getPolicy
);

/**
 * @route   POST /api/data-retention/policies
 * @desc    Create a new data retention policy
 * @access  Admin/DPO
 */
router.post('/policies',
  dataRetentionLimiter,
  createPolicyValidation,
  dataRetentionController.createPolicy
);

/**
 * @route   PUT /api/data-retention/policies/:policyId
 * @desc    Update an existing data retention policy
 * @access  Admin/DPO
 */
router.put('/policies/:policyId',
  dataRetentionLimiter,
  [
    param('policyId').isMongoId().withMessage('Invalid policy ID'),
    ...updatePolicyValidation
  ],
  dataRetentionController.updatePolicy
);

/**
 * @route   DELETE /api/data-retention/policies/:policyId
 * @desc    Deactivate a data retention policy
 * @access  Admin/DPO
 */
router.delete('/policies/:policyId',
  dataRetentionLimiter,
  [param('policyId').isMongoId().withMessage('Invalid policy ID')],
  dataRetentionController.deletePolicy
);

// Policy Execution Routes

/**
 * @route   GET /api/data-retention/policies/:policyId/preview
 * @desc    Preview what would be deleted by a policy
 * @access  Admin/DPO
 */
router.get('/policies/:policyId/preview',
  dataRetentionLimiter,
  [param('policyId').isMongoId().withMessage('Invalid policy ID')],
  dataRetentionController.previewPolicyExecution
);

/**
 * @route   POST /api/data-retention/policies/:policyId/execute
 * @desc    Execute a specific data retention policy
 * @access  Admin/DPO
 */
router.post('/policies/:policyId/execute',
  executionLimiter,
  [
    param('policyId').isMongoId().withMessage('Invalid policy ID'),
    body('dryRun').optional().isBoolean().withMessage('Dry run must be a boolean'),
    body('executionMethod').optional().isIn(['manual', 'emergency']).withMessage('Invalid execution method')
  ],
  dataRetentionController.executePolicy
);

/**
 * @route   POST /api/data-retention/execute-scheduled
 * @desc    Execute all scheduled policies
 * @access  Admin/DPO
 */
router.post('/execute-scheduled',
  executionLimiter,
  dataRetentionController.executeScheduledPolicies
);

/**
 * @route   GET /api/data-retention/policies/:policyId/history
 * @desc    Get execution history for a policy
 * @access  Admin/DPO
 */
router.get('/policies/:policyId/history',
  dataRetentionLimiter,
  [
    param('policyId').isMongoId().withMessage('Invalid policy ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  dataRetentionController.getPolicyExecutionHistory
);

// Reporting Routes

/**
 * @route   GET /api/data-retention/report
 * @desc    Generate comprehensive retention report
 * @access  Admin/DPO
 */
router.get('/report',
  dataRetentionLimiter,
  dataRetentionController.generateRetentionReport
);

/**
 * @route   GET /api/data-retention/health
 * @desc    Get system health status for data retention
 * @access  Admin/DPO
 */
router.get('/health',
  dataRetentionLimiter,
  dataRetentionController.getSystemHealth
);

// Deletion Certificate Routes

/**
 * @route   GET /api/data-retention/certificates
 * @desc    Get deletion certificates with filtering
 * @access  Admin/DPO
 */
router.get('/certificates',
  dataRetentionLimiter,
  [
    query('policyId').optional().isString(),
    query('dataType').optional().isString(),
    query('status').optional().isIn(['completed', 'partial', 'failed', 'verified', 'disputed']),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  dataRetentionController.getDeletionCertificates
);

/**
 * @route   GET /api/data-retention/certificates/:certificateId
 * @desc    Get a specific deletion certificate
 * @access  Admin/DPO
 */
router.get('/certificates/:certificateId',
  dataRetentionLimiter,
  [param('certificateId').isString().withMessage('Certificate ID is required')],
  dataRetentionController.getDeletionCertificate
);

/**
 * @route   GET /api/data-retention/certificates/:certificateId/download
 * @desc    Download deletion certificate as text report
 * @access  Admin/DPO
 */
router.get('/certificates/:certificateId/download',
  dataRetentionLimiter,
  [param('certificateId').isString().withMessage('Certificate ID is required')],
  dataRetentionController.downloadCertificate
);

/**
 * @route   POST /api/data-retention/certificates/:certificateId/verify
 * @desc    Verify deletion certificate integrity
 * @access  Admin/DPO
 */
router.post('/certificates/:certificateId/verify',
  dataRetentionLimiter,
  [param('certificateId').isString().withMessage('Certificate ID is required')],
  dataRetentionController.verifyCertificate
);

// Legal Hold Routes

/**
 * @route   POST /api/data-retention/legal-hold
 * @desc    Set legal hold on specific records
 * @access  Admin/DPO
 */
router.post('/legal-hold',
  dataRetentionLimiter,
  legalHoldValidation,
  dataRetentionController.setLegalHold
);

/**
 * @route   DELETE /api/data-retention/legal-hold
 * @desc    Remove legal hold from specific records
 * @access  Admin/DPO
 */
router.delete('/legal-hold',
  dataRetentionLimiter,
  [
    body('dataType').isString().withMessage('Data type is required'),
    body('recordIds').isArray({ min: 1 }).withMessage('Record IDs must be a non-empty array'),
    body('reason').isString().isLength({ min: 10, max: 500 }).withMessage('Reason must be 10-500 characters')
  ],
  dataRetentionController.removeLegalHold
);

// Template Routes for Common Policies

/**
 * @route   GET /api/data-retention/templates
 * @desc    Get predefined policy templates
 * @access  Admin/DPO
 */
router.get('/templates', dataRetentionLimiter, (req, res) => {
  const templates = [
    {
      id: 'hipaa_medical_data',
      name: 'HIPAA Medical Data Retention',
      description: 'Standard 7-year retention for medical data per HIPAA requirements',
      category: 'medical_data',
      retentionPeriod: { value: 7, unit: 'years' },
      deletionMethod: 'hard_delete',
      secureWipe: true,
      complianceRequirements: {
        hipaaMinimum: 2555, // 7 years
        legalBasisRequired: true,
        auditTrailRetention: 3650 // 10 years
      }
    },
    {
      id: 'gdpr_personal_data',
      name: 'GDPR Personal Data Retention',
      description: 'Standard retention for personal data per GDPR requirements',
      category: 'personal_data',
      retentionPeriod: { value: 3, unit: 'years' },
      deletionMethod: 'anonymize',
      secureWipe: false,
      complianceRequirements: {
        gdprMaximum: 1095, // 3 years
        legalBasisRequired: true,
        auditTrailRetention: 2190 // 6 years
      }
    },
    {
      id: 'audit_log_retention',
      name: 'Audit Log Retention',
      description: 'Standard 6-year retention for audit logs',
      category: 'audit_data',
      retentionPeriod: { value: 6, unit: 'years' },
      deletionMethod: 'archive',
      secureWipe: false,
      complianceRequirements: {
        hipaaMinimum: 2190, // 6 years
        auditTrailRetention: 3650 // 10 years
      }
    },
    {
      id: 'session_data_retention',
      name: 'Session Data Retention',
      description: 'Standard 2-year retention for session history and timing data',
      category: 'system_data',
      retentionPeriod: { value: 2, unit: 'years' },
      deletionMethod: 'hard_delete',
      secureWipe: true,
      complianceRequirements: {
        auditTrailRetention: 1460 // 4 years
      }
    },
    {
      id: 'notification_cleanup',
      name: 'Notification Cleanup',
      description: 'Cleanup old notifications after 1 year',
      category: 'system_data',
      retentionPeriod: { value: 1, unit: 'years' },
      deletionMethod: 'soft_delete',
      secureWipe: false,
      complianceRequirements: {
        auditTrailRetention: 730 // 2 years
      }
    }
  ];

  res.json({
    success: true,
    data: templates
  });
});

/**
 * @route   POST /api/data-retention/templates/:templateId/apply
 * @desc    Create a policy from a template
 * @access  Admin/DPO
 */
router.post('/templates/:templateId/apply',
  dataRetentionLimiter,
  [
    param('templateId').isString().withMessage('Template ID is required'),
    body('dataType').isString().withMessage('Data type is required'),
    body('modelName').isString().withMessage('Model name is required'),
    body('name').optional().isString(),
    body('overrides').optional().isObject()
  ],
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const { dataType, modelName, name, overrides = {} } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // This would typically fetch the template from the templates array above
      // For now, we'll create a basic policy
      const policyData = {
        name: name || `${templateId.replace(/_/g, ' ').toUpperCase()} - ${dataType}`,
        description: `Auto-generated policy from ${templateId} template for ${dataType}`,
        dataType,
        modelName,
        category: 'system_data',
        retentionPeriod: { value: 1, unit: 'years' },
        deletionMethod: 'soft_delete',
        ...overrides
      };

             // Create policy through controller method instead of direct service access
       const mockReq = { body: policyData, user: { id: userId } } as any;
       const mockRes = {
         status: (code: number) => ({ json: (data: any) => data }),
         json: (data: any) => data
       } as any;
       
       await dataRetentionController.createPolicy(mockReq, mockRes);
       const policy = mockRes.json().data;

      res.status(201).json({
        success: true,
        message: 'Policy created from template successfully',
        data: policy
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create policy from template',
        error: error.message
      });
    }
  }
);

export default router; 