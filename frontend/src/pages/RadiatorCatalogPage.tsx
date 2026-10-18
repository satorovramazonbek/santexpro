import React from 'react';
import { ProductCatalogPage } from './ProductCatalogPage';
import { User } from '../types';

export const RadiatorCatalogPage: React.FC<{ currentUser?: User | null }> = ({ currentUser }) => {
  return <ProductCatalogPage currentUser={currentUser} />;
};

export { ProductCatalogPage };
