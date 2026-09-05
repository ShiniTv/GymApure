import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import { Skeleton, ListRowSkeleton, AssignmentsListSkeleton } from '../components/ui';
import { PanelFallback } from './memberRoutine/PanelFallback';
import { MemberRoutineHeader } from './memberRoutine/MemberRoutineHeader';
import { MemberProfilePanel } from './memberRoutine/MemberProfilePanel';
import { MemberRoutinesList } from './memberRoutine/MemberRoutinesList';
import { MemberRoutineModals } from './memberRoutine/MemberRoutineModals';
import { useMemberRoutinePage } from './memberRoutine/useMemberRoutinePage';

const MemberProgressPanel = lazy(() =>
  import('./memberRoutine/MemberProgressPanel').then((module) => ({
    default: module.MemberProgressPanel,
  }))
);
const MemberCoachNotesPanel = lazy(() =>
  import('./memberRoutine/MemberCoachNotesPanel').then((module) => ({
    default: module.MemberCoachNotesPanel,
  }))
);
const MemberCoachingPanel = lazy(() =>
  import('./memberRoutine/MemberCoachingPanel').then((module) => ({
    default: module.MemberCoachingPanel,
  }))
);
const MemberTrainingBlocksPanel = lazy(() =>
  import('./memberRoutine/MemberTrainingBlocksPanel').then((module) => ({
    default: module.MemberTrainingBlocksPanel,
  }))
);
const MemberAppointmentsPanel = lazy(() =>
  import('./memberRoutine/MemberAppointmentsPanel').then((module) => ({
    default: module.MemberAppointmentsPanel,
  }))
);
const MemberMeasurementsPanel = lazy(() =>
  import('./memberRoutine/MemberMeasurementsPanel').then((module) => ({
    default: module.MemberMeasurementsPanel,
  }))
);

export default function MemberRoutine() {
  const { id } = useParams();
  const page = useMemberRoutinePage(id);

  if (page.loading) {
    return (
      <div
        className="page-stack-tight mx-auto w-full max-w-5xl"
        aria-busy="true"
        aria-label="Cargando miembro"
      >
        <div className="space-y-2">
          <Skeleton className="h-3 w-36" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-9 w-20 rounded-[var(--radius-button)]" />
          <Skeleton className="h-9 w-24 rounded-[var(--radius-button)]" />
          <Skeleton className="h-9 w-20 rounded-[var(--radius-button)]" />
        </div>
        <AssignmentsListSkeleton rows={3} />
        <ListRowSkeleton rows={3} />
      </div>
    );
  }
  if (!page.member) {
    return <div className="text-text-muted p-6">Miembro no encontrado</div>;
  }

  const { member, modals } = page;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-5xl">
      <MemberRoutineHeader
        member={member}
        memberId={id}
        routines={page.routines}
        subscription={page.subscription}
        coachingTab={page.coachingTab}
        showHealthAlert={page.showHealthAlert}
        coachingInsight={page.coachingInsight}
        headerPrimary={page.headerPrimary}
        moreMenuOpen={page.moreMenuOpen}
        moreMenuAnchorRef={page.moreMenuAnchorRef}
        onMoreMenuOpenChange={page.setMoreMenuOpen}
        onChangeTab={page.changeCoachingTab}
        onNavigate={(path) => void page.navigate(path)}
        onCreateRoutine={page.openCreateRoutine}
        onAssignRoutine={page.openAssignModal}
      />

      {page.coachingTab === 'perfil' && (
        <MemberProfilePanel
          member={member}
          subscription={page.subscription}
          latestMeasurement={page.latestMeasurement}
          healthProfile={page.healthProfile}
          showHealthAlert={page.showHealthAlert}
          hasHealthNotes={page.hasHealthNotes}
          canEditWeeklyGoal={page.user?.role === 'admin' || page.user?.role === 'trainer'}
          weeklyGoal={page.weeklyGoal}
          savingWeeklyGoal={page.savingWeeklyGoal}
          weeklyGoalSaved={page.weeklyGoalSaved}
          onWeeklyGoalChange={page.setWeeklyGoalDraft}
          onSaveWeeklyGoal={() => void page.handleSaveWeeklyGoal()}
          onViewMeasurements={() => page.changeCoachingTab('mediciones')}
          onRequestHealthMessage={() => void page.navigate(`/messages?member=${id}`)}
        />
      )}

      <MemberRoutineModals
        memberName={member.full_name}
        memberId={id}
        assignedRoutineIds={modals.assignedRoutineIds}
        isCreating={modals.isCreating}
        isEditing={modals.isEditing}
        routineForm={modals.routineForm}
        onRoutineFormChange={modals.setRoutineForm}
        onCloseRoutineForm={modals.onCloseRoutineForm}
        onCreateRoutine={() => void modals.handleCreateRoutine()}
        onUpdateRoutine={() => void modals.handleUpdateRoutine()}
        substitutionTarget={modals.substitutionTarget}
        availableExercises={modals.availableExercises}
        catalogLoading={modals.catalogLoading}
        substitutionExerciseId={modals.substitutionExerciseId}
        substitutionReason={modals.substitutionReason}
        substitutingExercise={modals.substitutingExercise}
        onSubstitutionExerciseIdChange={modals.setSubstitutionExerciseId}
        onSubstitutionReasonChange={modals.setSubstitutionReason}
        onCloseSubstitution={modals.onCloseSubstitution}
        onConfirmSubstitution={() => void modals.handleSubstitution()}
        isAddingExercise={modals.isAddingExercise}
        newExercise={modals.newExercise}
        setNewExercise={modals.setNewExercise}
        addExerciseError={modals.addExerciseError}
        onCloseAddExercise={modals.onCloseAddExercise}
        onAddExercise={() => void modals.handleAddExercise()}
        isEditingExercise={modals.isEditingExercise}
        editingExercise={modals.editingExercise}
        setEditingExercise={modals.setEditingExercise}
        loadSuggestion={modals.loadSuggestion}
        loadingLoadSuggestion={modals.loadingLoadSuggestion}
        editExerciseError={modals.editExerciseError}
        onCloseEditExercise={modals.onCloseEditExercise}
        onApplyLastSessionLoad={modals.applyLastSessionLoad}
        onUpdateExercise={() => void modals.handleUpdateExercise()}
        isAssigning={modals.isAssigning}
        assignForm={modals.assignForm}
        setAssignForm={modals.setAssignForm}
        availableRoutines={modals.availableRoutines}
        onCloseAssign={modals.onCloseAssign}
        onAssignRoutine={() => void modals.handleAssignRoutine()}
        unassignTarget={modals.unassignTarget}
        onCloseUnassign={modals.onCloseUnassign}
        onConfirmUnassign={(routineId) => void modals.handleUnassignRoutine(routineId)}
        deleteExerciseTarget={modals.deleteExerciseTarget}
        onCloseDeleteExercise={modals.onCloseDeleteExercise}
        onConfirmDeleteExercise={() => void modals.confirmDeleteExercise()}
      />

      <Suspense fallback={<PanelFallback />}>
        {page.coachingTab === 'progreso' && id ? (
          <div className="space-y-3">
            <MemberProgressPanel memberId={parseInt(id, 10)} />
            <MemberMeasurementsPanel
              measurements={page.measurements}
              canEdit={page.user?.role === 'admin' || page.user?.role === 'trainer'}
              isAdding={page.isAddingMeasurement}
              form={page.measurementForm}
              onAddingChange={page.setIsAddingMeasurement}
              onFormChange={page.setMeasurementForm}
              onSubmit={page.handleAddMeasurement}
            />
          </div>
        ) : null}

        {page.coachingTab === 'notas' && id ? (
          <MemberCoachNotesPanel memberId={parseInt(id, 10)} />
        ) : null}

        {page.coachingTab === 'coaching' && id ? (
          <MemberCoachingPanel memberId={parseInt(id, 10)} />
        ) : null}

        {page.coachingTab === 'bloques' && id ? (
          <MemberTrainingBlocksPanel memberId={parseInt(id, 10)} />
        ) : null}

        {page.coachingTab === 'agenda' && id ? (
          <MemberAppointmentsPanel memberId={parseInt(id, 10)} />
        ) : null}
      </Suspense>

      {page.coachingTab === 'rutinas' && (
        <MemberRoutinesList
          member={member}
          routines={page.routines}
          expandedRoutineId={page.expandedRoutineId}
          routineMenuId={page.routineMenuId}
          routineMenuAnchorRef={page.routineMenuAnchorRef}
          onToggleExpand={(routineId) => void page.toggleExpandRoutine(routineId)}
          onRoutineMenuChange={page.setRoutineMenuId}
          onCreateRoutine={page.openCreateRoutine}
          onAssignRoutine={page.openAssignModal}
          onAddExercise={page.openAddExercise}
          onInlineUpdate={(routineId, exercise, field, value) =>
            void page.handleInlineUpdate(routineId, exercise, field, value)
          }
          onEditExercise={(routineId, exercise) => void page.openEditExercise(routineId, exercise)}
          onSubstituteExercise={page.openSubstitution}
          onDeleteExercise={(routineId, exercise) =>
            page.setDeleteExerciseTarget({ routineId, exercise })
          }
          onReorderExercise={(routineId, fromIndex, direction) =>
            void page.handleReorderExercise(routineId, fromIndex, direction)
          }
          onEditRoutine={page.openEditModal}
          onCloneRoutine={(routine) => void page.handleCloneRoutine(routine)}
          onUnassignRoutine={page.setUnassignTarget}
          onNavigateHistory={(routineId) =>
            void page.navigate(`/members/${id}/history?routine=${routineId}`)
          }
        />
      )}
    </div>
  );
}
