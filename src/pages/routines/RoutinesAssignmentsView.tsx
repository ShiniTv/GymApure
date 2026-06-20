import React from 'react';
import { Users, Calendar, Clock } from 'lucide-react';
import { Button, Spinner, EmptyState } from '../../components/ui';
import { formatDifficulty } from '../../lib/utils';
import type { RoutineAssignmentMember, RoutinesView } from './types';

export interface RoutinesAssignmentsViewProps {
  loadingAssignments: boolean;
  assignments: RoutineAssignmentMember[];
  onChangeView: (view: RoutinesView) => void;
  onNavigateToMemberRoutines: (memberId: number) => void;
}

export function RoutinesAssignmentsView({
  loadingAssignments,
  assignments,
  onChangeView,
  onNavigateToMemberRoutines,
}: RoutinesAssignmentsViewProps) {
  if (loadingAssignments) {
    return (
      <div className="space-y-8">
        <div className="py-20 flex flex-col items-center justify-center">
          <Spinner />
          <p className="mt-4 text-zinc-500 text-sm">Cargando asignaciones...</p>
        </div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={Users}
          title="Sin asignaciones activas"
          description="Asigna rutinas a tus miembros desde el calendario o desde su perfil."
          action={
            <Button variant="secondary" size="sm" onClick={() => onChangeView('calendar')}>
              Ir al calendario
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {assignments.map((member) => (member.routines && member.routines.length > 0) && (
        <div
          key={member.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all"
        >
          <div className="flex items-center gap-4 mb-6">
            {member.profile_image ? (
              <img src={member.profile_image} alt={member.full_name} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-orange-500/20" />
            ) : (
              <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 font-bold text-xl shadow-sm">
                {member.full_name.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight">{member.full_name}</h3>
              <button
                onClick={() => onNavigateToMemberRoutines(member.id)}
                className="text-xs font-semibold text-orange-600 dark:text-orange-500 hover:underline mt-0.5"
              >
                Ver perfil completo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {member.routines.map((routine) => (
              <div
                key={routine.routine_id}
                className="bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-4 group hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer"
                onClick={() => onNavigateToMemberRoutines(member.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-zinc-900 dark:text-white text-sm group-hover:text-orange-500 transition-colors">{routine.routine_name}</h4>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    routine.difficulty === 'Advanced' ? 'bg-red-500/10 text-red-600' :
                    routine.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {formatDifficulty(routine.difficulty)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-y-1 gap-x-4 text-xs font-medium text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-orange-500" />
                    {routine.exercise_count} ejercicios
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-blue-500" />
                    {routine.start_date ? new Date(routine.start_date).toLocaleDateString() : 'N/A'} - {routine.end_date ? new Date(routine.end_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}
