import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  FileText,
  Shield,
  MessageCircle,
  Mail,
  ExternalLink,
  ChevronRight,
  Search,
} from "lucide-react";
import { useState } from "react";

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const quickLinks = [
    {
      icon: HelpCircle,
      title: "FAQ",
      description: "Find answers to commonly asked questions",
      href: "/faq",
      testId: "link-faq",
    },
    {
      icon: FileText,
      title: "Terms of Service",
      description: "Read our terms and conditions",
      href: "/terms-of-service",
      testId: "link-terms",
    },
    {
      icon: Shield,
      title: "Privacy Policy",
      description: "Learn how we protect your data",
      href: "/privacy-policy",
      testId: "link-privacy",
    },
    {
      icon: MessageCircle,
      title: "Contact Support",
      description: "Get help from our support team",
      href: "/contact",
      testId: "link-contact",
    },
  ];

  const faqs = [
    {
      question: "How do I create an account?",
      answer: "You can create an account by clicking the 'Sign Up' button on the homepage. Fill in your details including email, password, and basic information. You'll receive a verification email to activate your account.",
    },
    {
      question: "How do I reset my password?",
      answer: "Click on 'Forgot Password' on the login page. Enter your email address and we'll send you a link to reset your password. The link will be valid for 24 hours.",
    },
    {
      question: "How do I become a seller?",
      answer: "Go to your account settings and select 'Become a Seller'. You'll need to provide additional information including business details, payment information, and agree to our seller terms. Once verified, you can start listing items and hosting live shows.",
    },
    {
      question: "How do refunds work?",
      answer: "Refunds are processed within 5-7 business days to your original payment method. If you need a refund, contact the seller first. If unresolved, you can open a dispute through your order page.",
    },
    {
      question: "How do I track my order?",
      answer: "You can track your order by going to 'Purchases' in your profile menu. Click on the specific order to see tracking information. You'll also receive email updates when your order ships.",
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept all major credit cards (Visa, Mastercard, American Express), debit cards, and digital wallets. All payments are processed securely through Stripe.",
    },
    {
      question: "How do I join a live show?",
      answer: "Browse live shows on the homepage. Click on any live show to join. You can interact with the host, bid on items, and make purchases in real-time.",
    },
    {
      question: "How do I delete my account?",
      answer: "Go to Account Permissions in your profile menu, scroll to the bottom, and click 'Delete Account'. Note that this action is permanent and cannot be undone.",
    },
  ];

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Support message:", supportMessage);
    setSupportMessage("");
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-help">
      <div className="w-full p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="heading-help">Help & Legal</h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-description">
            Find answers, get support, and review our policies
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.testId} href={link.href}>
              <Card className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full" data-testid={link.testId}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">
                        {link.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {link.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Search FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Help Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-help"
              />
            </div>
          </CardContent>
        </Card>

        {/* Frequently Asked Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Quick answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left" data-testid={`faq-question-${index}`}>
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground" data-testid={`faq-answer-${index}`}>
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Support
            </CardTitle>
            <CardDescription>
              Can't find what you're looking for? Send us a message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block" data-testid="label-support-message">
                  How can we help?
                </label>
                <Textarea
                  placeholder="Describe your issue or question..."
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows={5}
                  data-testid="textarea-support-message"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" className="flex-1" data-testid="button-submit-support">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open('/contact', '_blank')}
                  data-testid="button-contact-page"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Contact Page
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Support Hours */}
        <Card data-testid="card-support-hours">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground" data-testid="text-support-hours-title">Support Hours</p>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-support-hours-description">
                  Our support team is available Monday - Friday, 9:00 AM - 6:00 PM EST.
                  We aim to respond to all inquiries within 24 hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legal Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Legal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/terms-of-service">
              <button
                className="flex items-center justify-between w-full py-3 px-4 rounded-lg hover-elevate active-elevate-2 transition-all"
                data-testid="button-terms-of-service"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground">Terms of Service</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>
            <Link href="/privacy-policy">
              <button
                className="flex items-center justify-between w-full py-3 px-4 rounded-lg hover-elevate active-elevate-2 transition-all"
                data-testid="button-privacy-policy"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground">Privacy Policy</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
