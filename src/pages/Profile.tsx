import { UserCircle } from 'lucide-react';
import {
  SegmentedControl,
  PageState,
  BackToDashboardLink,
  Button,
  EmptyState,
  Skeleton,
} from '../components/ui';
import { OperateHeader, OperatePage } from '../components/operate/OperateChrome';
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
        <OperatePage maxWidth="max-w-4xl">
          <Skeleton className="h-14 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
        </OperatePage>
      </PageState>
    );
  }

  if (!page.profile || !page.user) {
    return (
      <OperatePage maxWidth="max-w-4xl">
        <EmptyState
          icon={UserCircle}
          title="No se pudo cargar el perfil"
          description="Revisa tu conexión e inténtalo de nuevo. Si el problema sigue, cierra sesión y vuelve a entrar."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="min-h-11"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
              <BackToDashboardLink />
            </div>
          }
        />
      </OperatePage>
    );
  }

  const { profile, user } = page;

  return (
    <OperatePage maxWidth="max-w-4xl">
      <OperateHeader
        icon={UserCircle}
        title={
          <>
            Mi <span className="text-brand">perfil</span>
          </>
        }
        subtitle={
          page.isProfileDirty && page.profileTab === 'datos'
            ? 'Hay cambios sin guardar'
            : user.role === 'member'
              ? 'Tu cuenta'
              : 'Tu cuenta y apariencia'
        }
        action={
          <>
            {page.isProfileDirty && page.profileTab === 'datos' && (
              <span className="text-small text-warning font-semibold">Sin guardar</span>
            )}
            {user.role !== 'member' && <BackToDashboardLink iconOnly className="sm:hidden" />}
            {user.role !== 'member' && (
              <span className="hidden sm:inline-flex">
                <BackToDashboardLink />
              </span>
            )}
          </>
        }
      />

      <ProfileMembershipAlerts role={user.role} subscription={page.subscription} />

      <SegmentedControl
        layout="wrap"
        fullWidth
        className="w-full"
        value={page.profileTab}
        onChange={page.changeProfileTab}
        options={page.profileTabOptions}
      />

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
    </OperatePage>
  );
}
