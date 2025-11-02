import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, DollarSign, Key, Video, Package, Link as LinkIcon, Smartphone, ShieldX, Mail, Info, Languages, Plus, Trash2, Download, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSettings() {
  const { toast } = useToast();
  const { canManageSettings, isDemoMode } = usePermissions();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const { data: settingsData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/settings'],
  });

  const settings = settingsData?.data || settingsData;

  // Helper function to mask sensitive keys in demo mode
  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '••••••••••••••••';
    return `${key.substring(0, 4)}${'•'.repeat(12)}${key.substring(key.length - 4)}`;
  };

  const [formData, setFormData] = useState({
    app_name: '',
    seo_title: '',
    commission: '',
    stripe_fee: '',
    extra_charges: '',
    currency: '$',
    support_email: '',
    forceUpdate: false,
    demoMode: false,
    seller_auto_approve: true,
    appVersion: '',
    androidVersion: '',
    iosVersion: '',
    privacy_url: '',
    terms_url: '',
    FIREBASE_API_KEY: '',
    shippo_api_key: '',
    stripeSecretKey: '',
    stripepublickey: '',
    stripe_webhook_key: '',
    stripe_connect_account: '',
    livekit_url: '',
    livekit_api_key: '',
    livekit_api_secret: '',
    email_service_provider: 'sendgrid',
    email_api_key: '',
    email_from_address: '',
    email_from_name: '',
    email_reply_to: '',
    email_mailgun_domain: '',
    email_smtp_host: '',
    email_smtp_port: '',
    email_smtp_user: '',
    email_smtp_pass: '',
    primary_color: '',
    secondary_color: '',
    app_logo: '',
  });

  // Update form data when settings load from API
  useEffect(() => {
    setFormData({
      app_name: settings?.app_name || '',
      seo_title: settings?.seo_title || '',
      commission: settings?.commission || '',
      stripe_fee: settings?.stripe_fee || '',
      extra_charges: settings?.extra_charges || '',
      currency: settings?.currency || '$',
      support_email: settings?.support_email || '',
      forceUpdate: settings?.forceUpdate || false,
      demoMode: settings?.demoMode || false,
      seller_auto_approve: settings?.seller_auto_approve !== undefined ? settings.seller_auto_approve : true,
      appVersion: settings?.appVersion || '',
      androidVersion: settings?.androidVersion || '',
      iosVersion: settings?.iosVersion || '',
      privacy_url: settings?.privacy_url || '',
      terms_url: settings?.terms_url || '',
      FIREBASE_API_KEY: settings?.FIREBASE_API_KEY || '',
      shippo_api_key: settings?.shippo_api_key || '',
      stripeSecretKey: settings?.stripeSecretKey || '',
      stripepublickey: settings?.stripepublickey || '',
      stripe_webhook_key: settings?.stripe_webhook_key || '',
      stripe_connect_account: settings?.stripe_connect_account || '',
      livekit_url: settings?.livekit_url || '',
      livekit_api_key: settings?.livekit_api_key || '',
      livekit_api_secret: settings?.livekit_api_secret || '',
      email_service_provider: settings?.email_service_provider || 'sendgrid',
      email_api_key: settings?.email_api_key || '',
      email_from_address: settings?.email_from_address || '',
      email_from_name: settings?.email_from_name || '',
      email_reply_to: settings?.email_reply_to || '',
      email_mailgun_domain: settings?.email_mailgun_domain || '',
      email_smtp_host: settings?.email_smtp_host || '',
      email_smtp_port: settings?.email_smtp_port || '',
      email_smtp_user: settings?.email_smtp_user || '',
      email_smtp_pass: settings?.email_smtp_pass || '',
      primary_color: settings?.primary_color || 'FFFACC15',
      secondary_color: settings?.secondary_color || 'FF0D9488',
      app_logo: settings?.app_logo || '',
    });
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Settings update failed:', errorData);
        throw new Error(errorData?.error || 'Failed to update settings');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      toast({
        title: "Settings updated",
        description: "Platform settings have been saved successfully.",
      });
      setIsSaving(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    if (!canManageSettings) {
      toast({
        title: "Action not allowed",
        description: "Settings cannot be changed in demo mode",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('logo', file);

      const response = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          app_logo: result.data.logo_url,
        }));
        setSelectedLogoFile(null);
        // Clear the file input
        const fileInput = document.getElementById('app_logo') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        toast({
          title: "Logo uploaded",
          description: "App logo has been uploaded successfully.",
        });
        
        // Refresh settings to get the latest logo URL
        queryClient.invalidateQueries({ queryKey: ['/api/admin/settings'] });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Platform Settings</h2>
            <p className="text-muted-foreground">Configure platform settings and preferences</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !canManageSettings}
            data-testid="button-save-settings"
          >
            {isSaving ? "Saving..." : isDemoMode ? "Demo Mode - Read Only" : "Save Changes"}
          </Button>
        </div>

        {isDemoMode && (
          <Alert className="mb-6">
            <ShieldX className="h-4 w-4" />
            <AlertDescription>
              Demo mode is active. All settings are read-only and cannot be modified.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="general" className="space-y-6">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList className="inline-flex w-full min-w-max sm:w-full sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="general" data-testid="tab-general" className="flex-shrink-0 sm:flex-shrink">
                <Settings className="h-4 w-4 mr-2 hidden sm:inline" />
                General
              </TabsTrigger>
              <TabsTrigger value="payment" data-testid="tab-payment" className="flex-shrink-0 sm:flex-shrink">
                <DollarSign className="h-4 w-4 mr-2 hidden sm:inline" />
                Payment
              </TabsTrigger>
              <TabsTrigger value="api-keys" data-testid="tab-api-keys" className="flex-shrink-0 sm:flex-shrink">
                <Key className="h-4 w-4 mr-2 hidden sm:inline" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="integrations" data-testid="tab-integrations" className="flex-shrink-0 sm:flex-shrink">
                <Video className="h-4 w-4 mr-2 hidden sm:inline" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="app-versions" data-testid="tab-app-versions" className="flex-shrink-0 sm:flex-shrink">
                <Smartphone className="h-4 w-4 mr-2 hidden sm:inline" />
                App Versions
              </TabsTrigger>
              <TabsTrigger value="translations" data-testid="tab-translations" className="flex-shrink-0 sm:flex-shrink">
                <Languages className="h-4 w-4 mr-2 hidden sm:inline" />
                Translations
              </TabsTrigger>
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app_name">App Name</Label>
                  <Input
                    id="app_name"
                    value={formData.app_name}
                    onChange={(e) => handleInputChange('app_name', e.target.value)}
                    placeholder="Your App Name"
                    data-testid="input-app-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seo_title">SEO Title</Label>
                  <Input
                    id="seo_title"
                    value={formData.seo_title}
                    onChange={(e) => handleInputChange('seo_title', e.target.value)}
                    placeholder="Browser title (defaults to App Name if empty)"
                    data-testid="input-seo-title"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will appear in the browser tab. If empty, the app name will be used.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={formData.support_email}
                      onChange={(e) => handleInputChange('support_email', e.target.value)}
                      placeholder="support@example.com"
                      data-testid="input-support-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency Symbol</Label>
                    <Input
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      placeholder="$"
                      data-testid="input-currency"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission">Platform Commission (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    value={formData.commission}
                    onChange={(e) => handleInputChange('commission', e.target.value)}
                    placeholder="5"
                    data-testid="input-commission"
                  />
                  <p className="text-xs text-muted-foreground">
                    Commission percentage charged on transactions
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stripe_fee">Stripe Fee (%)</Label>
                    <Input
                      id="stripe_fee"
                      type="number"
                      step="0.01"
                      value={formData.stripe_fee}
                      onChange={(e) => handleInputChange('stripe_fee', e.target.value)}
                      placeholder="2.9"
                      data-testid="input-stripe-fee"
                    />
                    <p className="text-xs text-muted-foreground">
                      Stripe processing fee percentage
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extra_charges">Extra Charges (Fixed)</Label>
                    <Input
                      id="extra_charges"
                      type="number"
                      step="0.01"
                      value={formData.extra_charges}
                      onChange={(e) => handleInputChange('extra_charges', e.target.value)}
                      placeholder="0.30"
                      data-testid="input-extra-charges"
                    />
                    <p className="text-xs text-muted-foreground">
                      Fixed additional charges per transaction
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app_logo">App Logo</Label>
                  <div className="flex items-start gap-4">
                    {formData.app_logo && (
                      <div className="flex-shrink-0">
                        <img 
                          src={
                            formData.app_logo.startsWith('http') 
                              ? formData.app_logo 
                              : `${import.meta.env.VITE_ICONA_API_BASE || 'https://api.iconaapp.com'}/${formData.app_logo.replace(/^\//, '')}`
                          } 
                          alt="App Logo" 
                          className="h-20 w-20 object-contain rounded border border-border bg-muted p-2"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23666">Logo</text></svg>';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          id="app_logo"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSelectedLogoFile(file);
                            }
                          }}
                          data-testid="input-app-logo"
                          className="cursor-pointer flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (selectedLogoFile) {
                              handleLogoUpload(selectedLogoFile);
                            } else {
                              toast({
                                title: "No file selected",
                                description: "Please select a logo file first.",
                                variant: "destructive",
                              });
                            }
                          }}
                          disabled={!selectedLogoFile || isUploadingLogo}
                          data-testid="button-upload-logo"
                        >
                          {isUploadingLogo ? "Uploading..." : "Upload"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select a logo file and click Upload (PNG, JPG, or SVG recommended)
                      </p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Legal Links</CardTitle>
                <CardDescription>Privacy policy and terms of service URLs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="privacy_url">Privacy Policy URL</Label>
                  <Input
                    id="privacy_url"
                    type="url"
                    value={formData.privacy_url}
                    onChange={(e) => handleInputChange('privacy_url', e.target.value)}
                    placeholder="https://example.com/privacy"
                    data-testid="input-privacy-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms_url">Terms of Service URL</Label>
                  <Input
                    id="terms_url"
                    type="url"
                    value={formData.terms_url}
                    onChange={(e) => handleInputChange('terms_url', e.target.value)}
                    placeholder="https://example.com/terms"
                    data-testid="input-terms-url"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>App Theme Colors</CardTitle>
                <CardDescription>Configure primary and secondary colors for your mobile app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Primary Color (Main Color)</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-10 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: formData.primary_color ? `#${formData.primary_color.slice(-6)}` : '#FACC15' }}
                      />
                      <Input
                        id="primary_color"
                        value={formData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value.toUpperCase())}
                        placeholder="FFFACC15"
                        data-testid="input-primary-color"
                        maxLength={8}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format: AARRGGBB (e.g., FFFACC15 for yellow).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Secondary Color (Sub Color)</Label>
                    <div className="flex gap-2">
                      <div 
                        className="w-12 h-10 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: formData.secondary_color ? `#${formData.secondary_color.slice(-6)}` : '#0D9488' }}
                      />
                      <Input
                        id="secondary_color"
                        value={formData.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value.toUpperCase())}
                        placeholder="FF0D9488"
                        data-testid="input-secondary-color"
                        maxLength={8}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Format: AARRGGBB (e.g., FF0D9488 for teal).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seller Approval Workflow</CardTitle>
                <CardDescription>Control how users become sellers on your platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1">
                    <Label htmlFor="seller-auto-approve">Automatic Seller Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, users can become sellers automatically without admin approval. When disabled, admin must manually approve all seller applications.
                    </p>
                  </div>
                  <Switch
                    id="seller-auto-approve"
                    checked={formData.seller_auto_approve}
                    onCheckedChange={(checked) => handleInputChange('seller_auto_approve', checked)}
                    data-testid="switch-seller-auto-approve"
                  />
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {formData.seller_auto_approve ? (
                      <>
                        Automatic approval is <strong>enabled</strong>. Users will become sellers immediately after applying.
                      </>
                    ) : (
                      <>
                        Manual approval is <strong>required</strong>. Admins must review and approve seller applications in the Users section.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {!formData.demoMode && (
              <Card>
                <CardHeader>
                  <CardTitle>Demo Mode</CardTitle>
                  <CardDescription>Control whether CRUD operations are allowed on the platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="demo-mode">Enable Demo Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        When enabled, all create, update, and delete operations will be disabled for everyone (including super admins). Perfect for protecting demo environments from modifications.
                      </p>
                    </div>
                    <Switch
                      id="demo-mode"
                      checked={formData.demoMode}
                      onCheckedChange={(checked) => handleInputChange('demoMode', checked)}
                      data-testid="switch-demo-mode"
                    />
                  </div>
                  {formData.demoMode && (
                    <Alert>
                      <ShieldX className="h-4 w-4" />
                      <AlertDescription>
                        Demo mode is currently <strong>enabled</strong>. All CRUD operations are disabled across the platform.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stripe Integration</CardTitle>
                <CardDescription>Stripe payment gateway configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripepublickey">Stripe Publishable Key</Label>
                  <Input
                    id="stripepublickey"
                    value={formData.demoMode ? maskKey(formData.stripepublickey) : formData.stripepublickey}
                    onChange={(e) => handleInputChange('stripepublickey', e.target.value)}
                    placeholder="pk_test_..."
                    data-testid="input-stripe-public-key"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Stripe Secret Key</Label>
                  <Input
                    id="stripeSecretKey"
                    type={formData.demoMode ? 'text' : 'password'}
                    value={formData.demoMode ? maskKey(formData.stripeSecretKey) : formData.stripeSecretKey}
                    onChange={(e) => handleInputChange('stripeSecretKey', e.target.value)}
                    placeholder="sk_test_..."
                    data-testid="input-stripe-secret-key"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Keep this key secret and secure
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe_webhook_key">Stripe Webhook Secret</Label>
                  <Input
                    id="stripe_webhook_key"
                    type={formData.demoMode ? 'text' : 'password'}
                    value={formData.demoMode ? maskKey(formData.stripe_webhook_key) : formData.stripe_webhook_key}
                    onChange={(e) => handleInputChange('stripe_webhook_key', e.target.value)}
                    placeholder="whsec_..."
                    data-testid="input-stripe-webhook-key"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for verifying webhook events from Stripe
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe_connect_account">Stripe Connect Account (Shipping Fees)</Label>
                  <Input
                    id="stripe_connect_account"
                    value={formData.stripe_connect_account}
                    onChange={(e) => handleInputChange('stripe_connect_account', e.target.value)}
                    placeholder="acct_..."
                    data-testid="input-stripe-connect-account"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stripe Connect account ID to receive shipping fees
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api-keys" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>External Service API Keys</CardTitle>
                <CardDescription>API keys for third-party services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="FIREBASE_API_KEY">Firebase API Key</Label>
                  <Input
                    id="FIREBASE_API_KEY"
                    type={formData.demoMode ? 'text' : 'password'}
                    value={formData.demoMode ? maskKey(formData.FIREBASE_API_KEY) : formData.FIREBASE_API_KEY}
                    onChange={(e) => handleInputChange('FIREBASE_API_KEY', e.target.value)}
                    placeholder="AIza..."
                    data-testid="input-firebase-api-key"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shippo_api_key">Shippo API Key</Label>
                  <Input
                    id="shippo_api_key"
                    type={formData.demoMode ? 'text' : 'password'}
                    value={formData.demoMode ? maskKey(formData.shippo_api_key) : formData.shippo_api_key}
                    onChange={(e) => handleInputChange('shippo_api_key', e.target.value)}
                    placeholder="shippo_..."
                    data-testid="input-shippo-api-key"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for shipping label generation
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Service Configuration</CardTitle>
                <CardDescription>Configure email service for sending emails to users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email_service_provider">Email Service Provider</Label>
                  <Select
                    value={formData.email_service_provider}
                    onValueChange={(value) => handleInputChange('email_service_provider', value)}
                  >
                    <SelectTrigger id="email_service_provider" data-testid="select-email-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="resend">Resend</SelectItem>
                      <SelectItem value="smtp">SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* API Key field - only for SendGrid, Mailgun, and Resend (NOT for SMTP) */}
                {formData.email_service_provider !== 'smtp' && (
                  <div className="space-y-2">
                    <Label htmlFor="email_api_key">Email API Key</Label>
                    <Input
                      id="email_api_key"
                      type={formData.demoMode ? 'text' : 'password'}
                      value={formData.demoMode ? maskKey(formData.email_api_key) : formData.email_api_key}
                      onChange={(e) => handleInputChange('email_api_key', e.target.value)}
                      placeholder="SG.xxx... or your provider's API key"
                      data-testid="input-email-api-key"
                      readOnly={formData.demoMode}
                      disabled={formData.demoMode}
                      onCopy={(e) => formData.demoMode && e.preventDefault()}
                      onCut={(e) => formData.demoMode && e.preventDefault()}
                      onPaste={(e) => formData.demoMode && e.preventDefault()}
                      className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      API key for your email service provider
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_from_address">From Email Address</Label>
                    <Input
                      id="email_from_address"
                      type="email"
                      value={formData.email_from_address}
                      onChange={(e) => handleInputChange('email_from_address', e.target.value)}
                      placeholder="noreply@yourdomain.com"
                      data-testid="input-email-from-address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_from_name">From Name</Label>
                    <Input
                      id="email_from_name"
                      value={formData.email_from_name}
                      onChange={(e) => handleInputChange('email_from_name', e.target.value)}
                      placeholder="Your App Name"
                      data-testid="input-email-from-name"
                    />
                  </div>
                </div>

                {/* Provider-specific fields */}
                {formData.email_service_provider === 'mailgun' && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="email_mailgun_domain">Mailgun Domain</Label>
                      <Input
                        id="email_mailgun_domain"
                        value={formData.email_mailgun_domain}
                        onChange={(e) => handleInputChange('email_mailgun_domain', e.target.value)}
                        placeholder="mg.yourdomain.com"
                        data-testid="input-mailgun-domain"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Mailgun sending domain
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email_reply_to">Reply-To Email (Optional)</Label>
                      <Input
                        id="email_reply_to"
                        type="email"
                        value={formData.email_reply_to}
                        onChange={(e) => handleInputChange('email_reply_to', e.target.value)}
                        placeholder="support@gmail.com"
                        data-testid="input-email-reply-to"
                      />
                      <p className="text-xs text-muted-foreground">
                        When users reply to emails, their response will go to this address (can be different from From Email)
                      </p>
                    </div>
                  </div>
                )}

                {formData.email_service_provider === 'smtp' && (
                  <div className="space-y-4 pt-4 border-t">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Gmail Users:</strong> Use an App Password instead of your regular password.
                        <br />
                        Generate one at: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">myaccount.google.com/apppasswords</a>
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp_host">SMTP Host</Label>
                        <Input
                          id="email_smtp_host"
                          value={formData.email_smtp_host}
                          onChange={(e) => handleInputChange('email_smtp_host', e.target.value)}
                          placeholder="smtp.gmail.com"
                          data-testid="input-smtp-host"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp_port">SMTP Port</Label>
                        <Input
                          id="email_smtp_port"
                          value={formData.email_smtp_port}
                          onChange={(e) => handleInputChange('email_smtp_port', e.target.value)}
                          placeholder="587"
                          data-testid="input-smtp-port"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp_user">SMTP Username</Label>
                        <Input
                          id="email_smtp_user"
                          value={formData.email_smtp_user}
                          onChange={(e) => handleInputChange('email_smtp_user', e.target.value)}
                          placeholder="your-email@gmail.com"
                          data-testid="input-smtp-user"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email_smtp_pass">SMTP Password</Label>
                        <Input
                          id="email_smtp_pass"
                          type={formData.demoMode ? 'text' : 'password'}
                          value={formData.demoMode ? maskKey(formData.email_smtp_pass) : formData.email_smtp_pass}
                          onChange={(e) => handleInputChange('email_smtp_pass', e.target.value)}
                          placeholder="App Password (16 characters)"
                          data-testid="input-smtp-pass"
                          readOnly={formData.demoMode}
                          disabled={formData.demoMode}
                          onCopy={(e) => formData.demoMode && e.preventDefault()}
                          onCut={(e) => formData.demoMode && e.preventDefault()}
                          onPaste={(e) => formData.demoMode && e.preventDefault()}
                          className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>LiveKit Integration</CardTitle>
                <CardDescription>Live streaming platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="livekit_url">LiveKit URL</Label>
                  <Input
                    id="livekit_url"
                    value={formData.livekit_url}
                    onChange={(e) => handleInputChange('livekit_url', e.target.value)}
                    placeholder="wss://your-livekit-url.com"
                    data-testid="input-livekit-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="livekit_api_key">LiveKit API Key</Label>
                  <Input
                    id="livekit_api_key"
                    type={formData.demoMode ? 'text' : 'password'}
                    value={formData.demoMode ? maskKey(formData.livekit_api_key) : formData.livekit_api_key}
                    onChange={(e) => handleInputChange('livekit_api_key', e.target.value)}
                    placeholder="API..."
                    data-testid="input-livekit-api-key"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="livekit_api_secret">LiveKit API Secret</Label>
                  <Input
                    id="livekit_api_secret"
                    type={formData.demoMode ? 'text' : 'password'}
                    value={formData.demoMode ? maskKey(formData.livekit_api_secret) : formData.livekit_api_secret}
                    onChange={(e) => handleInputChange('livekit_api_secret', e.target.value)}
                    placeholder="Secret..."
                    data-testid="input-livekit-api-secret"
                    readOnly={formData.demoMode}
                    disabled={formData.demoMode}
                    onCopy={(e) => formData.demoMode && e.preventDefault()}
                    onCut={(e) => formData.demoMode && e.preventDefault()}
                    onPaste={(e) => formData.demoMode && e.preventDefault()}
                    className={formData.demoMode ? 'select-none cursor-not-allowed opacity-60' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    LiveKit credentials for video streaming
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* App Versions */}
          <TabsContent value="app-versions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>App Version Management</CardTitle>
                <CardDescription>Manage mobile app version numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appVersion">App Version</Label>
                  <Input
                    id="appVersion"
                    value={formData.appVersion}
                    onChange={(e) => handleInputChange('appVersion', e.target.value)}
                    placeholder="1.0.0"
                    data-testid="input-app-version"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="androidVersion">Android Version</Label>
                    <Input
                      id="androidVersion"
                      value={formData.androidVersion}
                      onChange={(e) => handleInputChange('androidVersion', e.target.value)}
                      placeholder="1.0.0"
                      data-testid="input-android-version"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="iosVersion">iOS Version</Label>
                    <Input
                      id="iosVersion"
                      value={formData.iosVersion}
                      onChange={(e) => handleInputChange('iosVersion', e.target.value)}
                      placeholder="1.0.0"
                      data-testid="input-ios-version"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="forceUpdate"
                    checked={formData.forceUpdate}
                    onCheckedChange={(checked) => handleInputChange('forceUpdate', checked)}
                    data-testid="switch-force-update"
                  />
                  <Label htmlFor="forceUpdate" className="cursor-pointer">
                    Force App Update
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  When enabled, users will be required to update the app to continue using it
                </p>
                <p className="text-xs text-muted-foreground">
                  These version numbers are used with the Force Update feature
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translations Tab */}
          <TabsContent value="translations" className="space-y-6">
            <TranslationsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Translations Manager Component
function TranslationsManager() {
  const { toast } = useToast();
  const { canManageSettings, isDemoMode } = usePermissions();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [newLanguageCode, setNewLanguageCode] = useState('');
  const [isAddingLanguage, setIsAddingLanguage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('');
  const defaultLanguageInitialized = useRef(false);

  const { data: translationsData, isLoading } = useQuery<any>({
    queryKey: ['/api/admin/translations'],
  });

  // Extract new structure: { success, version, default_language, translations }
  const responseData = translationsData?.data || {};
  const translations = responseData.translations || responseData; // Fallback for old structure
  const version = responseData.version;
  const apiDefaultLanguage = responseData.default_language;

  const [translationValues, setTranslationValues] = useState<Record<string, Record<string, string>>>({});
  
  const languages = Object.keys(translationValues);

  useEffect(() => {
    if (translations && Object.keys(translations).length > 0 && Object.keys(translationValues).length === 0) {
      setTranslationValues(translations);
    }
  }, [translations, translationValues]);

  // Only set default language from API once on initial load
  useEffect(() => {
    if (!defaultLanguageInitialized.current && apiDefaultLanguage) {
      setDefaultLanguage(apiDefaultLanguage);
      defaultLanguageInitialized.current = true;
    } else if (!defaultLanguageInitialized.current && languages.length > 0 && !defaultLanguage) {
      // Fallback to first language only if API didn't provide a default
      setDefaultLanguage(languages[0]);
      defaultLanguageInitialized.current = true;
    }
  }, [apiDefaultLanguage, languages, defaultLanguage]);

  // Get all unique keys from all languages
  const allKeys = Array.from(
    new Set(
      Object.values(translationValues).flatMap((lang: any) => Object.keys(lang))
    )
  ).sort();

  const handleAddLanguage = () => {
    if (!newLanguageCode || newLanguageCode.length !== 2) {
      toast({
        title: "Invalid language code",
        description: "Language code must be exactly 2 characters (e.g., 'es', 'fr')",
        variant: "destructive",
      });
      return;
    }

    if (languages.includes(newLanguageCode)) {
      toast({
        title: "Language already exists",
        description: `Language '${newLanguageCode}' is already configured`,
        variant: "destructive",
      });
      return;
    }

    // If this is the first language, create with starter keys
    if (languages.length === 0) {
      const starterKeys: Record<string, string> = {
        app_name: '',
        hi: '',
        home: '',
        profile: '',
        settings: '',
      };
      
      setTranslationValues({
        [newLanguageCode]: starterKeys,
      });
    } else {
      // Copy all keys from English (or first language) with empty values
      const referenceLanguage = translations['en'] || translations[languages[0]] || {};
      const newLanguageTranslations: Record<string, string> = {};
      Object.keys(referenceLanguage).forEach(key => {
        newLanguageTranslations[key] = '';
      });

      setTranslationValues(prev => ({
        ...prev,
        [newLanguageCode]: newLanguageTranslations,
      }));
    }

    setSelectedLanguage(newLanguageCode);
    setNewLanguageCode('');
    setIsAddingLanguage(false);

    toast({
      title: "Language added",
      description: `Language '${newLanguageCode}' has been added. ${languages.length === 0 ? 'Add your translation keys and' : 'Fill in the translations and'} save.`,
    });
  };

  const handleDeleteLanguage = (langCode: string) => {
    if (langCode === 'en') {
      toast({
        title: "Cannot delete English",
        description: "English is the default language and cannot be deleted",
        variant: "destructive",
      });
      return;
    }

    const newTranslations = { ...translationValues };
    delete newTranslations[langCode];
    setTranslationValues(newTranslations);

    if (selectedLanguage === langCode) {
      setSelectedLanguage('en');
    }

    toast({
      title: "Language removed",
      description: `Language '${langCode}' has been removed. Click Save to apply changes.`,
    });
  };

  const handleTranslationChange = (key: string, value: string) => {
    setTranslationValues(prev => ({
      ...prev,
      [selectedLanguage]: {
        ...prev[selectedLanguage],
        [key]: value,
      },
    }));
  };

  const handleSaveTranslations = async () => {
    if (!canManageSettings) {
      toast({
        title: "Action not allowed",
        description: "Settings cannot be changed in demo mode",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const response = await apiRequest('POST', '/api/admin/translations', {
        translations: translationValues,
        default_language: defaultLanguage,
      });

      if (!response.ok) {
        throw new Error('Failed to save translations');
      }

      queryClient.invalidateQueries({ queryKey: ['/api/admin/translations'] });
      
      toast({
        title: "Translations saved",
        description: "All translations have been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save translations",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      const response = await fetch('/api/admin/translations/download', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download translations');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translations.xml';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your translations XML file is downloading",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download translations",
        variant: "destructive",
      });
    }
  };

  const handleUploadXML = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xml')) {
      toast({
        title: "Invalid file",
        description: "Please upload an XML file",
        variant: "destructive",
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/translations/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload translations');
      }

      const data = await response.json();

      queryClient.invalidateQueries({ queryKey: ['/api/admin/translations'] });

      toast({
        title: "Upload successful",
        description: data.message || "Translations imported successfully",
      });

      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload translations",
        variant: "destructive",
      });
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no translations exist yet, show an empty state that allows adding first language
  if (languages.length === 0 && !isAddingLanguage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>App Translations</CardTitle>
          <CardDescription>
            No translations found. Add your first language to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Start by adding English (en) as your default language, then add translation keys.
            </AlertDescription>
          </Alert>
          <Button onClick={() => setIsAddingLanguage(true)} data-testid="button-add-first-language">
            <Plus className="h-4 w-4 mr-2" />
            Add First Language
          </Button>
          
          {isAddingLanguage && (
            <div className="flex gap-2 mt-4">
              <Input
                placeholder="Code (e.g., en)"
                value={newLanguageCode}
                onChange={(e) => setNewLanguageCode(e.target.value.toLowerCase())}
                maxLength={2}
                className="w-32"
                data-testid="input-new-language"
              />
              <Button onClick={handleAddLanguage} size="sm" data-testid="button-confirm-add">
                Add
              </Button>
              <Button 
                onClick={() => {
                  setIsAddingLanguage(false);
                  setNewLanguageCode('');
                }} 
                size="sm" 
                variant="ghost"
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>App Translations</CardTitle>
            <CardDescription>
              Manage translations for your mobile app. Download as XML, edit offline, and upload back.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownloadXML} variant="outline" data-testid="button-download-xml">
              <Download className="h-4 w-4 mr-2" />
              Download XML
            </Button>
            <Button onClick={() => document.getElementById('xml-upload-input')?.click()} variant="outline" data-testid="button-upload-xml">
              <Upload className="h-4 w-4 mr-2" />
              Upload XML
            </Button>
            <input
              id="xml-upload-input"
              type="file"
              accept=".xml"
              onChange={handleUploadXML}
              className="hidden"
              data-testid="input-xml-upload"
            />
            <Button onClick={handleSaveTranslations} disabled={isSaving || !canManageSettings} data-testid="button-save-translations">
              {isSaving ? "Saving..." : isDemoMode ? "Demo Mode - Read Only" : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Translation Info */}
        {version !== undefined && (
          <div className="flex gap-4 text-sm text-muted-foreground border-b pb-4">
            <div>
              <span className="font-medium">Version:</span> {version}
            </div>
          </div>
        )}

        {/* Language Selection and Default Language */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Select Language to Edit</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()} - {translationValues[lang]?.app_name || 'Language'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Language</Label>
            <Select value={defaultLanguage || languages[0] || 'en'} onValueChange={setDefaultLanguage}>
              <SelectTrigger data-testid="select-default-language">
                <SelectValue placeholder="Select default language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(lang => (
                  <SelectItem key={lang} value={lang}>
                    {lang.toUpperCase()} - {translationValues[lang]?.app_name || 'Language'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add/Delete Language Actions */}
        <div className="flex gap-4 items-center">

          {!isAddingLanguage ? (
            <Button 
              onClick={() => setIsAddingLanguage(true)} 
              variant="outline"
              data-testid="button-add-language"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Language
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Code (e.g., es)"
                value={newLanguageCode}
                onChange={(e) => setNewLanguageCode(e.target.value.toLowerCase())}
                maxLength={2}
                className="w-32"
                data-testid="input-new-language"
              />
              <Button onClick={handleAddLanguage} size="sm" data-testid="button-confirm-add">
                Add
              </Button>
              <Button 
                onClick={() => {
                  setIsAddingLanguage(false);
                  setNewLanguageCode('');
                }} 
                size="sm" 
                variant="ghost"
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
            </div>
          )}

          {selectedLanguage !== 'en' && (
            <Button
              onClick={() => handleDeleteLanguage(selectedLanguage)}
              variant="destructive"
              size="sm"
              data-testid="button-delete-language"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Translation Keys */}
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Dynamic Placeholders:</strong> Use placeholders like <code className="px-1 py-0.5 bg-muted rounded">@app_name</code>, <code className="px-1 py-0.5 bg-muted rounded">@name</code>, <code className="px-1 py-0.5 bg-muted rounded">@provider</code> in your translations. These will be automatically replaced with actual values in the app.
          </AlertDescription>
        </Alert>

        <div className="border rounded-lg">
          <div className="bg-muted px-4 py-3 border-b">
            <p className="text-sm font-medium">
              Editing {selectedLanguage.toUpperCase()} ({allKeys.length} keys)
            </p>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            <div className="divide-y">
              {allKeys.map((key) => {
                const englishTranslation = translations['en']?.[key];
                const placeholderText = selectedLanguage !== 'en' && englishTranslation
                  ? englishTranslation
                  : `Enter ${selectedLanguage.toUpperCase()} translation for "${key}"`;
                
                return (
                  <div key={key} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="grid gap-2">
                      <Label htmlFor={`trans-${key}`} className="text-xs text-muted-foreground font-mono">
                        {key}
                      </Label>
                      <Input
                        id={`trans-${key}`}
                        value={translationValues[selectedLanguage]?.[key] || ''}
                        onChange={(e) => handleTranslationChange(key, e.target.value)}
                        placeholder={placeholderText}
                        data-testid={`input-translation-${key}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {allKeys.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No translation keys found. Add a language and start adding translations.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
