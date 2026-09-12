import React from 'react';
import { UserCircle } from 'lucide-react';
import {
  SegmentedControl,
  PageState,
  BackToDashboardLink,
  Button,
  EmptyState,
  Skeleton,
} from '../components/ui';
import { OperatePage } from '../components/operate/OperateChrome';
import { ProfileAthleteHero } from './profile/ProfileAthleteHero';
import { ProfileHealthTab } from './profile/ProfileHealthTab';
import { ProfileMembershipAlerts } from './profile/ProfileMembershipAlerts';
import { ProfileDatosTab } from './profile/ProfileDatosTab';
import { ProfileProgresoTab } from './profile/ProfileProgresoTab';
import { ProfileCarneTab } from './profile/ProfileCarneTab';
import { ProfileAparienciaTab } from './profile/ProfileAparienciaTab';
import { ProfileSeguridadTab } from './profile/ProfileSeguridadTab';
import { ProfileModals } from './profile/ProfileModals';
import { MeasurementModal } from './profile/MeasurementModal';
import { useProfilePage } from './profile/useProfilePage';

export default function Profile() {
  const page = useProfilePage();

  if (page.loading) {
    return (
      <PageState>
        <OperatePage maxWidth="max-w-4xl">
          <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-card)]" />
          <Skeleton className="h-56 w-full rounded-[var(--radius-card)]" />
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
              <Button size="md" variant="secondary" onClick={() => window.location.reload()}>
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
    <OperatePage maxWidth="max-w-4xl" className="space-y-4">
      {/* Hero de Atleta / Cuenta */}
      <ProfileAthleteHero
        profile={profile}
        role={user.role}
        subscription={page.subscription}
        workoutsThisMonth={page.workoutsThisMonth}
        avatarUploading={page.avatarUploading}
        avatarRemoving={page.avatarRemoving}
        onAvatarChange={(e) => void page.handleAvatarChange(e)}
        onRequestRemoveAvatar={() => page.setShowRemoveAvatarModal(true)}
        onOpenCarneTab={() => page.changeProfileTab('carne')}
      />

      <ProfileMembershipAlerts role={user.role} subscription={page.subscription} />

      {/* Selector de Pestañas */}
      <SegmentedControl
        layout="wrap"
        fullWidth
        className="w-full shadow-2xs"
        value={page.profileTab}
        onChange={page.changeProfileTab}
        options={page.profileTabOptions}
      />

      {/* Pestaña: Datos */}
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

      {/* Pestaña: Progreso & Medidas */}
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
          onAddMeasurement={() => {
            page.setEditingMeasurement(null);
            page.setIsAddingMeasurement(true);
          }}
          onEditMeasurement={page.handleOpenEditMeasurement}
          onDeleteMeasurement={page.handleDeleteMeasurement}
        />
      )}

      {/* Pestaña: Salud */}
      {page.profileTab === 'salud' && page.isMember && (
        <ProfileHealthTab
          userId={user.id}
          profile={profile}
          measurements={page.measurements}
          onSwitchToDatos={() => page.setProfileTab('datos')}
        />
      )}

      {/* Pestaña: Carnet QR */}
      {page.profileTab === 'carne' && page.isMember && (
        <ProfileCarneTab
          badgeMember={page.badgeMember}
          onShowScan={() => page.setShowScanView(true)}
          onShowBadgeModal={() => page.setShowBadgeModal(true)}
        />
      )}

      {/* Pestaña: Seguridad */}
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

      {/* Pestaña: Apariencia */}
      {page.profileTab === 'apariencia' && (
        <ProfileAparienciaTab theme={page.theme} onThemeChange={page.setTheme} />
      )}

      {/* Modal Inteligente de Mediciones Corporales */}
      <MeasurementModal
        open={page.isAddingMeasurement}
        onClose={() => {
          page.setIsAddingMeasurement(false);
          page.setEditingMeasurement(null);
        }}
        onSubmit={page.handleSaveMeasurementPayload}
        latestMeasurement={page.latestMeasurement}
        initialWeight={profile.initial_weight}
        heightCm={page.heightCm}
        editingMeasurement={page.editingMeasurement}
      />

      {/* Modales Auxiliares (Avatar, Carnet, etc.) */}
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
        isAddingMeasurement={false}
        onCloseMeasurement={() => {
          /* noop */
        }}
        measurementError=""
        measurementForm={page.measurementForm}
        setMeasurementForm={() => {
          /* noop */
        }}
        onAddMeasurement={() => {
          /* noop */
        }}
      />
    </OperatePage>
  );
}
