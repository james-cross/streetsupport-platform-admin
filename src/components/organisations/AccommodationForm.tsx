'use client';

import React, { useState, useEffect, useImperativeHandle, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ValidationError } from '@/components/ui/ErrorDisplay';
import { IAccommodation, IAccommodationFormData, DiscretionaryValue } from '@/types/organisations/IAccommodation';
import { AccommodationType } from '@/types/organisations/IAccommodation';
import { validateAccommodation } from '@/schemas/accommodationSchema';
import { prepareContentForTextarea } from '@/utils/htmlUtils';
import { GeneralInfoSection } from './accommodation-sections/GeneralInfoSection';
import { ContactDetailsSection } from './accommodation-sections/ContactDetailsSection';
import { LocationSection } from './accommodation-sections/LocationSection';
import { PricingSection } from './accommodation-sections/PricingSection';
import { FeaturesSection } from './accommodation-sections/FeaturesSection';
import { SupportSection } from './accommodation-sections/SupportSection';
import { SuitableForSection } from './accommodation-sections/SuitableForSection';

export interface AccommodationFormRef {
  validate: () => boolean;
  getFormData: () => IAccommodationFormData;
  resetForm: () => void;
}

interface AccommodationFormProps {
  initialData?: IAccommodation | null;
  providerId: string;
  availableCities: Array<{ _id: string; Name: string; Key: string }>;
  onValidationChange?: (errors: ValidationError[]) => void;
  viewMode?: boolean;
}

interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  hasErrors?: boolean;
}

function CollapsibleSection({ title, isOpen, onToggle, children, hasErrors }: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
          hasErrors ? 'bg-red-50' : ''
        }`}
      >
        <h3 className={`text-lg font-semibold ${hasErrors ? 'text-red-700' : 'text-gray-900'}`}>
          {title}
          {hasErrors && <span className="ml-2 text-sm text-red-600">(Has errors)</span>}
        </h3>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

export const AccommodationForm = React.forwardRef<AccommodationFormRef, AccommodationFormProps>(({
  initialData,
  providerId,
  availableCities,
  onValidationChange,
  viewMode = false
}, ref) => {
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Section collapse states
  const [openSections, setOpenSections] = useState({
    generalInfo: true,
    contact: false,
    location: false,
    pricing: false,
    features: false,
    support: false,
    suitableFor: false
  });

  // Initialize form data based on add/edit mode
  const getInitialFormData = useCallback((): IAccommodationFormData => {
    if (initialData) {
      return {
        GeneralInfo: {
          ...initialData.GeneralInfo,
          Description: prepareContentForTextarea(initialData.GeneralInfo.Description || ''),
        },
        PricingAndRequirementsInfo: initialData.PricingAndRequirementsInfo,
        ContactInformation: initialData.ContactInformation,
        Address: initialData.Address,
        FeaturesWithDiscretionary: initialData.FeaturesWithDiscretionary,
        ResidentCriteriaInfo: initialData.ResidentCriteriaInfo,
        SupportProvidedInfo: initialData.SupportProvidedInfo
      };
    }
    return {
      GeneralInfo: {
        Name: '',
        Synopsis: '',
        Description: '',
        AccommodationType: '' as AccommodationType, // Empty string for placeholder, will be validated on submit
        ServiceProviderId: providerId,
        ServiceProviderName: '',
        IsOpenAccess: false,
        IsPubliclyVisible: true,
        IsPublished: false
      },
      PricingAndRequirementsInfo: {
        ReferralIsRequired: false,
        ReferralNotes: '',
        Price: '',
        FoodIsIncluded: DiscretionaryValue.DontKnowAsk,
        AvailabilityOfMeals: ''
      },
      ContactInformation: {
        Name: '',
        Email: '',
        Telephone: '',
        AdditionalInfo: ''
      },
      Address: {
        Street1: '',
        Street2: '',
        Street3: '',
        City: '',
        Postcode: '',
        AssociatedCityId: ''
      },
      FeaturesWithDiscretionary: {
        AcceptsHousingBenefit: DiscretionaryValue.DontKnowAsk,
        AcceptsPets: DiscretionaryValue.DontKnowAsk,
        AcceptsCouples: DiscretionaryValue.DontKnowAsk,
        HasDisabledAccess: DiscretionaryValue.DontKnowAsk,
        IsSuitableForWomen: DiscretionaryValue.DontKnowAsk,
        IsSuitableForYoungPeople: DiscretionaryValue.DontKnowAsk,
        HasSingleRooms: DiscretionaryValue.DontKnowAsk,
        HasSharedRooms: DiscretionaryValue.DontKnowAsk,
        HasShowerBathroomFacilities: DiscretionaryValue.DontKnowAsk,
        HasAccessToKitchen: DiscretionaryValue.DontKnowAsk,
        HasLaundryFacilities: DiscretionaryValue.DontKnowAsk,
        HasLounge: DiscretionaryValue.DontKnowAsk,
        AllowsVisitors: DiscretionaryValue.DontKnowAsk,
        HasOnSiteManager: DiscretionaryValue.DontKnowAsk,
        AdditionalFeatures: ''
      },
      ResidentCriteriaInfo: {
        AcceptsMen: false,
        AcceptsWomen: false,
        AcceptsCouples: false,
        AcceptsYoungPeople: false,
        AcceptsFamilies: false,
        AcceptsBenefitsClaimants: false
      },
      SupportProvidedInfo: {
        SupportOffered: [],
        SupportInfo: ''
      }
    };
  }, [initialData, providerId]);

  const [formData, setFormData] = useState<IAccommodationFormData>(getInitialFormData);

  // Reset form when initialData changes
  useEffect(() => {
    setFormData(getInitialFormData());
    setValidationErrors([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, providerId]);

  // Notify parent of validation changes
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(validationErrors);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationErrors]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFieldChange = (field: string, value: string | boolean | number | DiscretionaryValue | AccommodationType | string[]) => {
    const keys = field.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const getErrorsForSection = (prefix: string): Record<string, string> => {
    const errors: Record<string, string> = {};
    validationErrors.forEach(error => {
      if (error.Path.startsWith(prefix)) {
        errors[error.Path] = error.Message;
      }
    });
    return errors;
  };

  const hasSectionErrors = (prefix: string): boolean => {
    return validationErrors.some(error => error.Path.startsWith(prefix));
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    validate: () => {
      // Use schema validation
      const result = validateAccommodation(formData);
      
      if (!result.success) {
        const errors = result.errors.map((error: { path: string[] | string; message: string }) => ({
          Path: Array.isArray(error.path) ? error.path.join('.') : error.path,
          Message: error.message
        }));
        setValidationErrors(errors);
        return false;
      }
      
      setValidationErrors([]);
      return true;
    },
    getFormData: () => formData,
    resetForm: () => {
      setFormData(getInitialFormData());
      setValidationErrors([]);
      setOpenSections({
        generalInfo: true,
        contact: false,
        location: false,
        pricing: false,
        features: false,
        support: false,
        suitableFor: false
      });
    }
  }));

  return (
    <div className="space-y-4">
      {/* General Information */}
      <CollapsibleSection
        title="General Information"
        isOpen={openSections.generalInfo}
        onToggle={() => toggleSection('generalInfo')}
        hasErrors={hasSectionErrors('GeneralInfo')}
      >
        <GeneralInfoSection
          formData={formData.GeneralInfo}
          onChange={handleFieldChange}
          viewMode={viewMode}
        />
      </CollapsibleSection>

      {/* Contact Details */}
      <CollapsibleSection
        title="Contact Details"
        isOpen={openSections.contact}
        onToggle={() => toggleSection('contact')}
        hasErrors={hasSectionErrors('ContactInformation')}
      >
        <ContactDetailsSection
          formData={formData.ContactInformation}
          onChange={handleFieldChange}
          viewMode={viewMode}
        />
      </CollapsibleSection>

      {/* Location */}
      <CollapsibleSection
        title="Location"
        isOpen={openSections.location}
        onToggle={() => toggleSection('location')}
        hasErrors={hasSectionErrors('Address')}
      >
        <LocationSection
          formData={formData.Address}
          onChange={handleFieldChange}
          availableCities={availableCities}
          viewMode={viewMode}
        />
      </CollapsibleSection>

      {/* Pricing & Requirements */}
      <CollapsibleSection
        title="Pricing and Requirements"
        isOpen={openSections.pricing}
        onToggle={() => toggleSection('pricing')}
        hasErrors={hasSectionErrors('PricingAndRequirementsInfo')}
      >
        <PricingSection
          formData={formData.PricingAndRequirementsInfo}
          onChange={handleFieldChange}
          errors={getErrorsForSection('PricingAndRequirementsInfo')}
          viewMode={viewMode}
        />
      </CollapsibleSection>

      {/* Features */}
      <CollapsibleSection
        title="Features"
        isOpen={openSections.features}
        onToggle={() => toggleSection('features')}
        hasErrors={hasSectionErrors('FeaturesWithDiscretionary')}
      >
        <FeaturesSection
          formData={formData.FeaturesWithDiscretionary}
          onChange={handleFieldChange}
          errors={getErrorsForSection('FeaturesWithDiscretionary')}
          viewMode={viewMode}
        />
      </CollapsibleSection>

      {/* Support */}
      <CollapsibleSection
        title="Support Provided"
        isOpen={openSections.support}
        onToggle={() => toggleSection('support')}
        hasErrors={hasSectionErrors('SupportProvidedInfo')}
      >
        <SupportSection
          formData={formData.SupportProvidedInfo}
          onChange={handleFieldChange}
          viewMode={viewMode}
        />
      </CollapsibleSection>

      {/* Suitable For */}
      <CollapsibleSection
        title="Suitable For"
        isOpen={openSections.suitableFor}
        onToggle={() => toggleSection('suitableFor')}
        hasErrors={hasSectionErrors('ResidentCriteriaInfo')}
      >
        <SuitableForSection
          formData={formData.ResidentCriteriaInfo}
          onChange={handleFieldChange}
          viewMode={viewMode}
        />
      </CollapsibleSection>
    </div>
  );
});

AccommodationForm.displayName = 'AccommodationForm';
