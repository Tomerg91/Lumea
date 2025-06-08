import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControl,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
  Block as BlockIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { consentService, ConsentResponse, ConsentMetrics } from '../services/consentService';

interface ConsentType {
  id: string;
  name: string;
  description: string;
  category: 'essential' | 'functional' | 'analytics' | 'marketing' | 'hipaa_treatment' | 'hipaa_payment' | 'hipaa_operations';
  isRequired: boolean;
  dataProcessed: string[];
  purpose: string;
  retentionPeriod: number;
  status?: 'granted' | 'denied' | 'withdrawn' | 'expired';
  grantedAt?: string;
  expiresAt?: string;
  daysUntilExpiration?: number | null;
}

const ConsentManagement: React.FC = () => {
  const [consents, setConsents] = useState<ConsentResponse[]>([]);
  const [consentHistory, setConsentHistory] = useState<ConsentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [selectedConsent, setSelectedConsent] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const consentTypes: ConsentType[] = [
    {
      id: 'data_processing',
      name: 'Data Processing',
      description: 'Required consent for processing your personal data to provide our services.',
      category: 'essential',
      isRequired: true,
      dataProcessed: ['personal_information', 'account_data', 'usage_data'],
      purpose: 'Core platform functionality and service delivery',
      retentionPeriod: 2555 // ~7 years
    },
    {
      id: 'hipaa_authorization',
      name: 'HIPAA Authorization',
      description: 'Authorization for the use and disclosure of your protected health information.',
      category: 'hipaa_treatment',
      isRequired: true,
      dataProcessed: ['medical_records', 'treatment_plans', 'health_data'],
      purpose: 'Treatment, payment, and healthcare operations',
      retentionPeriod: 2555 // ~7 years
    },
    {
      id: 'cookies',
      name: 'Cookie Consent',
      description: 'Consent for using cookies to enhance your user experience.',
      category: 'functional',
      isRequired: false,
      dataProcessed: ['browsing_behavior', 'preferences', 'session_data'],
      purpose: 'Website functionality and user experience improvement',
      retentionPeriod: 365
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Help us improve our website by allowing us to collect anonymous usage data.',
      category: 'analytics',
      isRequired: false,
      dataProcessed: ['page_views', 'user_interactions', 'performance_metrics'],
      purpose: 'Website analytics and performance monitoring',
      retentionPeriod: 730
    },
    {
      id: 'marketing',
      name: 'Marketing Communications',
      description: 'Receive updates about our services and special offers.',
      category: 'marketing',
      isRequired: false,
      dataProcessed: ['email_address', 'preferences', 'interaction_history'],
      purpose: 'Sending promotional emails and marketing materials',
      retentionPeriod: 1095
    }
  ];

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      setLoading(true);
      const [userConsents, history] = await Promise.all([
        consentService.getUserConsents(),
        consentService.getConsentHistory()
      ]);
      setConsents(userConsents);
      setConsentHistory(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load consent data');
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatus = (consentId: string): ConsentResponse | undefined => {
    return consents.find(c => c.consentType === consentId && c.status === 'granted');
  };

  const handleConsentToggle = async (consentId: string, granted: boolean) => {
    try {
      setError(null);
      
      if (granted) {
        // Grant consent
        const consentType = consentTypes.find(ct => ct.id === consentId);
        if (!consentType) return;

        const evidenceOfConsent = consentService.createEvidenceOfConsent(
          `User granted ${consentType.name} consent via privacy dashboard`,
          { [consentId]: true }
        );

        await consentService.grantConsent({
          consentType: consentId,
          purpose: consentType.purpose,
          category: consentType.category,
          legalBasis: 'consent',
          isRequired: consentType.isRequired,
          dataProcessed: consentType.dataProcessed,
          retentionPeriod: consentType.retentionPeriod,
          evidenceOfConsent
        });

        setSuccess(`${consentType.name} consent granted successfully`);
      } else {
        // Check if it's a required consent
        const consentType = consentTypes.find(ct => ct.id === consentId);
        if (consentType?.isRequired) {
          setError('This consent is required and cannot be withdrawn');
          return;
        }

        // Withdraw consent
        await consentService.withdrawConsent(consentId, 'User withdrew consent via privacy dashboard');
        setSuccess(`${consentType?.name || 'Consent'} withdrawn successfully`);
      }

      await loadConsents();
    } catch (err: any) {
      setError(err.message || 'Failed to update consent');
    }
  };

  const handleWithdrawAll = async () => {
    try {
      setError(null);
      await consentService.withdrawAllConsents(withdrawReason || 'User requested withdrawal of all consents');
      setWithdrawDialogOpen(false);
      setWithdrawReason('');
      setSuccess('All non-essential consents have been withdrawn');
      await loadConsents();
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw consents');
    }
  };

  const handleExportData = async (format: 'json' | 'xml' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      setError(null);
      await consentService.exportUserData(format, true);
      setSuccess(`Data export in ${format.toUpperCase()} format has been downloaded`);
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    } finally {
      setExportLoading(false);
    }
  };

  const getCategoryColor = (category: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    switch (category) {
      case 'essential': return 'error';
      case 'hipaa_treatment':
      case 'hipaa_payment':
      case 'hipaa_operations': return 'warning';
      case 'functional': return 'primary';
      case 'analytics': return 'info';
      case 'marketing': return 'secondary';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilExpiration = (expiresAt?: string): number | null => {
    if (!expiresAt) return null;
    const expirationDate = new Date(expiresAt);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <SecurityIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Privacy & Consent Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your consent preferences and view your data processing authorizations.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Consent Controls */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consent Preferences
              </Typography>
              
              {consentTypes.map((consentType) => {
                const userConsent = getConsentStatus(consentType.id);
                const isGranted = Boolean(userConsent);
                const daysUntilExpiration = userConsent?.expiresAt ? 
                  getDaysUntilExpiration(userConsent.expiresAt) : null;

                return (
                  <Accordion key={consentType.id} sx={{ mb: 1 }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      sx={{
                        backgroundColor: consentType.isRequired ? 'rgba(244, 67, 54, 0.05)' : 'inherit'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                            {consentType.name}
                            {consentType.isRequired && (
                              <Chip
                                label="Required"
                                size="small"
                                color="error"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {consentType.description}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {/* Expiration warning */}
                          {daysUntilExpiration !== null && daysUntilExpiration <= 30 && (
                            <Tooltip title={`Expires in ${daysUntilExpiration} days`}>
                              <WarningIcon color="warning" />
                            </Tooltip>
                          )}
                          
                          {/* Status indicator */}
                          {isGranted ? (
                            <CheckIcon color="success" />
                          ) : (
                            <BlockIcon color="error" />
                          )}
                          
                          {/* Toggle switch */}
                          <FormControlLabel
                            control={
                              <Switch
                                checked={isGranted}
                                onChange={(e) => handleConsentToggle(consentType.id, e.target.checked)}
                                disabled={consentType.isRequired && isGranted}
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                        </Box>
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Category:</strong>
                          </Typography>
                          <Chip
                            label={consentType.category}
                            color={getCategoryColor(consentType.category)}
                            size="small"
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Purpose:</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {consentType.purpose}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Data Processed:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {consentType.dataProcessed.map((data) => (
                              <Chip
                                key={data}
                                label={data.replace(/_/g, ' ')}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Retention Period:</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {Math.floor(consentType.retentionPeriod / 365)} years ({consentType.retentionPeriod} days)
                          </Typography>
                        </Grid>
                        
                        {userConsent && (
                          <>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" gutterBottom>
                                <strong>Granted:</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(userConsent.grantedAt)}
                              </Typography>
                            </Grid>
                            
                            {userConsent.expiresAt && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" gutterBottom>
                                  <strong>Expires:</strong>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(userConsent.expiresAt)}
                                  {daysUntilExpiration !== null && (
                                    <span> ({daysUntilExpiration} days remaining)</span>
                                  )}
                                </Typography>
                              </Grid>
                            )}
                          </>
                        )}
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </CardContent>
          </Card>
        </Grid>

        {/* Actions Sidebar */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Rights
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="Export My Data"
                    secondary="Download a copy of your personal data (GDPR Article 20)"
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      onClick={() => handleExportData('json')}
                      disabled={exportLoading}
                    >
                      {exportLoading ? <CircularProgress size={24} /> : <DownloadIcon />}
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemText
                    primary="Consent History"
                    secondary="View your complete consent history"
                  />
                  <ListItemSecondaryAction>
                    <IconButton onClick={() => setHistoryDialogOpen(true)}>
                      <HistoryIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemText
                    primary="Withdraw All"
                    secondary="Exercise your right to be forgotten (where legally permitted)"
                  />
                  <ListItemSecondaryAction>
                    <Button
                      color="error"
                      variant="outlined"
                      size="small"
                      onClick={() => setWithdrawDialogOpen(true)}
                    >
                      Withdraw
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Quick Export Options */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Export
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleExportData('json')}
                  disabled={exportLoading}
                  fullWidth
                >
                  Export as JSON
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleExportData('csv')}
                  disabled={exportLoading}
                  fullWidth
                >
                  Export as CSV
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleExportData('xml')}
                  disabled={exportLoading}
                  fullWidth
                >
                  Export as XML
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Withdraw All Dialog */}
      <Dialog
        open={withdrawDialogOpen}
        onClose={() => setWithdrawDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Withdraw All Consents</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              This action will withdraw all non-essential consents. Required consents for core 
              platform functionality and legal compliance cannot be withdrawn while using our services.
            </Typography>
          </Alert>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for withdrawal (optional)"
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleWithdrawAll} color="error" variant="contained">
            Withdraw All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Consent History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Consent History</DialogTitle>
        <DialogContent>
          <List>
            {consentHistory.map((consent) => (
              <ListItem key={`${consent.id}-${consent.grantedAt}`}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {consent.consentType.replace(/_/g, ' ')}
                      </Typography>
                      <Chip
                        label={consent.status}
                        size="small"
                        color={
                          consent.status === 'granted' ? 'success' :
                          consent.status === 'withdrawn' ? 'error' :
                          consent.status === 'expired' ? 'warning' : 'default'
                        }
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {consent.purpose}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {consent.status === 'granted' ? 'Granted' : 
                         consent.status === 'withdrawn' ? 'Withdrawn' : 'Updated'}: {formatDate(consent.grantedAt)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsentManagement; 