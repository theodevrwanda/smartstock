import { IPlan } from '@/types';

export const mockPlans: IPlan[] = [
  {
    _id: '1',
    name: 'Free Plan',
    price: 0,
    duration: 'monthly',
    features: [
  'Basic Dashboard Access',
  '100MB Database Storage',
  '1 Branch',
  'Up to 5 Employees',
  '3 Auto Email Reports',
  'Out-of-Stock Alerts',
  'No Data Sorting or Filtering',
  'Manual Updates Only',
  'Cloud Back Up (Upgrade)',
  'VAT & Tax Tools (Upgrade)',
],
    isActive: true,
  },
  {
    _id: '2',
    name: 'Standard Plan',
    price: 7000,
    duration: 'monthly',
    features: [
      'Full Products Management',
      '500MB Database Storage',
      'Unlimited Employees',
      'Unlimited Branches',
      'Auto Cloud Back Up',
      'Unlimited Auto Reports',
      'Unlimited Auto low Stock Alerts',
      'Multiple Admin',
      'Auto Calculating Prices'
    ],
    isActive: true,
  },
  {
    _id: '3',
    name: 'Business Plan',
    price: 50000,
    duration: 'yearly',
    features: [
     'Full Products Management',
      '500MB Database Storage',
      'Unlimited Employees',
      'Unlimited Branches',
      'Auto Cloud Back Up',
      'Unlimited Auto Reports',
      'Unlimited Auto low Stock Alerts',
      'Multiple Admin',
      'Auto Calculating Prices'
    ],
    isActive: true,
  },
  {
    _id: '4',
    name: 'Premium Plan',
    price: 250000,
    duration: 'lifetime',
    features: [
      'Full Products Managements',
      'Unlimited Employees',
      'unlimited Branches',
      'Advanced Auto Reports',
      'Auto Records Back Up',
      'Auto Calculating Prices',
      'unlimited Features',
      'Custom Own Features',
      'Private SaaS App',
      "Offline Support (Sync)"
    ],
    isActive: true,
  },
];
