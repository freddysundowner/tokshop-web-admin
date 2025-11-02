import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  MapPin,
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Check,
  Clock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Country, State, City } from "country-state-city";

interface Step {
  id: 'address' | 'bank' | 'complete';
  title: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'address', title: 'Address', description: 'Shipping information' },
  { id: 'bank', title: 'Bank Account', description: 'Payout setup' },
  { id: 'complete', title: 'Complete', description: 'Finish setup' },
];

export default function SellerSetup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'address' | 'bank' | 'complete'>('address');
  
  // Address form state
  const [streetAddress, setStreetAddress] = useState("");
  const [streetAddress2, setStreetAddress2] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // Location data
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Bank account form state
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [bankPhoneNumber, setBankPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const userId = (user as any)?._id || user?.id;
  
  // Fetch fresh user data to check current seller/applied_seller status
  const { data: freshUserData, isLoading: userLoading } = useQuery<any>({
    queryKey: [`/api/profile/${userId}`],
    enabled: !!userId,
  });
  
  // Check if user already has an address
  const { data: existingAddress, isLoading: addressLoading } = useQuery<{ address: any | null }>({
    queryKey: [`/api/address/default/address/${userId}`],
    enabled: !!userId,
  });

  // Load countries on mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
    
    // Set US as default
    const us = allCountries.find(c => c.isoCode === 'US');
    if (us && !country) {
      setCountry(us.name);
      setCountryCode(us.isoCode);
      const usStates = State.getStatesOfCountry(us.isoCode);
      setStates(usStates);
    }
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (countryCode) {
      const countryStates = State.getStatesOfCountry(countryCode);
      setStates(countryStates);
    }
  }, [countryCode]);

  // Load cities when state changes
  useEffect(() => {
    if (countryCode && stateCode) {
      const stateCities = City.getCitiesOfState(countryCode, stateCode);
      setCities(stateCities);
    }
  }, [countryCode, stateCode]);

  // Skip address step if user already has one
  useEffect(() => {
    if (existingAddress?.address) {
      setCurrentStep('bank');
    }
  }, [existingAddress]);

  const handleCountryChange = (isoCode: string) => {
    const selectedCountry = countries.find(c => c.isoCode === isoCode);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      setCountryCode(selectedCountry.isoCode);
      setState("");
      setStateCode("");
      setCity("");
      setCities([]);
    }
  };

  const handleStateChange = (isoCode: string) => {
    const selectedState = states.find(s => s.isoCode === isoCode);
    if (selectedState) {
      setState(selectedState.name);
      setStateCode(selectedState.isoCode);
      setCity("");
    }
  };

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save address');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Address Saved",
        description: "Your address has been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/address/default/address'] });
      setCurrentStep('bank');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save address",
        variant: "destructive",
      });
    },
  });

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!streetAddress || !country || !state || !city || !zipCode || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const addressData = {
      name: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Default',
      addrress1: streetAddress,
      addrress2: streetAddress2,
      country: country,
      city: city,
      countryCode: countryCode,
      zipcode: zipCode,
      state: state,
      stateCode: stateCode,
      userId: userId,
      phone: phoneNumber.trim().replace(/\s/g, ''),
      email: user?.email || '',
      primary: false,
      applying: false,
    };

    createAddressMutation.mutate(addressData);
  };

  // Create bank account mutation
  const createBankAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/stripe/connect/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || 'Failed to create Stripe account');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success === false) {
        toast({
          title: "Error",
          description: data.error || "Failed to create Stripe account",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Bank Account Connected",
        description: "Your bank account has been connected successfully.",
      });
      setCurrentStep('complete');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!accountNumber || !routingNumber || !ssnLast4 || !bankPhoneNumber || !dateOfBirth) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check age requirement (must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const isOver18 = age > 18 || (age === 18 && monthDiff >= 0);
    
    if (!isOver18) {
      toast({
        title: "Age Requirement",
        description: "You must be at least 18 years old to become a seller.",
        variant: "destructive",
      });
      return;
    }

    // Parse date of birth
    const dob = new Date(dateOfBirth);
    
    // Get user address (either from existing address or from the form we just filled)
    const userAddress = existingAddress?.address || user?.address;
    
    // Build payload matching Flutter structure
    const payload = {
      country: "US",
      currency: "usd",
      account_number: accountNumber,
      city: userAddress?.city || city,
      state: userAddress?.state || state,
      day: dob.getDate().toString(),
      month: (dob.getMonth() + 1).toString(),
      year: dob.getFullYear().toString(),
      ssn_last_4: ssnLast4,
      line1: userAddress?.addrress1 || userAddress?.address1 || streetAddress,
      line2: userAddress?.addrress2 || userAddress?.address2 || streetAddress2 || "",
      postal_code: userAddress?.zipcode || zipCode,
      countryCode: userAddress?.countryCode || countryCode,
      phone: bankPhoneNumber,
      routing_number: routingNumber,
      email: user?.email || '',
      name: user?.firstName || '',
      first_name: user?.firstName || '',
      last_name: user?.lastName || '',
      create_address: !userAddress,
      account_holder_name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    };

    createBankAccountMutation.mutate(payload);
  };

  const handleFinishSetup = () => {
    if (user?.seller) {
      setLocation('/seller/hub');
    } else {
      toast({
        title: "Application Submitted",
        description: "Your seller application is being reviewed. You'll be notified once approved.",
      });
      setLocation('/marketplace');
    }
  };

  if (addressLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use fresh user data instead of cached auth context
  const currentUser = freshUserData || user;
  
  // Check if user has already applied and is waiting for approval
  const appliedSeller = currentUser?.applied_seller;
  const isSeller = currentUser?.seller;

  // If already applied but not approved, show review in progress page
  if (appliedSeller && !isSeller) {
    return (
      <div className="py-4 sm:py-6 lg:py-8 w-full" data-testid="page-seller-review">
        <div className="px-4 sm:px-6 lg:px-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="text-center space-y-6 py-8">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="h-10 w-10 text-yellow-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    Application Under Review
                  </h2>
                  <p className="text-muted-foreground text-base mb-2">
                    Your seller application is currently being reviewed by our team.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    We'll notify you via email at <span className="font-medium text-foreground">{currentUser?.email}</span> once your account is approved.
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm">
                        What happens next?
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Our team typically reviews applications within 1-2 business days. Once approved, you'll be able to list products, host live shows, and start selling on {settings.app_name}.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    onClick={() => setLocation('/marketplace')}
                    variant="outline"
                    size="lg"
                    data-testid="button-back-to-marketplace"
                  >
                    Return to Marketplace
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getCurrentStepIndex = () => {
    if (existingAddress?.address) {
      return STEPS.findIndex(s => s.id === currentStep);
    }
    return STEPS.findIndex(s => s.id === currentStep);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="py-4 sm:py-6 lg:py-8 w-full" data-testid="page-seller-setup">
      {/* Header */}
      <div className="mb-6 sm:mb-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2" data-testid="heading-seller-setup">
          Complete Seller Setup
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Set up your seller account to start selling on {settings.app_name}
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            // Skip address step in display if user has address
            if (step.id === 'address' && existingAddress?.address) {
              return null;
            }
            
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex || (step.id === 'address' && existingAddress?.address);
            const adjustedIndex = existingAddress?.address && step.id !== 'address' ? index - 1 : index;
            const totalSteps = existingAddress?.address ? STEPS.length - 1 : STEPS.length;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{adjustedIndex + 1}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs sm:text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {adjustedIndex < totalSteps - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-colors ${
                    isCompleted ? 'bg-green-500' : 'bg-muted'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Step 1: Address */}
        {currentStep === 'address' && !existingAddress?.address && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Shipping Address
              </CardTitle>
              <CardDescription>
                Enter your primary shipping address for order fulfillment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="street-address">Street Address *</Label>
                  <Input
                    id="street-address"
                    placeholder="123 Main Street"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    required
                    data-testid="input-street-address"
                  />
                </div>

                <div>
                  <Label htmlFor="street-address-2">Street Address 2 (Optional)</Label>
                  <Input
                    id="street-address-2"
                    placeholder="Apt, Suite, Unit, etc."
                    value={streetAddress2}
                    onChange={(e) => setStreetAddress2(e.target.value)}
                    data-testid="input-street-address-2"
                  />
                </div>

                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Select value={countryCode} onValueChange={handleCountryChange} required>
                    <SelectTrigger id="country" data-testid="select-country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {countries.map((country) => (
                        <SelectItem key={country.isoCode} value={country.isoCode}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state">State/Province *</Label>
                    <Select value={stateCode} onValueChange={handleStateChange} required disabled={!countryCode}>
                      <SelectTrigger id="state" data-testid="select-state">
                        <SelectValue placeholder="Select state/province" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {states.length > 0 ? (
                          states.map((state) => (
                            <SelectItem key={state.isoCode} value={state.isoCode}>
                              {state.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No states available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Select value={city} onValueChange={(value) => setCity(value)} required disabled={!stateCode}>
                      <SelectTrigger id="city" data-testid="select-city">
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {cities.length > 0 ? (
                          cities.map((cityItem) => (
                            <SelectItem key={cityItem.name} value={cityItem.name}>
                              {cityItem.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No cities available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="zip">ZIP/Postal Code *</Label>
                  <Input
                    id="zip"
                    placeholder="10001"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    data-testid="input-zip"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    data-testid="input-phone"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createAddressMutation.isPending}
                    data-testid="button-save-address"
                  >
                    {createAddressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Bank Account Setup */}
        {currentStep === 'bank' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Where do you want to withdraw your earnings to?
              </CardTitle>
              <CardDescription>
                Enter your bank account details to receive seller payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="account-number">Account Number *</Label>
                  <Input
                    id="account-number"
                    placeholder="000123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    data-testid="input-account-number"
                  />
                </div>

                <div>
                  <Label htmlFor="routing-number">Routing Number *</Label>
                  <Input
                    id="routing-number"
                    placeholder="110000000"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    required
                    data-testid="input-routing-number"
                  />
                </div>

                <div>
                  <Label htmlFor="ssn-last4">SSN Last 4 Digits *</Label>
                  <Input
                    id="ssn-last4"
                    placeholder="0000"
                    maxLength={4}
                    value={ssnLast4}
                    onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, ''))}
                    required
                    data-testid="input-ssn-last4"
                  />
                </div>

                <div>
                  <Label htmlFor="bank-phone">Phone Number *</Label>
                  <Input
                    id="bank-phone"
                    type="tel"
                    placeholder="+17297409480"
                    value={bankPhoneNumber}
                    onChange={(e) => setBankPhoneNumber(e.target.value)}
                    required
                    data-testid="input-bank-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                    data-testid="input-dob"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  {!existingAddress?.address && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('address')}
                      type="button"
                      data-testid="button-back"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createBankAccountMutation.isPending}
                    data-testid="button-save-bank"
                  >
                    {createBankAccountMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save and Continue'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Setup Complete!
                  </h2>
                  <p className="text-muted-foreground">
                    {user?.seller 
                      ? "Your seller account is ready. Start listing products and hosting shows!"
                      : "Your application has been submitted. An admin will review your account and contact you soon."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    onClick={handleFinishSetup}
                    size="lg"
                    data-testid="button-finish-setup"
                  >
                    {user?.seller ? 'Go to Seller Hub' : 'Return to Marketplace'}
                  </Button>
                  {!user?.seller && (
                    <p className="text-sm text-muted-foreground">
                      We'll email you at <span className="font-medium">{user?.email}</span> once your account is approved.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
