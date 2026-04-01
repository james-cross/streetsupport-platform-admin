'use client';

import { useState, useEffect } from 'react';
import '@/styles/pagination.css';
import { useAuthorization } from '@/hooks/useAuthorization';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { FiltersSection } from '@/components/ui/FiltersSection';
import { Plus } from 'lucide-react';
import { IOrganisation } from '@/types/organisations/IOrganisation';
import OrganisationCard from '@/components/organisations/OrganisationCard';
import AddUserToOrganisationModal from '@/components/organisations/AddUserToOrganisationModal';
import { AddOrganisationModal } from '@/components/organisations/AddOrganisationModal';
import EditOrganisationModal from '@/components/organisations/EditOrganisationModal';
import { NotesModal } from '@/components/organisations/NotesModal';
import { DisableOrganisationModal } from '@/components/organisations/DisableOrganisationModal';
import toastUtils, { errorToast, loadingToast } from '@/utils/toast';
import { ROLES } from '@/constants/roles';
import { HTTP_METHODS } from '@/constants/httpMethods';
import { useSession } from 'next-auth/react';
import { UserAuthClaims } from '@/types/auth';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import { exportOrganisationsToCsv } from '@/utils/csvExport';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResultsSummary } from '@/components/ui/ResultsSummary';

export default function OrganisationsPage() {
  // Check authorization FIRST before any other logic
  const { isChecking, isAuthorized } = useAuthorization({
    allowedRoles: [ROLES.SUPER_ADMIN, ROLES.SUPER_ADMIN_PLUS, ROLES.CITY_ADMIN, ROLES.VOLUNTEER_ADMIN, ROLES.ORG_ADMIN],
    requiredPage: '/organisations',
    autoRedirect: true
  });

  const { data: session } = useSession();
  const [organisations, setOrganisations] = useState<IOrganisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(''); // Name input field value
  const [searchName, setSearchName] = useState(''); // Actual search term sent to API
  const [isVerifiedFilter, setIsVerifiedFilter] = useState<string>(''); // '', 'true', 'false'
  const [isPublishedFilter, setIsPublishedFilter] = useState<string>(''); // '', 'true', 'false'
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [locations, setLocations] = useState<Array<{ Key: string; Name: string }>>([]);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showClearNotesConfirmModal, setShowClearNotesConfirmModal] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddOrganisationModalOpen, setIsAddOrganisationModalOpen] = useState(false);
  const [isEditOrganisationModalOpen, setIsEditOrganisationModalOpen] = useState(false);
  const [isViewOrganisationModalOpen, setIsViewOrganisationModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedOrganisation, setSelectedOrganisation] = useState<IOrganisation | null>(null);
  const [organisationToDisable, setOrganisationToDisable] = useState<IOrganisation | null>(null);
  const [togglingPublishId, setTogglingPublishId] = useState<string | null>(null);
  const [togglingVerifyId, setTogglingVerifyId] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [organisationToDelete, setOrganisationToDelete] = useState<IOrganisation | null>(null);
  
  const limit = 9;

  // Get user auth claims
  const userAuthClaims = (session?.user?.authClaims || { roles: [], specificClaims: [] }) as UserAuthClaims;
  
  // Check if user is OrgAdmin (without other admin roles)
  const isOrgAdmin = userAuthClaims.roles.includes(ROLES.ORG_ADMIN) && 
                     !userAuthClaims.roles.includes(ROLES.SUPER_ADMIN) &&
                     !userAuthClaims.roles.includes(ROLES.SUPER_ADMIN_PLUS) &&
                     !userAuthClaims.roles.includes(ROLES.VOLUNTEER_ADMIN) &&
                     !userAuthClaims.roles.includes(ROLES.CITY_ADMIN);

  // Check if user is SuperAdminPlus
  const isSuperAdminPlus = userAuthClaims.roles.includes(ROLES.SUPER_ADMIN_PLUS);

  // Get organisation keys from AdminFor: claims for OrgAdmin users
  const orgAdminKeys = isOrgAdmin 
    ? userAuthClaims.specificClaims
        .filter((claim: string) => claim.startsWith('AdminFor:'))
        .map((claim: string) => claim.replace('AdminFor:', ''))
    : [];

  // Keep selectedOrganisation in sync when the organisations list refreshes
  useEffect(() => {
    if (selectedOrganisation) {
      const updated = organisations.find(org => org._id === selectedOrganisation._id);
      if (updated && updated !== selectedOrganisation) {
        setSelectedOrganisation(updated);
      }
    }
  }, [organisations, selectedOrganisation]);

  // Only run effects if authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchLocations();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      fetchOrganisations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, currentPage, searchName, isVerifiedFilter, isPublishedFilter, locationFilter, limit]);

  const fetchLocations = async () => {
    try {
      const response = await authenticatedFetch('/api/cities');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

  const fetchOrganisations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      // OrgAdmin users: Fetch organisations by key (currently only first org, but supports multiple in future)
      if (isOrgAdmin && orgAdminKeys.length > 0) {
        // TODO: In the future, we can extend this to fetch multiple organisations by keys
        // For now, fetch the first organisation the user administers
        const orgKey = orgAdminKeys[0];
        
        const response = await authenticatedFetch(`/api/organisations/${orgKey}`);
        if (!response.ok) {
          throw new Error('Failed to fetch organisation');
        }

        const result = await response.json();
        // API returns single organisation, wrap in array for consistent display
        setOrganisations(result.data ? [result.data] : []);
        setTotal(1);
        setTotalPages(1);
      } else {
        // All other roles: Fetch organisations with pagination and filters
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: limit.toString(),
        });

        if (nameInput?.trim()) params.append('search', nameInput.trim());
        if (isVerifiedFilter) params.append('isVerified', isVerifiedFilter);
        if (isPublishedFilter) params.append('isPublished', isPublishedFilter);
        if (locationFilter) params.append('location', locationFilter);
        
        const response = await authenticatedFetch(`/api/organisations?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch organisations');
        }

        const result = await response.json();
        setOrganisations(result.data || []);
        setTotal(result.pagination?.total || 0);
        setTotalPages(result.pagination?.pages || 1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch organisations';
      setError(errorMessage);
      errorToast.generic(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchClick = () => {
    const trimmedSearch = nameInput.trim();
    setSearchName(trimmedSearch);
    setCurrentPage(1);
  };
  

  const handleIsVerifiedFilter = (value: string) => {
    setIsVerifiedFilter(value);
    setCurrentPage(1);
  };

  const handleIsPublishedFilter = (value: string) => {
    setIsPublishedFilter(value);
    setCurrentPage(1);
  };

  const handleLocationFilter = (value: string) => {
    setLocationFilter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setNameInput('');
    setSearchName('');
    setIsVerifiedFilter('');
    setIsPublishedFilter('');
    setLocationFilter('');
    setCurrentPage(1);
  };

  const handleView = (organisation: IOrganisation) => {
    setSelectedOrganisation(organisation);
    setIsViewOrganisationModalOpen(true);
  };

  const handleEdit = (organisation: IOrganisation) => {
    setSelectedOrganisation(organisation);
    setIsEditOrganisationModalOpen(true);
  };

  const handleDisableClick = (organisation: IOrganisation) => {
    setOrganisationToDisable(organisation);
    setShowDisableModal(true);
  };

  const handleTogglePublished = async (organisation: IOrganisation, staffName?: string, reason?: string, disablingDate?: Date) => {
    setTogglingPublishId(organisation._id);
    const isCurrentlyPublished = organisation.IsPublished;
    const action = isCurrentlyPublished ? 'disable' : 'publish';
    const toastId = loadingToast.process(action === 'publish' ? 'Publishing organisation' : 'Disabling organisation');
    
    try {
      let body: unknown = {};
      
      // If disabling, include note information
      if (isCurrentlyPublished && staffName && reason) {
        body = {
          note: {
            StaffName: staffName,
            Reason: reason,
            Date: disablingDate || new Date() // Include disabling date
          }
        }
      }

      const response = await authenticatedFetch(`/api/organisations/${organisation._id}/toggle-published`, {
        method: HTTP_METHODS.PATCH,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} organisation`);
      }

      toastUtils.dismiss(toastId);
      if (action === 'publish') {
        toastUtils.custom('Organisation published successfully', { type: 'success' });
      } else {
        toastUtils.custom('Organisation disabled successfully', { type: 'success' });
      }
      
      // Refresh the list
      fetchOrganisations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} organisation`;
      toastUtils.dismiss(toastId);
      errorToast.generic(errorMessage);
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleToggleVerified = async (organisation: IOrganisation) => {
    setTogglingVerifyId(organisation._id);
    const isCurrentlyVerified = organisation.IsVerified;
    const action = isCurrentlyVerified ? 'unverify' : 'verify';
    const toastId = loadingToast.process(action === 'verify' ? 'Verifying organisation' : 'Unverifying organisation');
    
    try {
      const response = await authenticatedFetch(`/api/organisations/${organisation._id}/toggle-verified`, {
        method: HTTP_METHODS.PATCH
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} organisation`);
      }

      toastUtils.dismiss(toastId);
      if (action === 'verify') {
        toastUtils.custom('Organisation verified successfully', { type: 'success' });
      } else {
        toastUtils.custom('Organisation unverified successfully', { type: 'success' });
      }
      
      // Refresh the list
      fetchOrganisations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} organisation`;
      toastUtils.dismiss(toastId);
      errorToast.generic(errorMessage);
    } finally {
      setTogglingVerifyId(null);
    }
  };

  const handleAddUser = (organisation: IOrganisation) => {
    setSelectedOrganisation(organisation);
    setIsAddUserModalOpen(true);
  };

  const handleViewNotes = (organisation: IOrganisation) => {
    setSelectedOrganisation(organisation);
    setIsNotesModalOpen(true);
  };

  const handleDelete = (organisation: IOrganisation) => {
    setOrganisationToDelete(organisation);
    setShowDeleteConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!organisationToDelete) return;

    setShowDeleteConfirmModal(false);
    const toastId = loadingToast.delete('organisation');
    
    try {
      const response = await authenticatedFetch(`/api/organisations/${organisationToDelete._id}`, {
        method: HTTP_METHODS.DELETE
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete organisation');
      }

      toastUtils.dismiss(toastId);
      toastUtils.custom('Organisation deleted successfully', { type: 'success' });
      
      // Refresh the list
      fetchOrganisations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete organisation';
      toastUtils.dismiss(toastId);
      errorToast.delete('organisation', errorMessage);
    } finally {
      setOrganisationToDelete(null);
    }
  };

  const handleClearNotesClick = () => {
    setShowClearNotesConfirmModal(true);
  };

  const confirmClearNotes = async () => {
    if (!selectedOrganisation) return;

    setShowClearNotesConfirmModal(false);
    const toastId = loadingToast.process('Clearing notes');
    
    try {
      const response = await authenticatedFetch(`/api/organisations/${selectedOrganisation._id}/notes`, {
        method: HTTP_METHODS.DELETE
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear notes');
      }

      toastUtils.dismiss(toastId);
      toastUtils.custom('Notes cleared successfully', { type: 'success' });
      
      // Close the notes modal
      setIsNotesModalOpen(false);
      
      // Refresh the list
      fetchOrganisations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear notes';
      toastUtils.dismiss(toastId);
      errorToast.generic(errorMessage);
    }
  };

  const handleExport = async () => {
    const toastId = loadingToast.process('Exporting organisations');
    
    try {
      // Build query parameters to fetch ALL organisations with current filters
      const queryParams = new URLSearchParams();
      queryParams.append('page', '1');
      queryParams.append('limit', total.toString()); // Fetch all based on total count
      
      if (searchName) queryParams.append('name', searchName);
      if (locationFilter) queryParams.append('location', locationFilter);
      if (isVerifiedFilter) queryParams.append('isVerified', isVerifiedFilter);
      if (isPublishedFilter) queryParams.append('isPublished', isPublishedFilter);

      // For OrgAdmin, add organisation keys filter
      if (isOrgAdmin && orgAdminKeys.length > 0) {
        queryParams.append('keys', orgAdminKeys.join(','));
      }

      const response = await authenticatedFetch(`/api/organisations?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch organisations for export');
      }

      const data = await response.json();
      const allOrganisations = data.data || [];
      
      // Export all organisations
      exportOrganisationsToCsv(allOrganisations);
      
      toastUtils.dismiss(toastId);
      toastUtils.custom(`Exported ${allOrganisations.length} organisation${allOrganisations.length !== 1 ? 's' : ''}`, { type: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export organisations';
      toastUtils.dismiss(toastId);
      errorToast.generic(errorMessage);
    }
  };

  const confirmDisable = (staffName: string, reason: string, disablingDate: Date) => {
    if (!organisationToDisable) return;
    
    setShowDisableModal(false);
    handleTogglePublished(organisationToDisable, staffName, reason, disablingDate);
    setOrganisationToDisable(null);
  };

  // Show loading while checking authorization or fetching data
  if (isChecking || loading) {
    return <LoadingSpinner />;
  }

  // Don't render anything if not authorized (redirect handled by hook)
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-brand-q">
        <PageHeader 
          title={isOrgAdmin ? 'My Organisation' : 'Organisations'}
          actions={
            !isOrgAdmin ? (
              <Button variant="primary" onClick={() => setIsAddOrganisationModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Organisation
              </Button>
            ) : undefined
          }
        />

        <div className="page-container section-spacing padding-top-zero">
          {/* Filters - Hidden for OrgAdmin */}
          {!isOrgAdmin && (
            <FiltersSection
              searchPlaceholder="Search by name"
              searchValue={nameInput}
              onSearchChange={setNameInput}
              onSearchSubmit={handleSearchClick}
              onClearFilters={handleClearFilters}
              filters={[
                {
                  id: 'location-filter',
                  value: locationFilter,
                  onChange: handleLocationFilter,
                  placeholder: 'All Locations',
                  options: locations.map(city => ({
                    label: city.Name,
                    value: city.Key
                  }))
                },
                {
                  id: 'verified-filter',
                  value: isVerifiedFilter,
                  onChange: handleIsVerifiedFilter,
                  placeholder: 'Verified: Either',
                  options: [
                    { label: 'Verified: Yes', value: 'true' },
                    { label: 'Verified: No', value: 'false' }
                  ]
                },
                {
                  id: 'published-filter',
                  value: isPublishedFilter,
                  onChange: handleIsPublishedFilter,
                  placeholder: 'Published: Either',
                  options: [
                    { label: 'Published: Yes', value: 'true' },
                    { label: 'Published: No', value: 'false' }
                  ]
                }
              ]}
            />
          )}

          {/* Results Summary with Export Button - Hidden for OrgAdmin */}
          {!isOrgAdmin && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <ResultsSummary Loading={loading} Total={total} ItemName="organisation" NoWrapper />
              {!loading && total > 0 && (
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="w-full sm:w-auto"
                >
                  Export Organisations
                </Button>
              )}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <ErrorState
              title="Error Loading Organisations"
              message={error}
              onRetry={fetchOrganisations}
            />
          )}

          {/* Empty State */}
          {!loading && !error && organisations.length === 0 && (
            <EmptyState
              title="No Organisations Found"
              message={
                searchName || isVerifiedFilter || isPublishedFilter || locationFilter ? (
                  <p>No organisations match your current filters. Try adjusting your search criteria.</p>
                ) : (
                  <p>Get started by adding your first organisation.</p>
                )
              }
              action={{
                label: 'Add Organisation',
                icon: <Plus className="w-4 h-4 mr-2" />,
                onClick: () => setIsAddOrganisationModalOpen(true),
                variant: 'primary'
              }}
            />
          )}

          {/* Organisations Grid */}
          {!loading && !error && organisations.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {organisations.map((organisation) => (
                <OrganisationCard
                  key={organisation._id}
                  organisation={organisation}
                  onView={handleView}
                  onEdit={handleEdit}
                  onTogglePublished={handleTogglePublished}
                  onToggleVerified={handleToggleVerified}
                  onAddUser={handleAddUser}
                  onViewNotes={handleViewNotes}
                  onDisableClick={handleDisableClick}
                  onDelete={handleDelete}
                  isTogglingPublish={togglingPublishId === organisation._id}
                  isTogglingVerify={togglingVerifyId === organisation._id}
                  isOrgAdmin={isOrgAdmin}
                  isSuperAdminPlus={isSuperAdminPlus}
                />
              ))}
            </div>
          )}

          {/* Pagination - Hidden for OrgAdmin */}
          {!isOrgAdmin && !loading && !error && totalPages > 1 && (
            <div className="flex flex-col items-center mt-12 space-y-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              <p className="text-sm text-brand-f mt-5">
                Showing {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} of {total} organisations
              </p>
            </div>
          )}
        </div>

        {/* Add User to Organisation Modal */}
        <AddUserToOrganisationModal
          isOpen={isAddUserModalOpen}
          onClose={() => {
            setIsAddUserModalOpen(false);
            setSelectedOrganisation(null);
          }}
          onSuccess={() => {
            // Refresh the organisations list
            fetchOrganisations();
          }}
          organisation={selectedOrganisation}
        />

        {/* Add Organisation Modal */}
        <AddOrganisationModal
          isOpen={isAddOrganisationModalOpen}
          onClose={() => setIsAddOrganisationModalOpen(false)}
          onSuccess={() => {
            // Refresh the organisations list
            fetchOrganisations();
          }}
        />

        {/* Edit Organisation Modal */}
        {selectedOrganisation && (
          <EditOrganisationModal
            isOpen={isEditOrganisationModalOpen}
            onClose={() => {
              setIsEditOrganisationModalOpen(false);
              setSelectedOrganisation(null);
            }}
            organisation={selectedOrganisation}
            onOrganisationUpdated={() => {
              // Silent refresh to avoid unmounting the modal with a loading spinner
              fetchOrganisations(true);
            }}
          />
        )}

        {/* View Organisation Modal (Read-only) */}
        {selectedOrganisation && (
          <EditOrganisationModal
            isOpen={isViewOrganisationModalOpen}
            onClose={() => {
              setIsViewOrganisationModalOpen(false);
              setSelectedOrganisation(null);
            }}
            organisation={selectedOrganisation}
            onOrganisationUpdated={() => {
              // Silent refresh to avoid unmounting the modal with a loading spinner
              fetchOrganisations(true);
            }}
            viewMode={true}
          />
        )}

        {/* Notes Modal */}
        <NotesModal
          isOpen={isNotesModalOpen}
          onClose={() => {
            setIsNotesModalOpen(false);
            setSelectedOrganisation(null);
          }}
          onClearNotes={handleClearNotesClick}
          organisation={selectedOrganisation}
        />

        {/* Disable Organisation Modal */}
        <DisableOrganisationModal
          isOpen={showDisableModal}
          onClose={() => {
            setShowDisableModal(false);
            setOrganisationToDisable(null);
          }}
          onConfirm={confirmDisable}
          organisation={organisationToDisable}
        />

        {/* Clear Notes Confirmation Modal */}
        <ConfirmModal
          isOpen={showClearNotesConfirmModal}
          onClose={() => setShowClearNotesConfirmModal(false)}
          onConfirm={confirmClearNotes}
          title="Clear All Notes"
          message={`Are you sure you want to clear all notes for "${selectedOrganisation?.Name}"? This action cannot be undone.`}
          variant="warning"
          confirmLabel="Clear Notes"
          cancelLabel="Cancel"
        />

        {/* Delete Organisation Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setOrganisationToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Organisation"
          message={`Are you sure you want to delete organisation "${organisationToDelete?.Name}"? This will also delete all related services and accommodations. This action cannot be undone.`}
          variant="danger"
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />
    </div>
  );
}
