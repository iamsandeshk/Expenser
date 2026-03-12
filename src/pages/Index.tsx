import { useState } from 'react';
import { BottomNavigation } from '@/components/BottomNavigation';
import { HomeTab } from '@/components/tabs/HomeTab';
import { PersonalTab } from '@/components/tabs/PersonalTab';
import { SharedTab } from '@/components/tabs/SharedTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { AddPersonalExpenseModal } from '@/components/modals/AddPersonalExpenseModal';
import { AddSharedExpenseModal } from '@/components/modals/AddSharedExpenseModal';
import { LinksTab } from '@/components/tabs/LinksTab';
import { Onboarding } from '@/components/Onboarding';
import { isOnboardingDone } from '@/lib/storage';

const Index = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [showAddPersonalModal, setShowAddPersonalModal] = useState(false);
  const [showAddSharedModal, setShowAddSharedModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div key="home" className="animate-tab-enter">
            <HomeTab
              onAddPersonal={() => setShowAddPersonalModal(true)}
              onAddShared={() => setShowAddSharedModal(true)}
            />
          </div>
        );
      case 'personal':
        return (
          <div key="personal" className="animate-tab-enter">
            <PersonalTab />
          </div>
        );
      case 'shared':
        return (
          <div key="shared" className="animate-tab-enter">
            <SharedTab />
          </div>
        );
      case 'links':
        return (
          <div key="links" className="animate-tab-enter">
            <LinksTab />
          </div>
        );
      case 'settings':
        return (
          <div key="settings" className="animate-tab-enter">
            <SettingsTab />
          </div>
        );
      default:
        return (
          <div key="default" className="animate-tab-enter">
            <HomeTab onAddPersonal={() => {}} onAddShared={() => {}} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Main Content */}
      <main className="min-h-screen overflow-hidden pb-28 pt-safe-top">
        <div className="animate-fade-in-up">
          {renderActiveTab()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Global Modals */}
      <AddPersonalExpenseModal
        isOpen={showAddPersonalModal}
        onClose={() => setShowAddPersonalModal(false)}
        onAdd={() => setShowAddPersonalModal(false)}
      />

      <AddSharedExpenseModal
        isOpen={showAddSharedModal}
        onClose={() => setShowAddSharedModal(false)}
        onAdd={() => setShowAddSharedModal(false)}
      />
    </div>
  );
};

export default Index;
