'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { MediaUpload } from '@/components/ui/MediaUpload';
import { FormField } from '@/components/ui/FormField';
import type { ICity, ICTAButton, IUploadedFile } from '@/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ColourPicker } from '@/components/ui/ColourPicker';
import { Checkbox } from '@/components/ui/Checkbox';
import { RichTextEditor, BANNER_TOOLBAR_FEATURES, BANNER_ALLOWED_TAGS } from '@/components/ui/RichTextEditor';
import { getTextLengthFromHtml } from '@/utils/htmlUtils';
import { Plus, Trash, Youtube, ImageIcon, FileText } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { IBannerFormData, LayoutStyle, TextColour, BackgroundType, CTAVariant, MediaType } from '@/types';
import { errorToast } from '@/utils/toast';
import { authenticatedFetch } from '@/utils/authenticatedFetch';
import ErrorDisplay from '@/components/ui/ErrorDisplay';

const SUPPORTED_FILE_TYPES = {
  'application/pdf': { extension: 'PDF', description: 'PDF Document' },
  'application/msword': { extension: 'DOC', description: 'Word Document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'DOCX', description: 'Word Document' },
  'application/vnd.ms-excel': { extension: 'XLS', description: 'Excel Spreadsheet' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: 'XLSX', description: 'Excel Spreadsheet' },
  'image/jpeg': { extension: 'JPG', description: 'JPEG Image' },
  'image/png': { extension: 'PNG', description: 'PNG Image' },
} as const;

const UPLOADED_FILE_ACCEPT_STRING = Object.keys(SUPPORTED_FILE_TYPES).join(',');
const MAX_UPLOADED_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileTypeFromMimeType(mimeType: string): string {
  const fileInfo = SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES];
  return fileInfo?.extension || 'FILE';
}

function isValidFileType(mimeType: string): boolean {
  return mimeType in SUPPORTED_FILE_TYPES;
}

interface IValidationError {
  path: string;
  message: string;
  code: string;
}

interface BannerEditorProps {
  initialData?: Partial<IBannerFormData>;
  onDataChange: (data: IBannerFormData) => void;
  onSave: (data: IBannerFormData) => void;
  saving?: boolean;
  onCancel: () => void;
  errorMessage?: string | null;
  validationErrors?: IValidationError[];
}

const LAYOUT_STYLES = [
  { value: LayoutStyle.SPLIT, label: 'Split Layout' },
  { value: LayoutStyle.FULL_WIDTH, label: 'Full Width' },
  { value: LayoutStyle.COMPACT, label: 'Compact' }
];

const TEXT_COLOURS = [
  { value: TextColour.WHITE, label: 'White' },
  { value: TextColour.BLACK, label: 'Black' }
];

const BACKGROUND_TYPES = [
  { value: BackgroundType.SOLID, label: 'Solid Colour' },
  { value: BackgroundType.GRADIENT, label: 'Gradient' },
  { value: BackgroundType.IMAGE, label: 'Image' }
];

const CTA_VARIANTS = [
  { value: CTAVariant.PRIMARY, label: 'Primary' },
  { value: CTAVariant.SECONDARY, label: 'Secondary' },
  { value: CTAVariant.OUTLINE, label: 'Outline' }
];

const GRADIENT_DIRECTIONS = [
  { value: 'to bottom', label: 'Top to Bottom' },
  { value: 'to top', label: 'Bottom to Top' },
  { value: 'to right', label: 'Left to Right' },
  { value: 'to left', label: 'Right to Left' },
  { value: 'to bottom right', label: 'Diagonal (Top-Left to Bottom-Right)' },
  { value: 'to bottom left', label: 'Diagonal (Top-Right to Bottom-Left)' },
  { value: 'to top right', label: 'Diagonal (Bottom-Left to Top-Right)' },
  { value: 'to top left', label: 'Diagonal (Bottom-Right to Top-Left)' },
];

function generateGradientValue(startColour: string, endColour: string, direction: string): string {
  return `linear-gradient(${direction}, ${startColour} 0%, ${endColour} 100%)`;
}

export function BannerEditor({ initialData, onDataChange, onSave, saving = false, onCancel, errorMessage, validationErrors = [] }: BannerEditorProps) {
  const [cities, setCities] = useState<ICity[]>([]);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await authenticatedFetch('/api/cities');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch locations');
        }
        const result = await response.json();
        if (result.success) {
          setCities(result.data);
        } else {
          errorToast.load('locations data');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load locations';
        errorToast.load(errorMessage);
      }
    }
    fetchLocations();
  }, []);

  const getDefaultFormData = (): IBannerFormData => {
    return {
      Title: 'Title',
      Subtitle: 'Subtitle',
      Description: 'Description',
      MediaType: MediaType.IMAGE,
      YouTubeUrl: '',
      LayoutStyle: LayoutStyle.SPLIT,
      TextColour: TextColour.WHITE,
      Background: {
        Type: BackgroundType.SOLID,
        Value: '#38ae8e',
        GradientStartColour: '#667eea',
        GradientEndColour: '#764ba2',
        GradientDirection: 'to bottom',
        Overlay: {
          Colour: 'rgba(0,0,0,0.5)',
          Opacity: 0.5
        }
      },
      Border: {
        ShowBorder: false,
        Colour: '#f8c77c'
      },
      CtaButtons: [
        {
          Label: 'Click',
          Url: '/',
          Variant: CTAVariant.PRIMARY,
          External: false
        }
      ],
      IsActive: true,
      Priority: 5,
      LocationSlug: '',
      LocationName: '',
      UploadedFile: null,
      StartDate: undefined,
      EndDate: undefined,
      _id: '',
    };
  };

  const [formData, setFormData] = useState<IBannerFormData>(() => {
    const defaults = getDefaultFormData();

    if (!initialData || Object.keys(initialData).length === 0) {
      return defaults;
    }

    return {
      ...defaults,
      ...initialData,
      Background: initialData.Background ? {
        ...defaults.Background,
        ...initialData.Background,
        Overlay: initialData.Background.Overlay ? {
          ...defaults.Background.Overlay,
          ...initialData.Background.Overlay,
        } : defaults.Background.Overlay,
      } : defaults.Background,
      Border: initialData.Border ? {
        ...defaults.Border,
        ...initialData.Border,
      } : defaults.Border,
      CtaButtons: initialData?.CtaButtons ?? defaults.CtaButtons,
    };
  });

  const originalDataRef = useRef(JSON.parse(JSON.stringify(formData)));
  const [errors] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const hasUnsavedChanges = useRef(false);

  useEffect(() => {
    const hasFileObjects = (obj: unknown): boolean => {
      if (obj instanceof File) return true;
      if (Array.isArray(obj)) return obj.some(hasFileObjects);
      if (obj && typeof obj === 'object') {
        return Object.values(obj as Record<string, unknown>).some(hasFileObjects);
      }
      return false;
    };

    const imageFields = ['Logo', 'BackgroundImage', 'MainImage'] as const;
    let hasChanges = false;

    if (hasFileObjects(formData)) {
      hasChanges = true;
    } else {
      for (const field of imageFields) {
        const originalValue = originalDataRef.current[field];
        const currentValue = formData[field];
        if (originalValue && !currentValue) {
          hasChanges = true;
          break;
        }
      }
      if (!hasChanges && JSON.stringify(formData) !== JSON.stringify(originalDataRef.current)) {
        hasChanges = true;
      }
    }

    hasUnsavedChanges.current = hasChanges;
  }, [formData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handleLinkClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges.current) return;

      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href && !anchor.href.startsWith('javascript:')) {
        const isSamePage = anchor.href.includes('#') && anchor.href.split('#')[0] === window.location.href.split('#')[0];
        if (isSamePage) return;

        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handlePopState = () => {
      if (hasUnsavedChanges.current) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmed) {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const isCompactLayout = formData.LayoutStyle === LayoutStyle.COMPACT;

  const updateFormData = (path: string, value: unknown) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData: IBannerFormData = { ...(prev as IBannerFormData) };

      if (path === 'LayoutStyle') {
        const newLayout = value as LayoutStyle;
        const prevLayout = prev.LayoutStyle;

        if (newLayout === LayoutStyle.COMPACT && prevLayout !== LayoutStyle.COMPACT) {
          newData.MediaType = undefined;
          newData.MainImage = null;
          newData.Logo = null;
          newData.BackgroundImage = null;
          newData.YouTubeUrl = '';
          newData.Subtitle = '';
          newData.Border = { ShowBorder: false, Colour: '#f8c77c' };
          if (newData.Background.Type === BackgroundType.IMAGE || newData.Background.Type === BackgroundType.GRADIENT) {
            newData.Background = { ...newData.Background, Type: BackgroundType.SOLID, Value: '#38ae8e' };
          }
          if ((newData.CtaButtons?.length ?? 0) > 2) {
            newData.CtaButtons = newData.CtaButtons?.slice(0, 2);
          }
        } else if (newLayout !== LayoutStyle.COMPACT && prevLayout === LayoutStyle.COMPACT) {
          newData.MediaType = MediaType.IMAGE;
        }

        newData.LayoutStyle = newLayout;
        if (newLayout === LayoutStyle.COMPACT) {
          const textContent = getTextLengthFromHtml(newData.Description || '') > 0
            ? getTextLengthFromHtml(newData.Description || '') <= 100
              ? newData.Description?.replace(/<[^>]*>/g, '').trim() || 'Compact Banner'
              : newData.Description?.replace(/<[^>]*>/g, '').trim().slice(0, 97) + '...'
            : 'Compact Banner';
          newData.Title = textContent;
        }
        return newData;
      }

      if (path === 'Description' && prev.LayoutStyle === LayoutStyle.COMPACT) {
        const rawText = (value as string)?.replace(/<[^>]*>/g, '').trim() || 'Compact Banner';
        newData.Title = rawText.length <= 100 ? rawText : rawText.slice(0, 97) + '...';
      }

      if (path === 'Background.Type') {
        const newBackgroundType = value as BackgroundType;
        const previousBackgroundType = (prev as IBannerFormData).Background.Type;

        if (previousBackgroundType === BackgroundType.IMAGE && newBackgroundType !== BackgroundType.IMAGE) {
          newData.Background.Value = '#38ae8e';
        }

        if (newBackgroundType === BackgroundType.GRADIENT) {
          const startColour = newData.Background.GradientStartColour || '#667eea';
          const endColour = newData.Background.GradientEndColour || '#764ba2';
          const direction = newData.Background.GradientDirection || 'to bottom';
          newData.Background.Value = generateGradientValue(startColour, endColour, direction);
        }
      }

      let current: Record<string, unknown> = newData as unknown as Record<string, unknown>;
      let source: Record<string, unknown> = prev as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const nextSource = source[key] as unknown;
        const next = Array.isArray(nextSource)
          ? [...(nextSource as unknown[])]
          : { ...(nextSource as Record<string, unknown>) };
        current[key] = next as unknown;
        current = next as Record<string, unknown>;
        source = (nextSource as Record<string, unknown>);
      }
      current[keys[keys.length - 1]] = value as unknown;
      return newData as IBannerFormData;
    });
  };

  const addCTAButton = () => {
    const count = (formData.CtaButtons?.length ?? 0);
    if (count < 3) {
      setFormData(prev => ({
        ...prev,
        CtaButtons: [
          ...((prev.CtaButtons ?? [])),
          {
            Label: '',
            Url: '',
            Variant: CTAVariant.SECONDARY,
            External: false
          }
        ]
      }));
    }
  };

  const removeCTAButton = (index: number) => {
    setFormData(prev => ({
      ...prev,
      CtaButtons: (prev.CtaButtons ?? []).filter((_, i) => i !== index)
    }));
  };

  const updateCTAButton = <K extends keyof ICTAButton>(index: number, field: K, value: ICTAButton[K]) => {
    setFormData(prev => ({
      ...prev,
      CtaButtons: (prev.CtaButtons ?? []).map((button, i) =>
        i === index ? { ...button, [field]: value } : button
      )
    }));
  };

  const removeFile = (fieldName: 'Logo' | 'BackgroundImage' | 'MainImage') => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: null
    }));
  };

  const handleCancel = () => {
    const hasFileObjects = (obj: unknown): boolean => {
      if (obj instanceof File) return true;
      if (Array.isArray(obj)) return obj.some(hasFileObjects);
      if (obj && typeof obj === 'object') {
        return Object.values(obj as Record<string, unknown>).some(hasFileObjects);
      }
      return false;
    };

    if (hasFileObjects(formData)) {
      setShowConfirmModal(true);
      return;
    }

    const imageFields = ['Logo', 'BackgroundImage', 'MainImage'] as const;
    for (const field of imageFields) {
      const originalValue = originalDataRef.current[field];
      const currentValue = formData[field];
      if (originalValue && !currentValue) {
        setShowConfirmModal(true);
        return;
      }
    }

    if (JSON.stringify(formData) !== JSON.stringify(originalDataRef.current)) {
      setShowConfirmModal(true);
    } else {
      confirmCancel();
    }
  };

  const confirmCancel = () => {
    setShowConfirmModal(false);
    onCancel();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleUploadedFileChange = (file: File | null) => {
    if (!file) {
      setFormData(prev => ({
        ...prev,
        UploadedFile: null
      }));
      return;
    }

    if (!isValidFileType(file.type)) {
      errorToast.fileType('PDF, DOC, DOCX, XLS, XLSX, JPG, PNG');
      return;
    }

    if (file.size > MAX_UPLOADED_FILE_SIZE) {
      errorToast.fileSize(formatFileSize(MAX_UPLOADED_FILE_SIZE));
      return;
    }

    const uploadedFile: IUploadedFile & { File: File } = {
      FileUrl: URL.createObjectURL(file),
      FileName: file.name,
      FileSize: formatFileSize(file.size),
      FileType: getFileTypeFromMimeType(file.type),
      File: file
    };

    setFormData(prev => ({
      ...prev,
      UploadedFile: uploadedFile
    }));
  };

  return (
    <div className="card">
      <div className="card-header border-b border-brand-q">
        <h2 className="heading-4">Banner Editor</h2>
      </div>

      <form onSubmit={handleSubmit} className="card-content space-y-6">
        <div className="space-y-4 pt-4">
          <FormField label="Layout Style" required>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUT_STYLES.map(style => (
                <Button
                  key={style.value}
                  type="button"
                  variant={formData.LayoutStyle === style.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => updateFormData('LayoutStyle', style.value)}
                >
                  {style.label}
                </Button>
              ))}
            </div>
          </FormField>
        </div>

        <div className="space-y-4">
          <h3 className="heading-5 border-b border-brand-q pb-2 pt-4">Basic Information</h3>

          {!isCompactLayout && (
            <FormField label={<>Title <span className="text-brand-g">*</span></>} error={errors.Title}>
              <Input
                value={formData.Title}
                onChange={(e) => updateFormData('Title', e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-brand-f mt-1">
                {formData.Title.length}/100 characters
              </p>
            </FormField>
          )}

          {!isCompactLayout && (
            <FormField label="Subtitle">
              <Input
                value={formData.Subtitle}
                onChange={(e) => updateFormData('Subtitle', e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-brand-f mt-1">
                {formData.Subtitle?.length || 0}/50 characters
              </p>
            </FormField>
          )}

          <FormField label={isCompactLayout ? <>Banner Text <span className="text-brand-g">*</span></> : 'Description'}>
            <RichTextEditor
              value={formData.Description || ''}
              onChange={(value) => updateFormData('Description', value)}
              placeholder={isCompactLayout ? 'Enter the text that will appear on the compact banner...' : 'Enter banner description...'}
              minHeight={isCompactLayout ? '80px' : '120px'}
              toolbarFeatures={BANNER_TOOLBAR_FEATURES}
              allowedTags={BANNER_ALLOWED_TAGS}
            />
            <p className="text-xs text-brand-f mt-1">
              {getTextLengthFromHtml(formData.Description || '')}/{isCompactLayout ? 130 : 600} characters
            </p>
          </FormField>
        </div>

        {!isCompactLayout && (
          <div className="space-y-4 border-t border-brand-q pt-6">
            <h3 className="heading-5 border-b border-brand-q pb-2">Media</h3>

            <FormField label="Media Type">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData('MediaType', MediaType.IMAGE)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                    formData.MediaType === MediaType.IMAGE
                      ? 'border-brand-d bg-brand-d text-white'
                      : 'border-brand-q hover:border-brand-d'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Image
                </button>
                <button
                  type="button"
                  onClick={() => updateFormData('MediaType', MediaType.YOUTUBE)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                    formData.MediaType === MediaType.YOUTUBE
                      ? 'border-brand-d bg-brand-d text-white'
                      : 'border-brand-q hover:border-brand-d'
                  }`}
                >
                  <Youtube className="w-4 h-4" />
                  YouTube Video
                </button>
              </div>
            </FormField>

            {formData.MediaType === MediaType.IMAGE && (
              <MediaUpload
                label={<>Banner Image <InfoTooltip content="This image appears beside the text on split layouts, or below the text on full width layouts." /></>}
                value={formData.MainImage}
                onUpload={(file) => {
                  const imageUrl = URL.createObjectURL(file);
                  const img = new Image();
                  img.onload = () => {
                    const newImage = {
                      ...formData.MainImage,
                      Filename: file.name,
                      Alt: file.name,
                      Size: file.size,
                      File: file,
                      url: imageUrl,
                      Width: img.naturalWidth,
                      Height: img.naturalHeight,
                    };
                    updateFormData('MainImage', newImage);
                  };
                  img.src = imageUrl;
                }}
                onRemove={() => removeFile('MainImage')}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
              />
            )}

            {formData.MediaType === MediaType.YOUTUBE && (
              <FormField label="YouTube URL" required error={errors.YouTubeUrl}>
                <Input
                  type="url"
                  value={formData.YouTubeUrl || ''}
                  onChange={(e) => updateFormData('YouTubeUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-sm text-brand-f mt-1">
                  Paste a YouTube video URL. The video will be embedded in the banner.
                </p>
              </FormField>
            )}

            <MediaUpload
              label={<>Logo <InfoTooltip content="An optional logo displayed alongside the banner content. Use this to feature a partner or campaign logo." /></>}
              value={formData.Logo}
              onUpload={(file) => updateFormData('Logo', file)}
              onRemove={() => removeFile('Logo')}
              accept="image/*"
              maxSize={5 * 1024 * 1024}
            />
          </div>
        )}

        <div className="space-y-4 border-t border-brand-q pt-6">
          <h3 className="heading-5 border-b border-brand-q pb-2">Styling Options</h3>

          <FormField label={<>Text Colour <InfoTooltip content="Choose white text for dark backgrounds or black text for light backgrounds to ensure readability." /></>} required>
            <Select
              value={formData.TextColour}
              onChange={(e) => updateFormData('TextColour', e.target.value)}
              options={TEXT_COLOURS}
            />
          </FormField>

          {!isCompactLayout && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background Type <span className="text-brand-g">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_TYPES.map(type => (
                  <Button
                    key={type.value}
                    type="button"
                    variant={formData.Background.Type === type.value ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => updateFormData('Background.Type', type.value)}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {formData.Background.Type === BackgroundType.SOLID && (
            <FormField label="Background Colour" required>
              <ColourPicker
                value={formData.Background.Value}
                onChange={(value) => updateFormData('Background.Value', value)}
              />
            </FormField>
          )}

          {formData.Background.Type === BackgroundType.GRADIENT && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Colour" required>
                  <ColourPicker
                    value={formData.Background.GradientStartColour || '#667eea'}
                    onChange={(value) => {
                      updateFormData('Background.GradientStartColour', value);
                      updateFormData('Background.Value', generateGradientValue(
                        value,
                        formData.Background.GradientEndColour || '#764ba2',
                        formData.Background.GradientDirection || 'to bottom'
                      ));
                    }}
                  />
                </FormField>
                <FormField label="End Colour" required>
                  <ColourPicker
                    value={formData.Background.GradientEndColour || '#764ba2'}
                    onChange={(value) => {
                      updateFormData('Background.GradientEndColour', value);
                      updateFormData('Background.Value', generateGradientValue(
                        formData.Background.GradientStartColour || '#667eea',
                        value,
                        formData.Background.GradientDirection || 'to bottom'
                      ));
                    }}
                  />
                </FormField>
              </div>
              <FormField label="Direction">
                <Select
                  value={formData.Background.GradientDirection || 'to bottom'}
                  onChange={(e) => {
                    updateFormData('Background.GradientDirection', e.target.value);
                    updateFormData('Background.Value', generateGradientValue(
                      formData.Background.GradientStartColour || '#667eea',
                      formData.Background.GradientEndColour || '#764ba2',
                      e.target.value
                    ));
                  }}
                  options={GRADIENT_DIRECTIONS}
                />
              </FormField>
            </div>
          )}

          {formData.Background.Type === BackgroundType.IMAGE && (
            <div className="space-y-4 p-4 rounded-md">
              <MediaUpload
                label={<>Background Image <InfoTooltip content="Use an image as the banner background instead of a solid colour or gradient. Adjust the overlay settings below to ensure text remains readable." /></>}
                value={formData.BackgroundImage}
                onUpload={(file) => {
                  updateFormData('BackgroundImage', file);
                  updateFormData('Background.Value', 'background-image-url');
                }}
                onRemove={() => {
                  removeFile('BackgroundImage');
                  updateFormData('Background.Value', '');
                }}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
              />

              <h4 className="text-sm font-semibold text-brand-k">Image Overlay Settings</h4>
              <p className="text-xs text-brand-f mb-3">Add a colour overlay to improve text readability on the background image</p>

              <FormField label="Overlay Colour" required>
                <ColourPicker
                  value={formData.Background.Overlay?.Colour || 'rgba(0,0,0,0.5)'}
                  onChange={(value) => {
                    updateFormData('Background.Overlay.Colour', value);
                    const rgbaMatch = value.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/);
                    if (rgbaMatch) {
                      updateFormData('Background.Overlay.Opacity', parseFloat(rgbaMatch[1]));
                    } else {
                      updateFormData('Background.Overlay.Opacity', 1);
                    }
                  }}
                  enableOpacity
                />
              </FormField>
            </div>
          )}

          {!isCompactLayout && (
            <div className="space-y-3 pt-4 border-t border-brand-q">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Show Border
                  </label>
                  <InfoTooltip content="Add decorative borders at the top and bottom of the banner. This style is commonly used for campaign banners." />
                </div>
                <Checkbox
                  label=""
                  checked={formData.Border?.ShowBorder ?? false}
                  onChange={(e) => updateFormData('Border.ShowBorder', (e.target as HTMLInputElement).checked)}
                />
              </div>

              {formData.Border?.ShowBorder && (
                <FormField label="Border Colour">
                  <ColourPicker
                    value={formData.Border?.Colour || '#f8c77c'}
                    onChange={(value) => updateFormData('Border.Colour', value)}
                  />
                </FormField>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-brand-q pt-6">
          <div className="flex justify-between items-center">
            <h3 className="heading-5">Call-to-Action Buttons</h3>
            {(formData.CtaButtons?.length ?? 0) < (isCompactLayout ? 2 : 3) && (
              <Button type="button" variant="outline" size="sm" onClick={addCTAButton}>
                <Plus className="h-4 w-4 mr-1" />
                Add Button
              </Button>
            )}
          </div>

          {errors.CtaButtons && (
            <p className="text-small text-brand-g">{errors.CtaButtons}</p>
          )}

          <div className="space-y-3">
            {(formData.CtaButtons ?? []).map((button, index) => (
              <div key={index} className="card-compact border border-brand-q">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <FormField label="Button Label" required>
                    <Input
                      value={button.Label}
                      onChange={(e) => updateCTAButton(index, 'Label', e.target.value)}
                      placeholder="Click"
                    />
                  </FormField>
                  <FormField label="Button URL" required>
                    <Input
                      value={button.Url}
                      onChange={(e) => updateCTAButton(index, 'Url', e.target.value)}
                    />
                  </FormField>
                </div>
                <div className="flex justify-between items-center">
                  <FormField label={<>Button Style <InfoTooltip content="Primary: Solid filled button for main actions. Secondary: Subtle filled button for alternative actions. Outline: Bordered button for less prominent actions." /></>} required>
                    <Select
                      value={button.Variant}
                      onChange={(e) => updateCTAButton(index, 'Variant', (e.target as HTMLSelectElement).value as CTAVariant)}
                      options={CTA_VARIANTS}
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCTAButton(index)}
                    title='Remove button'
                    className="p-2 hover:bg-brand-g hover:bg-opacity-10 rounded-full transition-colors"
                  >
                    <Trash className="w-4 h-4 text-brand-g" />
                  </Button>
                </div>
                <div className="mt-2">
                  <Checkbox
                    label="External link (opens in new tab)"
                    checked={button.External}
                    onChange={(e) => updateCTAButton(index, 'External', (e.target as HTMLInputElement).checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isCompactLayout && (
          <div className="space-y-4 border-t border-brand-q pt-6">
            <h3 className="heading-5 border-b border-brand-q pb-2 flex items-center">Attached File (Optional) <InfoTooltip content="Upload a file to be linked from a CTA button or referenced in the banner description. The file URL will be provided after upload." className="ml-1.5" /></h3>
            <p className="text-sm text-brand-f">
              Upload a PDF, document, or image to link from CTA buttons.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="uploaded-file"
                  className="btn-base btn-primary btn-md cursor-pointer inline-flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Choose File
                </label>
                <input
                  type="file"
                  id="uploaded-file"
                  accept={UPLOADED_FILE_ACCEPT_STRING}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleUploadedFileChange(file || null);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <span className="text-sm text-brand-f">
                  {formData.UploadedFile && 'FileName' in formData.UploadedFile
                    ? formData.UploadedFile.FileName
                    : formData.UploadedFile instanceof File
                      ? formData.UploadedFile.name
                      : 'No file chosen'}
                </span>
              </div>

              {formData.UploadedFile && (
                <div className="flex items-center justify-between p-3 bg-brand-q rounded-md border border-brand-q">
                  <div>
                    <span className="text-sm text-brand-k font-medium block">
                      {'FileName' in formData.UploadedFile ? formData.UploadedFile.FileName : (formData.UploadedFile as File).name}
                    </span>
                    {'FileUrl' in formData.UploadedFile && (
                      <span className="text-xs text-brand-f">
                        Use this URL in your CTA button: {formData.UploadedFile.FileUrl}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUploadedFileChange(null)}
                  >
                    Remove File
                  </Button>
                </div>
              )}

              <p className="text-xs text-brand-f">
                Accepted formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Maximum file size: 10MB.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 border-t border-brand-q pt-6">
          <h3 className="heading-5 border-b border-brand-q pb-2">Publishing Options</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Location" required>
              <Select
                id="locationSlug"
                value={formData.LocationSlug}
                onChange={(e) => {
                  const selectedLocationSlug = e.target.value;
                  updateFormData('LocationSlug', selectedLocationSlug);

                  const selectedLocation = cities.find((loc) => loc.Key === selectedLocationSlug);
                  if (selectedLocation) {
                    updateFormData('LocationName', selectedLocation.Name);
                  }
                }}
                options={cities.map(city => ({ value: city.Key, label: city.Name }))}
                placeholder="Select a location..."
              />
            </FormField>

            <FormField label={<>Priority (1-10) <InfoTooltip content="Banners with higher priority (10) appear higher up the page than those with lower priority (1). Banners with equal priority rotate randomly." /></>} required>
              <Input
                type="number"
                value={formData.Priority}
                onChange={(e) => updateFormData('Priority', Number(e.target.value))}
                min={1}
                max={10}
              />
            </FormField>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-6 border-t border-brand-q mt-6">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Banner'}
          </Button>
        </div>

        <ErrorDisplay
          ErrorMessage={errorMessage || undefined}
          FieldErrors={errors}
          ValidationErrors={validationErrors?.map(err => ({
            Path: err.path,
            Message: err.message
          }))}
          ClassName="mt-4"
        />
      </form>

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmCancel}
        title="Close without saving?"
        message="You may lose unsaved changes."
        variant="warning"
        confirmLabel="Close Without Saving"
        cancelLabel="Continue Editing"
      />
    </div>
  );
}
export type { IBannerFormData };
