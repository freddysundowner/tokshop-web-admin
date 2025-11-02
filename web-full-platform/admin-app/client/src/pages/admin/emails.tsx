import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Send, Users, User, AlertCircle, Code, Smartphone, ShieldX } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminEmails() {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState<"all" | "individual">("all");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  
  // App update notification state
  const [androidLink, setAndroidLink] = useState("https://play.google.com/store/apps/details?id=com.tokshop.live&hl=en");
  const [iosLink, setIosLink] = useState("https://testflight.apple.com/join/jjzjjnC2");
  const [updateRecipientType, setUpdateRecipientType] = useState<"all" | "individual">("all");
  const [updateRecipientEmail, setUpdateRecipientEmail] = useState("");

  // Fetch settings to check if email is configured
  const { data: settingsData } = useQuery<any>({
    queryKey: ['/api/admin/settings'],
  });

  const settings = settingsData?.data || settingsData;
  const isDemoMode = settings?.demoMode || false;
  
  // Check if email is configured based on provider
  const provider = settings?.email_service_provider?.toLowerCase();
  let isEmailConfigured = settings?.email_from_address?.trim() && provider;
  
  if (isEmailConfigured) {
    if (provider === 'smtp') {
      isEmailConfigured = !!(
        settings?.email_smtp_host?.trim() && 
        settings?.email_smtp_port?.trim() && 
        settings?.email_smtp_user?.trim() && 
        settings?.email_smtp_pass?.trim()
      );
    } else if (provider === 'mailgun') {
      isEmailConfigured = !!(settings?.email_api_key?.trim() && settings?.email_mailgun_domain?.trim());
    } else {
      isEmailConfigured = !!settings?.email_api_key?.trim();
    }
  }

  // Fetch all users for individual email selection
  const { data: usersData } = useQuery<any>({
    queryKey: ['/api/admin/users?limit=1000'],
    enabled: recipientType === "individual" || updateRecipientType === "individual",
  });

  const users = usersData?.data?.users || [];

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/send-email", data);
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: recipientType === "all" 
          ? "Email has been sent to all users" 
          : "Email has been sent to the selected user",
      });
      // Reset form
      setSubject("");
      setMessage("");
      setRecipientEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "An error occurred while sending the email",
        variant: "destructive",
      });
    },
  });

  const sendUpdateNotificationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/admin/send-update-notification", data);
    },
    onSuccess: () => {
      toast({
        title: "Update notification sent",
        description: updateRecipientType === "all" 
          ? "App update notification has been sent to all users"
          : "App update notification has been sent to the selected user",
      });
      // Reset individual selection
      if (updateRecipientType === "individual") {
        setUpdateRecipientEmail("");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send notification",
        description: error.message || "An error occurred while sending the notification",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and message are required",
        variant: "destructive",
      });
      return;
    }

    if (recipientType === "individual" && !recipientEmail) {
      toast({
        title: "Validation Error",
        description: "Please select a recipient",
        variant: "destructive",
      });
      return;
    }

    sendEmailMutation.mutate({
      recipientType,
      recipientEmail: recipientType === "individual" ? recipientEmail : undefined,
      subject,
      message,
      isHtmlMode,
    });
  };

  const handleSendUpdateNotification = () => {
    if (updateRecipientType === "individual" && !updateRecipientEmail) {
      toast({
        title: "Validation Error",
        description: "Please select a recipient",
        variant: "destructive",
      });
      return;
    }

    sendUpdateNotificationMutation.mutate({
      androidLink,
      iosLink,
      androidVersion: settings?.androidVersion || "",
      iosVersion: settings?.iosVersion || "",
      recipientType: updateRecipientType,
      recipientEmail: updateRecipientType === "individual" ? updateRecipientEmail : undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Send Emails
          </h2>
          <p className="text-muted-foreground">Send emails to users on your platform</p>
        </div>

        {isDemoMode && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <ShieldX className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Email functionality is disabled in demo mode. This page is view-only to prevent sending emails to real users.
            </AlertDescription>
          </Alert>
        )}

        {!isEmailConfigured && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email service is not configured. Please configure your email settings in the{" "}
              <a href="/admin/settings" className="underline font-medium">Settings page</a> first.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Composer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Compose Email</CardTitle>
                <CardDescription>Create and send emails to your users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recipient Type Selection */}
                <div className="space-y-2">
                  <Label>Send To</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={recipientType === "all" ? "default" : "outline"}
                      onClick={() => setRecipientType("all")}
                      className="flex-1"
                      data-testid="button-recipient-all"
                      disabled={isDemoMode}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      All Users
                    </Button>
                    <Button
                      variant={recipientType === "individual" ? "default" : "outline"}
                      onClick={() => setRecipientType("individual")}
                      className="flex-1"
                      data-testid="button-recipient-individual"
                      disabled={isDemoMode}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Individual User
                    </Button>
                  </div>
                </div>

                {/* Individual User Selection */}
                {recipientType === "individual" && (
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Select Recipient</Label>
                    <Select value={recipientEmail} onValueChange={setRecipientEmail} disabled={isDemoMode}>
                      <SelectTrigger id="recipient" data-testid="select-recipient">
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user._id || user.id} value={user.email}>
                            {user.firstName} {user.lastName} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    data-testid="input-subject"
                    disabled={isDemoMode}
                  />
                </div>

                {/* HTML Mode Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <Label htmlFor="html-mode" className="cursor-pointer">
                      HTML Mode
                    </Label>
                  </div>
                  <Switch
                    id="html-mode"
                    checked={isHtmlMode}
                    onCheckedChange={setIsHtmlMode}
                    data-testid="switch-html-mode"
                    disabled={isDemoMode}
                  />
                </div>

                {isHtmlMode && (
                  <Alert>
                    <Code className="h-4 w-4" />
                    <AlertDescription>
                      <strong>HTML Mode:</strong> You can now use full HTML formatting. The message will be sent as-is without any wrapper template.
                      <br />
                      Tip: You can still use <code className="bg-muted px-1 py-0.5 rounded">{"{name}"}</code> for personalization.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">{isHtmlMode ? "HTML Content" : "Message"}</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isHtmlMode ? "Enter your HTML email content..." : "Enter your message..."}
                    rows={isHtmlMode ? 20 : 10}
                    className={isHtmlMode ? "font-mono text-sm" : ""}
                    data-testid="textarea-message"
                    disabled={isDemoMode}
                  />
                  {!isHtmlMode && (
                    <p className="text-xs text-muted-foreground">
                      Tip: Use {"{name}"} to personalize with the user's name
                    </p>
                  )}
                </div>

                {/* Send Button */}
                <Button
                  onClick={handleSendEmail}
                  disabled={isDemoMode || sendEmailMutation.isPending || !isEmailConfigured}
                  className="w-full"
                  data-testid="button-send-email"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Email Settings Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Current email service settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEmailConfigured ? (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Provider</Label>
                      <p className="font-medium capitalize">{settings?.email_service_provider || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">From Address</Label>
                      <p className="font-medium">{settings?.email_from_address || "Not set"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">From Name</Label>
                      <p className="font-medium">{settings?.email_from_name || "Not set"}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No email service configured. Please update your settings.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>• Keep your subject line clear and concise</p>
                <p>• Personalize emails using {"{name}"} placeholder</p>
                <p>• Test with individual emails before broadcasting</p>
                <p>• Be mindful of email frequency to avoid spam</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* App Update Notification */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                App Update Notification
              </CardTitle>
              <CardDescription>
                Send a notification to all users about the latest app version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Recipient Type Selection */}
              <div className="space-y-2">
                <Label>Send To</Label>
                <div className="flex gap-4">
                  <Button
                    variant={updateRecipientType === "all" ? "default" : "outline"}
                    onClick={() => setUpdateRecipientType("all")}
                    className="flex-1"
                    data-testid="button-update-recipient-all"
                    disabled={isDemoMode}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    All Users
                  </Button>
                  <Button
                    variant={updateRecipientType === "individual" ? "default" : "outline"}
                    onClick={() => setUpdateRecipientType("individual")}
                    className="flex-1"
                    data-testid="button-update-recipient-individual"
                    disabled={isDemoMode}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Individual User
                  </Button>
                </div>
              </div>

              {/* Individual User Selection */}
              {updateRecipientType === "individual" && (
                <div className="space-y-2">
                  <Label htmlFor="update-recipient">Select Recipient</Label>
                  <Select value={updateRecipientEmail} onValueChange={setUpdateRecipientEmail} disabled={isDemoMode}>
                    <SelectTrigger id="update-recipient" data-testid="select-update-recipient">
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: any) => (
                        <SelectItem key={user._id || user.id} value={user.email}>
                          {user.firstName} {user.lastName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Version Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <Label className="text-xs text-muted-foreground">Android Version</Label>
                  <p className="text-2xl font-bold">{settings?.androidVersion || "Not set"}</p>
                </div>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <Label className="text-xs text-muted-foreground">iOS Version</Label>
                  <p className="text-2xl font-bold">{settings?.iosVersion || "Not set"}</p>
                </div>
              </div>

              {/* Store Links */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="android-link">Android Store Link</Label>
                  <Input
                    id="android-link"
                    value={androidLink}
                    onChange={(e) => setAndroidLink(e.target.value)}
                    placeholder="https://play.google.com/store/apps/..."
                    data-testid="input-android-link"
                    disabled={isDemoMode}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ios-link">iOS Store Link</Label>
                  <Input
                    id="ios-link"
                    value={iosLink}
                    onChange={(e) => setIosLink(e.target.value)}
                    placeholder="https://testflight.apple.com/join/..."
                    data-testid="input-ios-link"
                    disabled={isDemoMode}
                  />
                </div>
              </div>

              {/* Preview Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Email Preview:</strong> Users will receive a professionally formatted email with:
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Personalized greeting with their name</li>
                    <li>• Version numbers for Android and iOS</li>
                    <li>• Direct links to update on their respective stores</li>
                    <li>• Responsive design for mobile and desktop</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Send Button */}
              <Button
                onClick={handleSendUpdateNotification}
                disabled={isDemoMode || sendUpdateNotificationMutation.isPending || !isEmailConfigured}
                className="w-full"
                size="lg"
                data-testid="button-send-update-notification"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendUpdateNotificationMutation.isPending 
                  ? "Sending Update Notification..." 
                  : updateRecipientType === "all" 
                    ? "Send Update Notification to All Users"
                    : "Send Update Notification to Selected User"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
