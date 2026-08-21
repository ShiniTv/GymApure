import { PageHeader, SegmentedControl, PageState, BackToDashboardLink } from '../components/ui';
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
        <div className="mx-auto w-full max-w-4xl space-y-3 px-1">
          <div className="bg-surface-raised h-8 w-40 animate-pulse rounded-lg" />
          <div className="bg-surface-raised h-10 w-full animate-pulse rounded-xl" />
          <div className="bg-surface-raised h-48 w-full animate-pulse rounded-xl" />
        </div>
      </PageState>
    );
  }

  if (!page.profile || !page.user) {
    return (
      <div className="page-stack-tight mx-auto w-full max-w-4xl py-10 text-center">
        <p className="text-text text-sm font-semibold">No se pudo cargar el perfil</p>
        <p className="text-text-muted mt-1 text-xs">
          Revisa tu conexión e inténtalo de nuevo. Si el problema sigue, cierra sesión y vuelve a
          entrar.
        </p>
        <div className="mt-4 flex justify-center">
          <BackToDashboardLink />
        </div>
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
