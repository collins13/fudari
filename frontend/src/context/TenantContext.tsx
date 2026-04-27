'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { estatesAPI } from '@/lib/api';

export interface TenantBrand {
  estateId: number;
  name: string;
  slug: string;
  area: string;
  brandPrimaryColor: string | null;
  brandLogoUrl: string | null;
  brandWelcomeMessage: string | null;
  shortCode: string | null;
  whatsappStartCommand: string | null;
  managerPhone: string | null;
}

interface TenantContextType {
  tenant: TenantBrand | null;
  isEstateBranded: boolean;
  loadTenant: (slug: string) => Promise<void>;
  clearTenant: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isEstateBranded: false,
  loadTenant: async () => {},
  clearTenant: () => {},
});

export function TenantProvider({ children, slug }: { children: ReactNode; slug?: string }) {
  const [tenant, setTenant] = useState<TenantBrand | null>(null);

  const loadTenant = async (estateSlug: string) => {
    try {
      const res = await estatesAPI.resolve(estateSlug);
      const d = res.data;
      setTenant({
        estateId: d.id,
        name: d.name,
        slug: d.slug,
        area: d.area,
        brandPrimaryColor: d.brandPrimaryColor,
        brandLogoUrl: d.brandLogoUrl,
        brandWelcomeMessage: d.brandWelcomeMessage,
        shortCode: d.shortCode,
        whatsappStartCommand: d.whatsappStartCommand,
        managerPhone: d.managerPhone,
      });
    } catch {
      setTenant(null);
    }
  };

  const clearTenant = () => setTenant(null);

  useEffect(() => {
    if (slug) loadTenant(slug);
  }, [slug]);

  return (
    <TenantContext.Provider value={{ tenant, isEstateBranded: !!tenant, loadTenant, clearTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
