import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab } from '@headlessui/react';
import PendingCoaches from './PendingCoaches';
import UsersList from './UsersList';
import PlatformStats from './PlatformStats';

// Tab components with appropriate icons
const tabs = [
  {
    id: 'pending-coaches',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    id: 'users',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    id: 'platform-stats',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
];

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [selectedTab, setSelectedTab] = useState(0);

  const tabData = [
    { id: 'pending-coaches', label: t('admin.pendingCoaches'), component: <PendingCoaches /> },
    { id: 'users', label: t('admin.users'), component: <UsersList /> },
    { id: 'platform-stats', label: t('admin.platformStats'), component: <PlatformStats /> },
  ];

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-bold mb-6">{t('admin.dashboard')}</h1>
      
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        {/* Mobile tab selector (dropdown style for small screens) */}
        <div className="block sm:hidden mb-4">
          <select 
            className="w-full p-2 border rounded-md bg-white dark:bg-gray-800"
            value={selectedTab}
            onChange={(e) => setSelectedTab(parseInt(e.target.value))}
          >
            {tabData.map((tab, index) => (
              <option key={tab.id} value={index}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Desktop tabs */}
        <Tab.List className="hidden sm:flex space-x-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          {tabData.map((tab, index) => (
            <Tab
              key={tab.id}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                 ${selected 
                  ? 'bg-white dark:bg-gray-700 shadow text-lumea-primary dark:text-lumea-primary-light' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-800'}`
              }
            >
              <div className="flex items-center justify-center space-x-1">
                {tabs[index].icon}
                <span>{tab.label}</span>
              </div>
            </Tab>
          ))}
        </Tab.List>
        
        {/* Tab panels */}
        <Tab.Panels className="mt-4">
          {tabData.map((tab) => (
            <Tab.Panel key={tab.id} className="rounded-xl bg-white dark:bg-gray-800 p-4 shadow-md">
              {tab.component}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
};

export default AdminDashboard; 