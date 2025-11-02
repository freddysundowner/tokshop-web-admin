import { useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';

export function usePageTitle(pageTitle?: string) {
  const { settings } = useSettings();
  
  useEffect(() => {
    const baseTitle = settings.seo_title || settings.app_name;
    
    if (pageTitle) {
      document.title = `${pageTitle} | ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [pageTitle, settings.app_name, settings.seo_title]);
}
