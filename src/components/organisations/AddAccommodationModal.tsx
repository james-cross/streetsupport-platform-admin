'use client';

import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ErrorDisplay, { ValidationError } from '@/components/ui/ErrorDisplay';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { IAccommodation, IAccommodationFormData } from '@/types/organisations/IAccommodation';
import { AccommodationForm, AccommodationFormRef } from './AccommodationForm';
import { successToast, errorToast } from '@/utils/toast';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { transformErrorPath } from '@/schemas/accommodationSchema';

interface AddAccommodationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organisationId: string;
  providerId: string;
  availableCities: Array<{ _id: string; Name: string; Key: string }>;
  accommodation?: IAccommodation | null;
  viewMode?: boolean; // When true, all inputs are disabled and save button hidden
}

export function AddAccommodationModal({
  isOpen,
  onClose,
  onSuccess,
  organisationId,
  providerId,
  availableCities,
  accommodation,
  viewMode = false
}: AddAccommodationModalProps) {
  const formRef = useRef<AccommodationFormRef>(null);
  const isEditMode = !!accommodation;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showCancelConfirm, setShowConfirmModal] = useState(false);
  const [initialFormData, setInitialFormData] = useState<IAccommodationFormData | null>(null);

  const handleValidationChange = (errors: ValidationError[]) => {
    // Transform client-side validation paths to user-friendly names
    const transformed = errors.map((e) => ({
      Path: transformErrorPath(e.Path),
      Message: e.Message,
    }));
    setValidationErrors(transformed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formRef.current) return;

    // Validate form
    if (!formRef.current.validate()) {
      errorToast.validation();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setValidationErrors([]);

    try {
      const formData = formRef.current.getFormData();
      
      const url = isEditMode
        ? `/api/organisations/${organisationId}/accommodations/${accommodation._id}`
        : `/api/organisations/${organisationId}/accommodations`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const transformedErrors = data.errors.map((error: { path?: string | string[]; Path?: string; message?: string; Message?: string }) => {
            const originalPath = Array.isArray(error.path) ? error.path.join('.') : (error.Path || '');
            return {
              Path: transformErrorPath(originalPath),
              Message: error.Message || error.message || ''
            };
          });
          setValidationErrors(transformedErrors);
          errorToast.validation();
        } else {
          setErrorMessage(data.error || 'Failed to save accommodation');
          errorToast.generic(data.error);
        }
        return;
      }

      successToast[isEditMode ? 'update' : 'create'](isEditMode ? 'Accommodation' : 'Accommodation');
      onSuccess();
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save accommodation';
      setErrorMessage(message);
      errorToast.generic(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (formRef.current) {
      formRef.current.resetForm();
    }
    setValidationErrors([]);
    setErrorMessage('');
    setInitialFormData(null);
    onClose();
  };

  const handleCancel = () => {
    // Check if form data has changed
    if (!formRef.current) {
      handleClose();
      return;
    }
    
    const currentFormData = formRef.current.getFormData();
    const initialData = initialFormData || (isEditMode ? accommodation : null);
    
    if (initialData && JSON.stringify(currentFormData) !== JSON.stringify(initialData)) {
      setShowConfirmModal(true);
    } else {
      handleClose();
    }
  };

  const confirmCancel = () => {
    setShowConfirmModal(false);
    handleClose();
  };

  // Store initial form data when modal opens
  useEffect(() => {
    if (isOpen && formRef.current) {
      const formData = formRef.current.getFormData();
      setInitialFormData(JSON.parse(JSON.stringify(formData)));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-opacity-10 backdrop-blur-xs z-40" onClick={handleCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-brand-q">
            <h3 className="heading-3 text-brand-k">
              {viewMode ? 'View Accommodation' : (isEditMode ? 'Edit Accommodation' : 'Add Accommodation')}
            </h3>
            <button
              onClick={viewMode ? onClose : handleCancel}
              className="text-brand-f hover:text-brand-k transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
            <div className="p-4 sm:p-6 flex-1">
              <AccommodationForm
                ref={formRef}
                initialData={accommodation}
                providerId={providerId}
                availableCities={availableCities}
                onValidationChange={handleValidationChange}
                viewMode={viewMode}
              />
            </div>

            {/* Footer - Fixed at bottom */}
            {!viewMode && (
              <div className="border-t border-brand-q p-4 sm:p-6">
                {/* Error Display */}
                <ErrorDisplay
                  ErrorMessage={errorMessage || undefined}
                  ValidationErrors={validationErrors}
                  ClassName="mb-4"
                />

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto sm:min-w-24 order-2 sm:order-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto sm:min-w-24 order-1 sm:order-2"
                  >
                    {isSubmitting 
                      ? (isEditMode ? 'Updating...' : 'Creating...') 
                      : (isEditMode ? 'Update Accommodation' : 'Create Accommodation')
                  }
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
        onConfirm={confirmCancel}
        onClose={() => setShowConfirmModal(false)}
        title="Close without saving?"
        message="You may lose unsaved changes."
        confirmLabel="Close Without Saving"
        cancelLabel="Continue Editing"
        variant="warning"
      />
    </>
  );
}
