import {
  PageHeader,
  Spinner,
  SegmentedControl,
  PageState,
  BackToDashboardLink,
} from '../components/ui';
import { ProfileHealthTab } from './profile/ProfileHealthTab';
import { ProfileMembershipAlerts } from './profile/ProfileMembershipAlerts';
import { ProfileDatosTab } from './profile/ProfileDatosTab';
import { ProfileProgresoTab } from './profile/ProfileProgresoTab';
import { ProfileCarneTab } from './profile/ProfileCarneTab';
import { ProfileAparienciaTab } from './profile/ProfileAparienciaTab';
import { ProfileSeguridadTab } from './profile/ProfileSeguridadTab';
import { ProfileModals } from './profile/ProfileModals';
import { useProfilePage } from './profile/useProfilePage';

export default function Profile() {
  const page = useProfilePage();

  if (page.loading) {
    return (
      <PageState>
        <Spinner />
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Cargando perfil…</p>
      </PageState>
    );
  }

  if (!page.profile || !page.user) {
    return (
      <div className="py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No se pudo cargar el perfil
      </div>
    );
  }

  const { profile, user } = page;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-4xl">
      <PageHeader
        compact
        title={
          <>
            Mi <span className="text-brand">perfil</span>
          </>
        }
        subtitle={user.role === 'member' ? 'Tu cuenta' : 'Tu cuenta y apariencia'}
        action={
          (page.isProfileDirty && page.profileTab === 'datos') || user.role !== 'member' ? (
            <div className="flex shrink-0 items-center gap-2">
              {page.isProfileDirty && page.profileTab === 'datos' && (
                <span className="text-[10px] font-semibold text-amber-600 sm:text-xs dark:text-amber-400">
                  Sin guardar
                </span>
              )}
              {user.role !== 'member' && <BackToDashboardLink iconOnly className="sm:hidden" />}
              {user.role !== 'member' && (
                <span className="hidden sm:inline-flex">
                  <BackToDashboardLink />
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      <ProfileMembershipAlerts role={user.role} subscription={page.subscription} />

      <div className="pb-0.5 md:pb-1">
        <SegmentedControl
          variant="compact"
          layout="wrap"
          fullWidth
          className="w-full"
          value={page.profileTab}
          onChange={page.changeProfileTab}
          options={page.profileTabOptions}
        />
      </div>

      {page.profileTab === 'datos' && (
        <ProfileDatosTab
          profile={profile}
          form={page.form}
          setForm={page.setForm}
          isProfileDirty={page.isProfileDirty}
          saving={page.saving}
          isTrainer={page.isTrainer}
          trainerProfile={page.trainerProfile}
          avatarUploading={page.avatarUploading}
          avatarRemoving={page.avatarRemoving}
          onAvatarChange={(e) => void page.handleAvatarChange(e)}
          onRequestRemoveAvatar={() => page.setShowRemoveAvatarModal(true)}
          onSave={(e) => void page.handleSaveProfile(e)}
        />
      )}

      {page.profileTab === 'salud' && page.isMember && (
        <ProfileHealthTab
          userId={user.id}
          profile={profile}
          measurements={page.measurements}
          onSwitchToDatos={() => page.setProfileTab('datos')}
        />
      )}

      {page.profileTab === 'progreso' && page.isMember && (
        <ProfileProgresoTab
          progressLoading={page.progressLoading}
          profile={profile}
          measurements={page.measurements}
          workouts={page.workouts}
          chartData={page.chartData}
          latestWeight={page.latestWeight}
          weightDelta={page.weightDelta}
          bmi={page.bmi}
          workoutsThisMonth={page.workoutsThisMonth}
          historyOpen={page.historyOpen}
          onHistoryOpenChange={page.setHistoryOpen}
          onAddMeasurement={() => page.setIsAddingMeasurement(true)}
        />
      )}

      {page.profileTab === 'carne' && page.isMember && (
        <ProfileCarneTab
          badgeMember={page.badgeMember}
          onShowScan={() => page.setShowScanView(true)}
          onShowBadgeModal={() => page.setShowBadgeModal(true)}
        />
      )}

      {page.profileTab === 'apariencia' && (
        <ProfileAparienciaTab theme={page.theme} onThemeChange={page.setTheme} />
      )}

      {page.profileTab === 'seguridad' && (
        <ProfileSeguridadTab
          role={user.role}
          passwordForm={page.passwordForm}
          setPasswordForm={page.setPasswordForm}
          passwordSaving={page.passwordSaving}
          passwordError={page.passwordError}
          onChangePassword={(e) => void page.handleChangePassword(e)}
        />
      )}

      <ProfileModals
        showRemoveAvatarModal={page.showRemoveAvatarModal}
        avatarRemoving={page.avatarRemoving}
        onCloseRemoveAvatar={() => page.setShowRemoveAvatarModal(false)}
        onConfirmRemoveAvatar={() => void page.handleAvatarRemove()}
        showBadgeModal={page.showBadgeModal}
        onCloseBadgeModal={() => page.setShowBadgeModal(false)}
        showScanView={page.showScanView}
        onCloseScanView={() => page.setShowScanView(false)}
        badgeMember={page.badgeMember}
        isAddingMeasurement={page.isAddingMeasurement}
        onCloseMeasurement={() => page.setIsAddingMeasurement(false)}
        measurementError={page.measurementError}
        measurementForm={page.measurementForm}
        setMeasurementForm={page.setMeasurementForm}
        onAddMeasurement={(e) => void page.handleAddMeasurement(e)}
      />
    </div>
  );
}
