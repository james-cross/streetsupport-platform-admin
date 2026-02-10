'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { RichTextEditor, DESCRIPTION_TOOLBAR_FEATURES, DESCRIPTION_ALLOWED_TAGS } from '@/components/ui/RichTextEditor';
import { OpeningTimesManager } from '@/components/organisations/OpeningTimesManager';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ErrorDisplay, { ValidationError } from '@/components/ui/ErrorDisplay';
import { IOrganisation } from '@/types/organisations/IOrganisation';
import { IGroupedService } from '@/types/organisations/IGroupedService';
import { IServiceCategory } from '@/types/organisations/IServiceCategory';
import { IClientGroup } from '@/types/organisations/IClientGroup';
import { IOpeningTimeFormData } from '@/types/organisations/IOrganisation';
import { IGroupedServiceFormData, validateGroupedService, transformErrorPath } from '@/schemas/groupedServiceSchema';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { errorToast, successToast } from '@/utils/toast';
import { decodeText } from '@/utils/htmlDecode';
import { Textarea } from '@/components/ui/Textarea';
import { prepareContentForEditor, getTextLengthFromHtml } from '@/utils/htmlUtils';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  organisation: IOrganisation;
  service?: IGroupedService | null;
  onServiceSaved: () => void;
  viewMode?: boolean; // When true, all inputs are disabled and save button hidden
}

const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  organisation,
  service,
  onServiceSaved,
  viewMode = false
}) => {
  const [formData, setFormData] = useState<IGroupedServiceFormData>({
    ProviderId: organisation._id,
    ProviderName: organisation.Name,
    IsPublished: false,
    IsVerified: false,
    CategoryId: '',
    Location: {
      IsOutreachLocation: false,
      Description: '',
      StreetLine1: '',
      Postcode: ''
    },
    IsOpen247: false,
    SubCategories: [],
    IsTelephoneService: false,
    IsAppointmentOnly: false,
    ClientGroupKeys: []
  });

  const [categories, setCategories] = useState<IServiceCategory[]>([]);
  const [clientGroups, setClientGroups] = useState<IClientGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<IServiceCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showCancelConfirm, setShowConfirmModal] = useState(false);
  const [originalData, setOriginalData] = useState<IGroupedServiceFormData | null>(null);
  const infoPreparedRef = useRef(false);

  // Initialize form data when service prop changes
  useEffect(() => {
    if (service) {
      // Convert existing service to form data format
      const openingTimes = service.OpeningTimes?.map(ot => ({
        Day: ot.Day,
        StartTime: typeof ot.StartTime === 'number' ? 
          `${Math.floor(ot.StartTime / 100).toString().padStart(2, '0')}:${(ot.StartTime % 100).toString().padStart(2, '0')}` : 
          ot.StartTime,
        EndTime: typeof ot.EndTime === 'number' ? 
          `${Math.floor(ot.EndTime / 100).toString().padStart(2, '0')}:${(ot.EndTime % 100).toString().padStart(2, '0')}` : 
          ot.EndTime
      })) || [];

      const initialData: IGroupedServiceFormData = {
        _id: service._id,
        ProviderId: service.ProviderId,
        ProviderName: service.ProviderName || organisation.Name,
        IsPublished: service.IsPublished,
        IsVerified: service.IsVerified,
        CategoryId: service.CategoryId,
        CategoryName: decodeText(service.CategoryName || ''),
        CategorySynopsis: decodeText(service.CategorySynopsis || ''),
        Info: prepareContentForEditor(service.Info || ''),
        Tags: service.Tags,
        Location: {
          IsOutreachLocation: service.Location.IsOutreachLocation || false,
          Description: decodeText(service.Location.Description || ''),
          StreetLine1: decodeText(service.Location.StreetLine1 || ''),
          StreetLine2: service.Location.StreetLine2 || '',
          StreetLine3: service.Location.StreetLine3 || '',
          StreetLine4: service.Location.StreetLine4 || '',
          City: service.Location.City || '',
          Postcode: service.Location.Postcode || '',
          Location: service.Location.Location ? {
            type: service.Location.Location.type,
            coordinates: service.Location.Location.coordinates
          } : undefined
        },
        IsOpen247: service.IsOpen247,
        OpeningTimes: openingTimes,
        SubCategories: service.SubCategories?.map(sub => ({
          ...sub,
          Name: sub.Name || '',
          Synopsis: sub.Synopsis || ''
        })) || [],
        IsTelephoneService: service.IsTelephoneService,
        IsAppointmentOnly: service.IsAppointmentOnly,
        Telephone: service.Telephone || '',
        ClientGroupKeys: service.ClientGroupKeys || []
      };
      setFormData(initialData);
      setOriginalData(JSON.parse(JSON.stringify(initialData)));
    } else {
      // Reset form for new service
      const initialData: IGroupedServiceFormData = {
        ProviderId: organisation.Key,
        ProviderName: organisation.Name,
        IsPublished: organisation.IsPublished,
        IsVerified: organisation.IsVerified,
        CategoryId: '',
        Location: {
          IsOutreachLocation: false,
          Description: '',
          StreetLine1: '',
          Postcode: ''
        },
        IsOpen247: false,
        SubCategories: [],
        IsTelephoneService: false,
        IsAppointmentOnly: false,
        Telephone: '',
        ClientGroupKeys: []
      };
      setFormData(initialData);
      setOriginalData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [service, organisation._id, organisation.IsPublished, organisation.IsVerified, organisation.Key, organisation.Name]);

  // Prepare legacy Info content for the editor on initial load
  useEffect(() => {
    if (!infoPreparedRef.current && formData.Info) {
      const prepared = prepareContentForEditor(formData.Info);
      if (prepared !== formData.Info) {
        setFormData(prev => ({ ...prev, Info: prepared }));
      }
      infoPreparedRef.current = true;
    }
  }, [formData.Info]);

  // Reset the ref when the service prop changes (new service loaded)
  useEffect(() => {
    infoPreparedRef.current = false;
  }, [service]);

  // Fetch service categories
  useEffect(() => {
    if (!organisation.Key) return;
    
    const fetchCategories = async () => {
      try {
        const response = await authenticatedFetch('/api/service-categories');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch service categories');
        }
        const data = await response.json();
        setCategories(data.data || []);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load service categories';
        errorToast.generic(errorMessage);
      }
    };

    if (isOpen) {
      fetchCategories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Fetch client groups
  useEffect(() => {
    const fetchClientGroups = async () => {
      try {
        const response = await authenticatedFetch('/api/client-groups');
        if (response.ok) {
          const data = await response.json();
          setClientGroups(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching client groups:', error);
      }
    };

    if (isOpen) {
      fetchClientGroups();
    }
  }, [isOpen]);

  // Update selected category when category ID changes
  useEffect(() => {
    if (formData.CategoryId && categories.length > 0) {
      const category = categories.find(cat => cat._id === formData.CategoryId);
      setSelectedCategory(category || null);
    } else {
      setSelectedCategory(null);
    }
  }, [formData.CategoryId, categories]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFormData = (field: keyof IGroupedServiceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(error => !error.Path.startsWith(field)));
  };

  const handleIsOpen247Change = (checked: boolean) => {
    let openingTimes: IOpeningTimeFormData[] = [];
    
    if (checked) {
      // Generate 24/7 opening times for all days (Monday=0 to Sunday=6)
      // IsOpen247 has priority - even if IsAppointmentOnly is also checked
      openingTimes = Array.from({ length: 7 }, (_, day) => ({
        Day: day,
        StartTime: '00:00',
        EndTime: '23:59'
      }));
    } else {
      // Keep existing opening times when unchecking
      openingTimes = formData.OpeningTimes || [];
    }
    
    setFormData(prev => ({
      ...prev,
      IsOpen247: checked,
      OpeningTimes: openingTimes
    }));
    // Clear validation errors
    setValidationErrors(prev => prev.filter(error => !error.Path.startsWith('Opening Times')));
  };

  const handleIsAppointmentOnlyChange = (checked: boolean) => {
    // IsAppointmentOnly can now coexist with opening times - don't clear them
    setFormData(prev => ({
      ...prev,
      IsAppointmentOnly: checked
    }));
    // Clear validation errors
    setValidationErrors(prev => prev.filter(error => !error.Path.startsWith('Opening Times')));
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    if (category) {
      setFormData(prev => ({
        ...prev,
        CategoryId: categoryId,
        CategoryName: category.Name,
        CategorySynopsis: category.Synopsis,
        SubCategories: []
      }));
      // Clear validation errors
      setValidationErrors(prev => prev.filter(error => 
        !error.Path.startsWith('Category') && !error.Path.startsWith('Sub Categories')
      ));
    }
  };

  const handleSubCategoriesChange = (selectedIds: string[]) => {
    if (!selectedCategory) return;

    const selectedSubCategories = selectedCategory.SubCategories.filter(sub => 
      selectedIds.includes(sub.Key)
    ).map(sub => ({
      _id: sub.Key,
      Name: sub.Name,
      Synopsis: sub.Synopsis
    }));

    setFormData(prev => ({
      ...prev,
      SubCategories: selectedSubCategories
    }));

    // Clear validation errors for subcategories
    setValidationErrors(prev => prev.filter(error => !error.Path.startsWith('Sub Categories')));
  };

  const handleIsOutreachLocationChange = (isOutreach: boolean) => {
    setFormData(prev => ({
      ...prev,
      Location: {
        ...prev.Location,
        IsOutreachLocation: isOutreach,
        // Clear fields based on type
        Description: isOutreach ? prev.Location.Description : '',
        StreetLine1: isOutreach ? '' : prev.Location.StreetLine1,
        StreetLine2: isOutreach ? '' : prev.Location.StreetLine2,
        StreetLine3: isOutreach ? '' : prev.Location.StreetLine3,
        StreetLine4: isOutreach ? '' : prev.Location.StreetLine4,
        City: isOutreach ? '' : prev.Location.City,
        Postcode: isOutreach ? '' : prev.Location.Postcode,
        Location: isOutreach ? undefined : prev.Location.Location
      },
      // Clear opening times when switching to outreach or fixed location
      IsOpen247: false,
      IsAppointmentOnly: false,
      OpeningTimes: []
    }));
  };

  const handleAddressSelect = (addressIndex: string) => {
    if (addressIndex === '') {
      // Clear address fields
      setFormData(prev => ({
        ...prev,
        Location: {
          ...prev.Location,
          StreetLine1: '',
          StreetLine2: '',
          StreetLine3: '',
          StreetLine4: '',
          City: '',
          Postcode: '',
          Location: undefined
        },
        IsOpen247: false,
        IsAppointmentOnly: false,
        OpeningTimes: []
      }));
      return;
    }

    const index = parseInt(addressIndex);
    const address = organisation.Addresses[index];
    if (address) {
      // Auto-populate location fields AND opening times from selected address
      const openingTimes = address.OpeningTimes?.map(ot => ({
        Day: ot.Day,
        StartTime: typeof ot.StartTime === 'number' ? 
          `${Math.floor(ot.StartTime / 100).toString().padStart(2, '0')}:${(ot.StartTime % 100).toString().padStart(2, '0')}` : 
          String(ot.StartTime),
        EndTime: typeof ot.EndTime === 'number' ? 
          `${Math.floor(ot.EndTime / 100).toString().padStart(2, '0')}:${(ot.EndTime % 100).toString().padStart(2, '0')}` : 
          String(ot.EndTime)
      })) || [];

      setFormData(prev => ({
        ...prev,
        Location: {
          ...prev.Location,
          StreetLine1: address.Street || '',
          StreetLine2: address.Street1 || '',
          StreetLine3: address.Street2 || '',
          StreetLine4: address.Street3 || '',
          City: address.City || '',
          Postcode: address.Postcode || '',
          Location: address.Location ? {
            type: address.Location.type,
            coordinates: address.Location.coordinates
          } : undefined
        },
        IsOpen247: address.IsOpen247 || false,
        IsAppointmentOnly: address.IsAppointmentOnly || false,
        OpeningTimes: openingTimes
      }));
    }
  };

  const handleOpeningTimesChange = (openingTimes: IOpeningTimeFormData[]) => {
    updateFormData('OpeningTimes', openingTimes);
  };

  // Helper function to convert time string (HH:MM) to number (HHMM)
  const timeStringToNumber = (timeString: string): number => {
    return parseInt(timeString.replace(':', ''));
  };

  const validateForm = (): boolean => {

    // Then validate the rest using GroupedServiceSchema
    const result = validateGroupedService(formData);

    // Combine all errors
    const allErrors: { Path: string; Message: string }[] = [];
    if (!result.success) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serviceErrors = (result.errors || []).map((error: any) => {
        const originalPath = Array.isArray(error.path) ? error.path.join('.') : error.path;
        return {
          Path: transformErrorPath(originalPath),
          Message: error.message
        };
      });
      allErrors.push(...serviceErrors);
    }
    
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return false;
    }
    
    setValidationErrors([]);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      errorToast.validation();
      return;
    }

    setIsLoading(true);

    try {
      // Convert opening times from string format to number format for API
      const submissionData = {
        ...formData,
        OpeningTimes: formData.OpeningTimes?.map(ot => ({
          Day: ot.Day,
          StartTime: timeStringToNumber(ot.StartTime),
          EndTime: timeStringToNumber(ot.EndTime)
        }))
      };

      const url = service 
        ? `/api/organisations/${service.ProviderId}/services/${service._id}`
        : `/api/organisations/${submissionData.ProviderId}/services`;
      
      const method = service ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${service ? 'update' : 'create'} service`);
      }

      if (service) {
        successToast.update('Service');
      } else {
        successToast.create('Service');
      }
      
      // Reset form to initial state for next use
      const initialData: IGroupedServiceFormData = {
        ProviderId: organisation.Key,
        ProviderName: organisation.Name,
        IsPublished: organisation.IsPublished,
        IsVerified: organisation.IsVerified,
        CategoryId: '',
        Location: {
          IsOutreachLocation: false,
          Description: '',
          StreetLine1: '',
          Postcode: ''
        },
        IsOpen247: false,
        SubCategories: [],
        IsTelephoneService: false,
        IsAppointmentOnly: false,
        Telephone: '',
        ClientGroupKeys: []
      };
      setFormData(initialData);
      setOriginalData(JSON.parse(JSON.stringify(initialData)));
      setValidationErrors([]);

      onServiceSaved(); // Trigger parent refresh
      onClose(); // Close the modal
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${service ? 'update' : 'create'} service`;
      errorToast.generic(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (viewMode) {
      onClose();
      return;
    }
    
    // Check if form data has changed
    if (originalData && JSON.stringify(formData) !== JSON.stringify(originalData)) {
      setShowConfirmModal(true);
    } else {
      onClose();
    }
  };

  const confirmCancel = () => {
    setValidationErrors([]);
    setShowConfirmModal(false);
    if (originalData) {
      setFormData(JSON.parse(JSON.stringify(originalData)));
    }
    onClose();
  };

  if (!isOpen) return null;

  const isOutreachLocation = formData.Location.IsOutreachLocation === true;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-xs z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-brand-q">
            <h3 className="heading-3 text-brand-k">
              {viewMode ? 'View Service' : (service ? 'Edit Service' : 'Add Service')}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="p-2"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content - scrollable */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-6">
                {/* Category Selection */}
                <div>
                  <h4 className="heading-4 pb-2 border-b border-brand-q mb-4">Category</h4>
                  <div className="space-y-4">
                    <FormField label="Service Category" required>
                      <Select
                        id="service-category"
                        value={formData.CategoryId}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                        options={categories.map(category => ({ value: category._id, label: category.Name }))}
                        placeholder="Select a category..."
                        disabled={viewMode}
                      />
                    </FormField>

                    {selectedCategory && selectedCategory.SubCategories.length > 0 && (
                      <FormField label="Sub Categories" required>
                        <MultiSelect
                          options={selectedCategory.SubCategories.map(sub => ({
                            value: sub.Key,
                            label: sub.Name
                          }))}
                          value={formData.SubCategories.map(sub => sub._id)}
                          onChange={handleSubCategoriesChange}
                          placeholder={viewMode ? '' : 'Select subcategories...'}
                          disabled={viewMode}
                        />
                      </FormField>
                    )}
                  </div>
                </div>

                {/* Service Details */}
                <div>
                  <h4 className="heading-4 pb-2 border-b border-brand-q mb-4">Service Details</h4>
                  <div className="space-y-4">
                    <FormField label="Description">
                      <RichTextEditor
                        value={formData.Info || ''}
                        onChange={(value) => updateFormData('Info', value)}
                        placeholder="Service description"
                        minHeight="150px"
                        toolbarFeatures={DESCRIPTION_TOOLBAR_FEATURES}
                        allowedTags={DESCRIPTION_ALLOWED_TAGS}
                        disabled={viewMode}
                      />
                      <p className="text-xs text-brand-f mt-1">
                        {getTextLengthFromHtml(formData.Info || '')}/1,600 characters
                      </p>
                    </FormField>

                    <Checkbox
                      id="isTelephoneService"
                      checked={formData.IsTelephoneService || false}
                      onChange={(e) => updateFormData('IsTelephoneService', e.target.checked)}
                      label="Is Telephone Service"
                      disabled={viewMode}
                    />

                    <FormField label="Telephone">
                      <Input
                        value={formData.Telephone || ''}
                        onChange={(e) => updateFormData('Telephone', e.target.value)}
                        placeholder={viewMode ? '' : 'Telephone number'}
                        type="tel"
                        disabled={viewMode}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Client Groups */}
                {clientGroups.length > 0 && (
                  <div>
                    <h4 className="heading-4 pb-2 border-b border-brand-q mb-4">Client Groups</h4>
                    <div className="space-y-4">
                      <FormField label="Suitable For">
                        <MultiSelect
                          options={clientGroups.map(cg => ({
                            value: cg.Key,
                            label: cg.Name
                          }))}
                          value={formData.ClientGroupKeys || []}
                          onChange={(values) => updateFormData('ClientGroupKeys', values)}
                          placeholder={viewMode ? '' : 'Select client groups...'}
                          disabled={viewMode}
                        />
                      </FormField>
                      <p className="text-sm text-brand-f">
                        Select the client groups this service is suitable for. Leave empty if the service is available to everyone.
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div>
                  <h4 className="heading-4 pb-2 border-b border-brand-q mb-4">Location</h4>
                  <div className="space-y-4">
                    <p className="text-sm text-brand-f">
                      Enter a location for this service, either by selecting an existing address, or entering new details. 
                      For outreach services with no fixed address, check the box below and enter a description.
                    </p>

                    {/* Is Outreach Location Checkbox */}
                    <Checkbox
                      id="isOutreachLocation"
                      checked={isOutreachLocation}
                      onChange={(e) => handleIsOutreachLocationChange(e.target.checked)}
                      label="Is Outreach Location (no physical address)"
                      disabled={viewMode}
                    />

                    {/* Outreach Description - shown only if IsOutreachLocation is true */}
                    {isOutreachLocation && (
                      <FormField label="Outreach Location Description" required>
                        <Textarea
                          value={formData.Location.Description || ''}
                          onChange={(e) => updateFormData('Location', {
                            ...formData.Location,
                            Description: e.target.value
                          })}
                          placeholder={viewMode ? '' : 'Describe the outreach location'}
                          rows={3}
                          disabled={viewMode}
                        />
                      </FormField>
                    )}

                    {/* Fixed Location Fields - shown only if IsOutreachLocation is false */}
                    {!isOutreachLocation && (
                      <>
                        {!viewMode && organisation.Addresses && organisation.Addresses.length > 0 && (
                          <FormField label="Use Existing Address">
                            <Select
                              id="use-existing-address"
                              onChange={(e) => handleAddressSelect(e.target.value)}
                              options={organisation.Addresses.map((address, index) => ({
                                value: index.toString(),
                                label: `${address.Street} - ${address.Postcode}`
                              }))}
                              placeholder="Select an existing address..."
                            />
                            <p className="text-xs text-brand-f mt-1">
                              Selecting an existing address will auto-populate the fields below including opening times
                            </p>
                          </FormField>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField label="Street" required>
                            <Input
                              type="text"
                              id="service-street1"
                              value={formData.Location.StreetLine1 || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                Location: {
                                  ...prev.Location,
                                  StreetLine1: e.target.value
                                }
                              }))}
                              placeholder={viewMode ? '' : 'Main street address'}
                              disabled={viewMode}
                            />
                          </FormField>

                          <FormField label="Street Line 2">
                            <Input
                              type="text"
                              id="service-street2"
                              value={formData.Location.StreetLine2 || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                Location: {
                                  ...prev.Location,
                                  StreetLine2: e.target.value
                                }
                              }))}
                              placeholder={viewMode ? '' : 'Building name, floor, etc.'}
                              disabled={viewMode}
                            />
                          </FormField>

                          <FormField label="Street Line 3">
                            <Input
                              type="text"
                              id="service-street3"
                              value={formData.Location.StreetLine3 || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                Location: {
                                  ...prev.Location,
                                  StreetLine3: e.target.value
                                }
                              }))}
                              placeholder={viewMode ? '' : 'Additional address info'}
                              disabled={viewMode}
                            />
                          </FormField>

                          <FormField label="Street Line 4">
                            <Input
                              type="text"
                              id="service-street4"
                              value={formData.Location.StreetLine4 || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                Location: {
                                  ...prev.Location,
                                  StreetLine4: e.target.value
                                }
                              }))}
                              placeholder={viewMode ? '' : 'Additional address info'}
                              disabled={viewMode}
                            />
                          </FormField>

                          <FormField label="City">
                            <Input
                              type="text"
                              id="service-city"
                              value={formData.Location.City || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                Location: {
                                  ...prev.Location,
                                  City: e.target.value
                                }
                              }))}
                              placeholder={viewMode ? '' : 'City'}
                              disabled={viewMode}
                            />
                          </FormField>

                          <FormField label="Postcode" required>
                            <Input
                              type="text"
                              id="service-postcode"
                              value={formData.Location.Postcode || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                Location: {
                                  ...prev.Location,
                                  Postcode: e.target.value
                                }
                              }))}
                              placeholder={viewMode ? '' : 'M1 1AA'}
                              disabled={viewMode}
                            />
                          </FormField>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Opening Times - shown only for fixed locations */}
                {!isOutreachLocation && (
                  <div>
                    <h4 className="heading-4 pb-2 border-b border-brand-q mb-4">Opening Times</h4>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Checkbox
                          id="isOpen247"
                          checked={formData.IsOpen247}
                          onChange={(e) => handleIsOpen247Change(e.target.checked)}
                          label="Open 24/7"
                          disabled={viewMode}
                        />
                        <Checkbox
                          id="isAppointmentOnly"
                          checked={formData.IsAppointmentOnly || false}
                          onChange={(e) => handleIsAppointmentOnlyChange(e.target.checked)}
                          label="Appointment Only"
                          disabled={viewMode}
                        />
                      </div>

                      {!formData.IsOpen247 && !formData.IsAppointmentOnly && (
                        <OpeningTimesManager
                          openingTimes={formData.OpeningTimes || []}
                          onChange={handleOpeningTimesChange}
                          viewMode={viewMode}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {validationErrors.length > 0 && (
              <div className="px-4 sm:px-6 pb-4">
                <ErrorDisplay
                  ValidationErrors={validationErrors}
                  ClassName="mb-0"
                />
              </div>
            )}

            {/* Footer - fixed at bottom */}
            {!viewMode && (
              <div className="border-t border-brand-q p-4 sm:p-6">
                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {isLoading ? (service ? 'Updating...' : 'Creating...') : (service ? 'Update Service' : 'Create Service')}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmCancel}
        title="Close without saving?"
        message="You may lose unsaved changes."
        confirmLabel="Close Without Saving"
        cancelLabel="Continue Editing"
        variant="warning"
      />
    </>
  );
};

export default AddServiceModal;
