import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/queryClient';
import { Country, State, City } from 'country-state-city';

interface AddAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  address?: any; // Optional address data for editing
}

export function AddAddressDialog({
  open,
  onOpenChange,
  onSuccess,
  address, // For editing existing address
}: AddAddressDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const userData = user as any;
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!address; // Determine if we're in edit mode

  // Form state
  const [streetAddress, setStreetAddress] = useState("");
  const [streetAddress2, setStreetAddress2] = useState("");
  const [country, setCountry] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");

  // Location data
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Load countries on mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
    
    // If editing, populate form with existing address data
    if (address) {
      setName(address.name || "");
      setStreetAddress(address.addrress1 || address.address1 || "");
      setStreetAddress2(address.addrress2 || address.address2 || "");
      setCity(address.city || "");
      setState(address.state || "");
      setZipCode(address.zipcode || address.zip || "");
      setPhoneNumber(address.phone || "");
      
      // Set country
      const addressCountry = allCountries.find(c => 
        c.isoCode === address.countryCode || c.name === address.country
      );
      if (addressCountry) {
        setCountry(addressCountry.name);
        setCountryCode(addressCountry.isoCode);
        
        // Load states for the country
        const countryStates = State.getStatesOfCountry(addressCountry.isoCode);
        setStates(countryStates);
        
        // Set state
        const addressState = countryStates.find(s => 
          s.name === address.state || s.isoCode === address.stateCode
        );
        if (addressState) {
          setStateCode(addressState.isoCode);
          
          // Load cities for the state
          const stateCities = City.getCitiesOfState(addressCountry.isoCode, addressState.isoCode);
          setCities(stateCities);
        }
      }
    } else {
      // Set US as default for new addresses
      const us = allCountries.find(c => c.isoCode === 'US');
      if (us && !country) {
        setCountry(us.name);
        setCountryCode(us.isoCode);
        // Load US states
        const usStates = State.getStatesOfCountry(us.isoCode);
        setStates(usStates);
      }
    }
  }, [address]);

  // Load states when country changes
  useEffect(() => {
    if (countryCode) {
      const countryStates = State.getStatesOfCountry(countryCode);
      setStates(countryStates);
      // Don't reset state and city when country changes if we're in edit mode
      if (!address) {
        setState("");
        setStateCode("");
        setCity("");
        setCities([]);
      }
    }
  }, [countryCode]);

  // Load cities when state changes (no longer needed but keeping for future use)
  useEffect(() => {
    if (countryCode && stateCode) {
      const stateCities = City.getCitiesOfState(countryCode, stateCode);
      setCities(stateCities);
      // Don't reset city when state changes if we're in edit mode
      if (!address) {
        setCity("");
      }
    }
  }, [countryCode, stateCode]);

  const handleAddAddress = async () => {
    // Validate required fields
    if (!streetAddress || !country || !state || !city || !zipCode || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Prepare address data - matching Flutter's ShippingAddress structure
      const addressData = {
        name: name || userData?.firstName || 'Default',
        addrress1: streetAddress,
        addrress2: streetAddress2,
        country: country,
        city: city,
        countryCode: countryCode,
        zipcode: zipCode,
        state: state,
        stateCode: stateCode,
        userId: userData?.id,
        phone: phoneNumber.trim().replace(/\s/g, ''),
        email: userData?.email || '',
        primary: address?.primary || false,
        applying: false,
      };

      // Use PUT for editing, POST for creating
      if (isEditing && address._id) {
        await apiRequest('PUT', `/api/address/${address._id}`, addressData);
        toast({
          title: "Address Updated",
          description: "Your shipping address has been updated successfully.",
        });
      } else {
        await apiRequest('POST', '/api/address', addressData);
        toast({
          title: "Address Added",
          description: "Your shipping address has been saved successfully.",
        });
      }
      
      // Reset form
      setStreetAddress("");
      setStreetAddress2("");
      // Reset to US default
      const us = countries.find(c => c.isoCode === 'US');
      if (us) {
        setCountry(us.name);
        setCountryCode(us.isoCode);
        const usStates = State.getStatesOfCountry(us.isoCode);
        setStates(usStates);
      }
      setState("");
      setStateCode("");
      setCity("");
      setCities([]);
      setZipCode("");
      setPhoneNumber("");
      setName("");
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to add/update address:', error);
      
      // Extract error message from API response
      let errorMessage = isEditing 
        ? "Failed to update address. Please try again." 
        : "Failed to add address. Please try again.";
      
      if (error?.text) {
        try {
          const errorData = JSON.parse(error.text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If parsing fails, use the text as-is if it's a string
          if (typeof error.text === 'string') {
            errorMessage = error.text;
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountryChange = (isoCode: string) => {
    const selectedCountry = countries.find(c => c.isoCode === isoCode);
    if (selectedCountry) {
      setCountry(selectedCountry.name);
      setCountryCode(selectedCountry.isoCode);
    }
  };

  const handleStateChange = (isoCode: string) => {
    const selectedState = states.find(s => s.isoCode === isoCode);
    if (selectedState) {
      setState(selectedState.name);
      setStateCode(selectedState.isoCode);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-address">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Address" : "Add New Address"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update your shipping address." : "Add a new shipping or billing address."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="street-address">Street Address</Label>
            <Input
              id="street-address"
              placeholder="123 Main Street"
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              data-testid="input-street-address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="street-address-2">Street Address 2 (Optional)</Label>
            <Input
              id="street-address-2"
              placeholder="Apt, Suite, Unit, etc."
              value={streetAddress2}
              onChange={(e) => setStreetAddress2(e.target.value)}
              data-testid="input-street-address-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Select value={countryCode} onValueChange={handleCountryChange}>
              <SelectTrigger id="country" data-testid="select-country">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="z-[9999] max-h-[200px]">
                {countries.map((country) => (
                  <SelectItem key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Select value={stateCode} onValueChange={handleStateChange} disabled={!countryCode}>
                <SelectTrigger id="state" data-testid="select-state">
                  <SelectValue placeholder="Select state/province" />
                </SelectTrigger>
                <SelectContent className="z-[9999] max-h-[200px]">
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
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Select value={city} onValueChange={(value) => setCity(value)} disabled={!stateCode}>
                <SelectTrigger id="city" data-testid="select-city">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="z-[9999] max-h-[200px]">
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
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP/Postal Code</Label>
            <Input
              id="zip"
              placeholder="10001"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              data-testid="input-zip"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              data-testid="input-phone"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            data-testid="button-cancel" 
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddAddress} 
            disabled={isLoading}
            data-testid="button-add-address" 
            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {isLoading ? (isEditing ? "Updating..." : "Adding...") : (isEditing ? "Update Address" : "Add Address")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
