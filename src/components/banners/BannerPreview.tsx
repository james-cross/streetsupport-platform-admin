'use client';

import React from 'react';
import Image from 'next/image';
import { IBannerFormData, LayoutStyle, MediaType } from '@/types/banners/IBanner';
import { BackgroundType, CTAVariant, type IMediaAsset } from '@/types';
import { sanitizeHtmlForDisplay } from '@/components/ui/RichTextEditor';

interface BannerPreviewProps {
  data: IBannerFormData;
  className?: string;
}

const isMediaAsset = (asset: unknown): asset is IMediaAsset => {
  return !!asset && typeof asset === 'object' && 'Url' in (asset as Record<string, unknown>);
};

type MediaAssetFileMeta = { File: File; Width?: number; Height?: number };
const isMediaAssetFileMeta = (value: unknown): value is MediaAssetFileMeta => {
  return (
    !!value &&
    typeof value === 'object' &&
    'File' in (value as Record<string, unknown>) &&
    (value as { File?: unknown }).File instanceof File
  );
};

const getYouTubeEmbedUrl = (url: string): string => {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
};

type TextColour = 'white' | 'dark';

function generateCTAClasses(variant: string, textColour: TextColour): string {
  const baseClasses = 'inline-flex items-center justify-center px-6 py-3 font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  switch (variant) {
    case 'primary':
      if (textColour === 'white') {
        return `${baseClasses} bg-white text-gray-900 hover:bg-gray-100 focus:ring-white`;
      }
      return `${baseClasses} bg-brand-a text-white hover:bg-brand-b focus:ring-brand-a`;

    case 'secondary':
      if (textColour === 'white') {
        return `${baseClasses} bg-white/20 text-white border border-white/40 hover:bg-white/30 focus:ring-white`;
      }
      return `${baseClasses} bg-white text-brand-a border border-brand-a hover:bg-brand-a hover:text-white hover:border-brand-a focus:ring-brand-a`;

    case 'outline':
      if (textColour === 'white') {
        return `${baseClasses} bg-white/10 border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`;
      }
      return `${baseClasses} bg-transparent border-2 border-brand-a text-brand-a hover:bg-brand-a hover:text-white focus:ring-brand-a`;

    default:
      return baseClasses;
  }
}

const ExternalLinkIcon = () => (
  <svg className="ml-2 w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

function transformToPublicFormat(data: IBannerFormData) {
  const processMediaAsset = (
    asset: IMediaAsset | File | MediaAssetFileMeta | null | undefined
  ): { url: string; alt: string; width?: number; height?: number } | undefined => {
    if (asset instanceof File) {
      return { url: URL.createObjectURL(asset), alt: asset.name };
    }
    if (isMediaAssetFileMeta(asset)) {
      return {
        url: URL.createObjectURL(asset.File),
        alt: asset.File.name,
        width: asset.Width,
        height: asset.Height,
      };
    }
    if (isMediaAsset(asset)) {
      return { url: asset.Url || '', alt: asset.Alt || '', width: asset.Width, height: asset.Height };
    }
    return undefined;
  };

  const bgImage = processMediaAsset(data.BackgroundImage);
  const backgroundType = data.Background?.Type?.toLowerCase() || 'solid';

  const ctaButtons = data.CtaButtons?.map((btn) => ({
    label: btn.Label || '',
    url: btn.Url,
    variant: btn.Variant?.toLowerCase() || CTAVariant.PRIMARY,
    external: btn.External || false
  })) || [];

  return {
    id: data._id || '',
    title: data.Title || '',
    description: data.Description || '',
    subtitle: data.Subtitle || '',
    logo: processMediaAsset(data.Logo),
    image: processMediaAsset(data.MainImage),
    ctaButtons: ctaButtons,
    background: {
      type: backgroundType,
      value: backgroundType === BackgroundType.IMAGE ? (bgImage?.url || data.Background?.Value || '') : (data.Background?.Value || '#38ae8e'),
      backgroundImage: bgImage,
      overlay: data.Background?.Overlay ? {
        colour: data.Background.Overlay.Colour || 'rgba(0,0,0,0.5)',
        opacity: data.Background.Overlay.Opacity || 0.5
      } : undefined
    },
    textColour: data.TextColour?.toLowerCase() || 'white',
    layoutStyle: data.LayoutStyle?.toLowerCase() || LayoutStyle.SPLIT,
    startDate: data.StartDate,
    endDate: data.EndDate,
    mediaType: data.MediaType,
    youTubeUrl: data.YouTubeUrl,
    border: data.Border ? {
      showBorder: data.Border.ShowBorder || false,
      colour: data.Border.Colour || '#f8c77c'
    } : undefined
  };
}

export const BannerPreview: React.FC<BannerPreviewProps> = ({ data, className = '' }) => {
  const props = transformToPublicFormat(data);

  const getBackgroundStyle = () => {
    if (props.background.type === 'image' && props.background.backgroundImage?.url) {
      return {
        backgroundImage: `url(${props.background.backgroundImage.url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    if (props.background.type === 'gradient') {
      return { background: props.background.value };
    }
    return { backgroundColor: props.background.value };
  };

  const getBorderStyle = (): React.CSSProperties => {
    if (!props.border?.showBorder) return {};
    return {
      borderTop: `50px solid ${props.border.colour}`,
      borderBottom: `50px solid ${props.border.colour}`,
    };
  };

  const textColourClass = props.textColour === 'white' ? 'text-white' : 'text-brand-k';
  const isSplitLayout = props.layoutStyle === 'split';
  const isCompactLayout = props.layoutStyle === 'compact';

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ ...getBackgroundStyle(), ...(isCompactLayout ? {} : getBorderStyle()) }}
    >
      {props.background.type === 'image' && props.background.overlay && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: props.background.overlay.colour,
            opacity: props.background.overlay.opacity
          }}
          aria-hidden="true"
        />
      )}

      {isCompactLayout ? (
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-10 text-center">
          <h2 className="sr-only">{props.title}</h2>
          {props.description && (
            <div
              className={`text-lg ${textColourClass} mb-4 [&_p]:m-0 ${props.textColour === 'white' ? '[&_a]:text-white [&_a]:underline' : '[&_a]:text-brand-a [&_a]:underline'}`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(props.description) }}
            />
          )}
          {props.ctaButtons.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center">
              {props.ctaButtons.map((btn, index) => (
                <a
                  key={index}
                  href={btn.url}
                  className={generateCTAClasses(btn.variant, props.textColour as TextColour)}
                  target={btn.external ? '_blank' : undefined}
                  rel={btn.external ? 'noopener noreferrer' : undefined}
                >
                  {btn.label}
                  {btn.external && <ExternalLinkIcon />}
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`relative z-10 ${isSplitLayout ? 'max-w-7xl mx-auto px-4 py-12 md:py-16' : 'px-4 py-12 md:py-16'}`}>
          <div className={`${isSplitLayout ? 'grid md:grid-cols-2 gap-8 items-center' : 'text-center max-w-4xl mx-auto'}`}>
            <div className={`space-y-4 ${!isSplitLayout ? 'mb-8' : ''}`}>
              {props.logo && (
                <div className={`${!isSplitLayout ? 'flex justify-center' : ''}`}>
                  <Image
                    src={props.logo.url}
                    alt={props.logo.alt || 'Logo'}
                    width={120}
                    height={40}
                    className="object-contain"
                  />
                </div>
              )}

              {props.subtitle && (
                <p className={`text-sm font-medium uppercase tracking-wider ${textColourClass} opacity-80`}>
                  {props.subtitle}
                </p>
              )}

              <h2 className={`text-3xl md:text-4xl font-bold ${textColourClass}`}>
                {props.title}
              </h2>

              {props.description && (
                <div
                  className={`text-lg ${textColourClass} opacity-90 prose prose-sm max-w-none ${props.textColour === 'white' ? 'prose-invert' : ''}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtmlForDisplay(props.description) }}
                />
              )}

              {props.ctaButtons.length > 0 && (
                <div className={`flex flex-wrap gap-3 pt-4 ${!isSplitLayout ? 'justify-center' : ''}`}>
                  {props.ctaButtons.map((btn, index) => (
                    <a
                      key={index}
                      href={btn.url}
                      className={generateCTAClasses(btn.variant, props.textColour as TextColour)}
                      target={btn.external ? '_blank' : undefined}
                      rel={btn.external ? 'noopener noreferrer' : undefined}
                    >
                      {btn.label}
                      {btn.external && <ExternalLinkIcon />}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className={`${!isSplitLayout ? 'flex justify-center' : ''}`}>
              {props.mediaType === MediaType.YOUTUBE && props.youTubeUrl ? (
                <div className="aspect-video w-full max-w-lg rounded-lg overflow-hidden shadow-lg">
                  <iframe
                    src={getYouTubeEmbedUrl(props.youTubeUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={props.title}
                  />
                </div>
              ) : props.image ? (
                <Image
                  src={props.image.url}
                  alt={props.image.alt || props.title}
                  width={props.image.width || 600}
                  height={props.image.height || 400}
                  className="rounded-lg object-cover shadow-lg"
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerPreview;
