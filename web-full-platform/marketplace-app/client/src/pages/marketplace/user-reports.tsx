import { useState } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { usePageTitle } from '@/hooks/use-page-title';
import { useSettings } from '@/lib/settings-context';

export default function UserReports() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();
  usePageTitle('Report an Issue');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reportType: '',
    reportedItem: '',
    reason: '',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: formData.reportType,
          reportedItem: formData.reportedItem,
          reason: formData.reason,
          description: formData.description,
          reportedBy: user?.id,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Report submitted',
          description: 'Thank you for your report. Our team will review it shortly.',
        });
        setFormData({ reportType: '', reportedItem: '', reason: '', description: '' });
      } else {
        throw new Error('Failed to submit report');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="flex justify-center w-full">
        <div className="w-full lg:w-[90%] px-4 sm:px-6 py-8 sm:py-12">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 flex items-center gap-3" data-testid="text-reports-title">
              <AlertTriangle className="h-8 w-8" />
              Report an Issue
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Help us maintain a safe and respectful community on {settings.app_name}. If you've encountered inappropriate content, behavior, or have concerns about a user, product, or show, please let us know.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Submit a Report
                </CardTitle>
                <CardDescription>
                  Please provide as much detail as possible to help us investigate your report.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportType">What are you reporting? *</Label>
                    <Select
                      name="reportType"
                      value={formData.reportType}
                      onValueChange={(value) => handleSelectChange('reportType', value)}
                      required
                    >
                      <SelectTrigger data-testid="select-report-type">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="show">Live Show</SelectItem>
                        <SelectItem value="order">Order Issue</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reportedItem">Item ID or Username *</Label>
                    <Input
                      id="reportedItem"
                      name="reportedItem"
                      value={formData.reportedItem}
                      onChange={handleChange}
                      placeholder="Enter the username, product ID, or order number"
                      required
                      data-testid="input-reported-item"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Report *</Label>
                    <Select
                      name="reason"
                      value={formData.reason}
                      onValueChange={(value) => handleSelectChange('reason', value)}
                      required
                    >
                      <SelectTrigger data-testid="select-reason">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spam">Spam or Scam</SelectItem>
                        <SelectItem value="harassment">Harassment or Bullying</SelectItem>
                        <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                        <SelectItem value="counterfeit">Counterfeit Products</SelectItem>
                        <SelectItem value="fraud">Fraud or Deception</SelectItem>
                        <SelectItem value="violence">Violence or Threats</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Please provide details about why you're reporting this..."
                      rows={6}
                      required
                      data-testid="input-description"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.reportType || !formData.reportedItem || !formData.reason || !formData.description}
                    className="w-full"
                    data-testid="button-submit-report"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">Important Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  • Reports are reviewed by our team within 24-48 hours
                </p>
                <p>
                  • False or malicious reports may result in account restrictions
                </p>
                <p>
                  • We take all reports seriously and may take action including content removal or account suspension
                </p>
                <p>
                  • For urgent safety concerns, please contact us immediately through our support channels
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
