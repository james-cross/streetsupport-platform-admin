'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import ErrorDisplay, { ValidationError } from '@/components/ui/ErrorDisplay';
import { IOrganisation, IOrganisationFormData } from '@/types/organisations/IOrganisation';
import { timeNumberToString } from '@/schemas/validationHelpers';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { errorToast, successToast } from '@/utils/toast';
import { OrganisationForm, OrganisationFormRef } from '../OrganisationForm';
import { AdminDetailsSection } from '../sections/AdminDetailsSection';
import { decodeText } from '@/utils/htmlDecode';
import { prepareContentForEditor } from '@/utils/htmlUtils';

export interface OrganisationTabRef {
  hasChanges: () => boolean;
  triggerCancel: (onConfirm?: () => void, options?: { title?: string; message?: string; confirmLabel?: string }) => void;
}

interface OrganisationTabProps {
  organisation: IOrganisation;
  onOrganisationUpdated: () => void;
  onClose: () => void; // Called after successful update (no confirmation)
  onCancel: () => void; // Called when user clicks Cancel (shows confirmation)
  viewMode?: boolean; // When true, all inputs are disabled and save button hidden
}

const OrganisationTab = React.forwardRef<OrganisationTabRef, OrganisationTabProps>(({
  organisation,
  onOrganisationUpdated,
  onClose,
  onCancel,
  viewMode = false
}, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentOrganisation, setCurrentOrganisation] = useState<IOrganisation>(organisation);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [initialFormData, setInitialFormData] = useState<Partial<IOrganisationFormData> | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [modalOptions, setModalOptions] = useState<{ title: string; message: string, confirmLabel?: string }>({
    title: 'Close without saving?',
    message: 'You may lose unsaved changes.',
    confirmLabel: 'Close without saving'
  });
  const formRef = React.useRef<OrganisationFormRef>(null);

  // Update current organisation when prop changes
  useEffect(() => {
    setCurrentOrganisation(organisation);
  }, [organisation]);

  // Prepare initial data for the form - decode HTML entities
  // IMPORTANT: Must include ALL fields that the form returns in getFormData()
  const initialData: Partial<IOrganisationFormData> = {
    Key: organisation.Key || '',
    AssociatedLocationIds: organisation.AssociatedLocationIds || [],
    Name: decodeText(organisation.Name || ''),
    ShortDescription: decodeText(organisation.ShortDescription || ''),
    Description: prepareContentForEditor(decodeText(organisation.Description || '')),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tags: organisation.Tags ? organisation.Tags.split(',').filter(tag => tag.trim()) as any : [],
    IsVerified: organisation.IsVerified || false,
    IsPublished: organisation.IsPublished || false,
    Telephone: organisation.Telephone || '',
    Email: organisation.Email || '',
    Website: organisation.Website || '',
    Facebook: organisation.Facebook || '',
    Twitter: organisation.Twitter || '',
    Bluesky: organisation.Bluesky || '',
    Instagram: organisation.Instagram || '',
    Addresses: (organisation.Addresses || []).map(address => ({
      ...address,
      Street: decodeText(address.Street || ''),
      Street1: decodeText(address.Street1 || ''),
      Street2: decodeText(address.Street2 || ''),
      Street3: decodeText(address.Street3 || ''),
      OpeningTimes: address.OpeningTimes.map(openingTime => ({
        Day: openingTime.Day,
        StartTime: timeNumberToString(openingTime.StartTime),
        EndTime: timeNumberToString(openingTime.EndTime)
      }))
    })),
    Administrators: organisation.Administrators || []
  };

  // Store initial data for comparison when component mounts or organisation changes
  useEffect(() => {
    setInitialFormData(JSON.parse(JSON.stringify(initialData)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisation]);

  // Expose methods to parent via ref
  React.useImperativeHandle(ref, () => ({
    hasChanges: () => {
      if (formRef.current && initialFormData) {
        const currentFormData = formRef.current.getFormData();
        return JSON.stringify(currentFormData) !== JSON.stringify(initialFormData);
      }
      return false;
    },
    triggerCancel: (onConfirm?: () => void, options?: { title?: string; message?: string; confirmLabel?: string }) => {
      if (formRef.current && initialFormData) {
        const currentFormData = formRef.current.getFormData();
        
        // Check if there are changes
        if (JSON.stringify(currentFormData) !== JSON.stringify(initialFormData)) {
          // Store the action to execute after confirmation
          // Use a wrapper function to properly capture the callback
          setPendingAction(() => () => {
            if (onConfirm) {
              onConfirm();
            } else {
              onCancel();
            }
          });
          
          // Set custom title and message if provided
          if (options?.title || options?.message || options?.confirmLabel) {
            setModalOptions({
              title: options.title || 'Close without saving?',
              message: options.message || 'You may lose unsaved changes.',
              confirmLabel: options.confirmLabel || 'Close without saving'
            });
          } else {
            setModalOptions({
              title: 'Close without saving?',
              message: 'You may lose unsaved changes.',
              confirmLabel: 'Close without saving'
            });
          }
          
          setShowCancelConfirm(true);
          return;
        }
      }
      
      // No changes, execute action directly
      if (onConfirm) {
        onConfirm();
      } else {
        onCancel();
      }
    }
  }));

  const handleValidationChange = useCallback((errors: ValidationError[]) => {
    setValidationErrors(errors);
  }, []);

  // Helper function to convert time string (HH:MM) to number (HHMM)
  const timeStringToNumber = (timeString: string): number => {
    return parseInt(timeString.replace(':', ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form using ref
    if (!formRef.current?.validate()) {
      errorToast.validation();
      return;
    }

    // Get form data using ref
    const formData = formRef.current?.getFormData();
    if (!formData) {
      errorToast.generic('Failed to get form data');
      return;
    }

    setIsLoading(true);

    try {
      // Convert tags array to comma-separated string for API
      const submissionData = {
        ...formData,
        Tags: Array.isArray(formData.Tags) ? formData.Tags.join(',') : formData.Tags,
        // Convert opening times from form format (string) to API format (number)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Addresses: formData.Addresses.map((address: any) => ({
          ...address,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          OpeningTimes: address.OpeningTimes.map((time: any) => ({
            Day: time.Day,
            StartTime: timeStringToNumber(time.StartTime),
            EndTime: timeStringToNumber(time.EndTime)
          }))
        }))
      };

      const response = await authenticatedFetch(`/api/organisations/${organisation._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update organisation');
      }

      successToast.update('Organisation');
      onOrganisationUpdated();
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update organisation';
      errorToast.generic(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Clear any pending action from tab switch or close button
    // This ensures Cancel button always closes the modal, not switches tabs
    setPendingAction(null);
    
    // Check if form data has changed
    if (formRef.current && initialFormData) {
      const currentFormData = formRef.current.getFormData();
      
      // Compare current form data with initial data
      if (JSON.stringify(currentFormData) !== JSON.stringify(initialFormData)) {
        setShowCancelConfirm(true);
        return;
      }
    }
    
    // No changes, close directly
    setValidationErrors([]);
    onCancel();
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    setValidationErrors([]);
    
    // Execute the pending action (could be onCancel or a custom action from parent)
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Admin Details Section - Show in both edit and view modes */}
          <div className="mb-6">
            <AdminDetailsSection
              organisation={currentOrganisation}
              onUpdate={(updatedOrg) => {
                setCurrentOrganisation(updatedOrg);
                onOrganisationUpdated();
              }}
              onClose={onClose}
            />
          </div>

          <OrganisationForm
            ref={formRef}
            initialData={initialData}
            onValidationChange={handleValidationChange}
            viewMode={viewMode}
          />
        </div>

        {/* Error Display */}
        {validationErrors.length > 0 && (
          <div className="px-4 sm:px-6">
            <ErrorDisplay
              ValidationErrors={validationErrors}
              ClassName="mb-4"
            />
          </div>
        )}

        {/* Footer */}
        {!viewMode && (
          <div className="border-t border-brand-q p-4 sm:p-6">
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
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
                {isLoading ? 'Updating...' : 'Update Organisation'}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => {
          setShowCancelConfirm(false);
          // Clear pending action when user clicks "Continue Editing"
          setPendingAction(null);
          // Reset modal options to default
          setModalOptions({
            title: 'Close without saving?',
            message: 'You may lose unsaved changes.',
            confirmLabel: 'Close without saving'
          });
        }}
        onConfirm={confirmCancel}
        title={modalOptions.title}
        message={modalOptions.message}
        confirmLabel={modalOptions.confirmLabel}
        cancelLabel="Continue Editing"
        variant="warning"
      />
    </div>
  );
});

OrganisationTab.displayName = 'OrganisationTab';

export default OrganisationTab;
