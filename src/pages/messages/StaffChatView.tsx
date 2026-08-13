import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useSearchParams, useNavigate } from 'react-router';
import {
  CreditCard,
  Dumbbell,
  History,
  MessageSquare,
  NotebookPen,
  Search,
  Trophy,
  User,
  UserPlus,
  UtensilsCrossed,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import {
  useChatConversationsQuery,
  useChatMessagesQuery,
  useMarkChatRead,
  useOpenChatWithMember,
  type ChatConversationListItem,
} from '../../hooks/queries/useChatQuery';
import { useMemberOptionsQuery } from '../../hooks/queries/useMemberOptionsQuery';
import { CHAT_CHANNEL_LABELS, isChatStaffChannel } from '../../lib/chat/types';
import { useAdminStatsOptional } from '../../context/AdminStatsContext';
import { getExpiryBadgeInfo } from '../../lib/expiryUtils';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  FilterChips,
  PageHeader,
  PaginationBar,
  SearchInput,
  Spinner,
  BackToDashboardLink,
  ListRowSkeleton,
  ChatBubbleSkeleton,
} from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { toDisplayErrorMessage } from '../../lib/api';
import { useToastOptional } from '../../context/ToastContext';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { ChatComposer } from './ChatComposer';
import { ChatBubble, DaySeparator } from './ChatBubble';
import { ConversationListItem } from './ConversationListItem';
import { quickRepliesForRole, sameCalendarDay } from './chatFormat';

export function StaffChatView() {
  usePageTitle('Mensajes');
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastOptional();
  const isTrainer = user?.role === 'trainer';
  const isReception = user?.role === 'receptionist';
  const isAdmin = user?.role === 'admin';
  const staffChannelLabel =
    user?.role && isChatStaffChannel(user.role) ? CHAT_CHANNEL_LABELS[user.role] : 'Staff';
  const staffSubtitle = isTrainer
    ? 'Canal entrenador: solo tus clientes asignados'
    : `Canal ${staffChannelLabel.toLowerCase()}: solo este rol ve estos chats`;
  const [searchParams, setSearchParams] = useSearchParams();
  const adminStats = useAdminStatsOptional();
  const alertDays = adminStats?.stats?.expiryAlertDays ?? 7;
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState<'all' | 'unread' | 'expiring'>('all');
  const expiringOnly = listFilter === 'expiring';
  const unreadOnly = listFilter === 'unread';
  const [listPage, setListPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ChatConversationListItem | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const openWithMember = useOpenChatWithMember();
  const markRead = useMarkChatRead();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const memberOptionsEnabled = listFilter === 'all' && debouncedSearch.trim().length >= 2;
  const { data: memberHits = [], isFetching: memberHitsLoading } = useMemberOptionsQuery(
    debouncedSearch.trim(),
    memberOptionsEnabled
  );
  const quickReplies = quickRepliesForRole(user?.role);

  const memberParam = searchParams.get('member');
  const { data: conversationsPage, isPending: loadingList } = useChatConversationsQuery(
    search,
    expiringOnly,
    unreadOnly,
    true,
    listPage,
    50
  );
  const conversations = conversationsPage?.items ?? [];
  const conversationsTotal = conversationsPage?.total ?? 0;
  const conversationsPageSize = conversationsPage?.pageSize ?? 50;
  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(
    selectedId,
    selectedId != null
  );

  const conversationMemberIds = useMemo(
    () => new Set(conversations.map((c) => c.member_id)),
    [conversations]
  );

  const startableMembers = useMemo(
    () => memberHits.filter((m) => !conversationMemberIds.has(m.id)).slice(0, 8),
    [memberHits, conversationMemberIds]
  );

  useEffect(() => {
    setListPage(1);
  }, [search, listFilter]);

  const startChatWithMember = useCallback(
    (memberId: number) => {
      void openWithMember
        .mutateAsync(memberId)
        .then((conversation) => {
          setSelectedId(conversation.id);
          setSelectedSnapshot(conversation);
          setShowChatOnMobile(true);
          setSearch('');
          toast?.success('Chat abierto');
        })
        .catch((err) => {
          toast?.error(toDisplayErrorMessage(err, 'No puedes abrir este chat'));
        });
    },
    [openWithMember, toast]
  );
  useEffect(() => {
    if (!memberParam || openWithMember.isPending) return;
    const memberId = parseInt(memberParam, 10);
    if (!Number.isFinite(memberId)) return;

    void openWithMember
      .mutateAsync(memberId)
      .then((conversation) => {
        setSelectedId(conversation.id);
        setSelectedSnapshot(conversation);
        setShowChatOnMobile(true);
        setSearchParams({}, { replace: true });
      })
      .catch((err) => {
        toast?.error(toDisplayErrorMessage(err, 'No puedes abrir este chat'));
        setSearchParams({}, { replace: true });
      });
  }, [memberParam, openWithMember, setSearchParams, toast]);

  useEffect(() => {
    if (selectedId == null && conversations.length > 0 && !memberParam) {
      setSelectedId(conversations[0].id);
      setSelectedSnapshot(conversations[0]);
    }
  }, [conversations, selectedId, memberParam]);

  useEffect(() => {
    if (selectedId == null) return;
    const fromList = conversations.find((c) => c.id === selectedId);
    if (fromList) setSelectedSnapshot(fromList);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (selectedId != null) {
      markRead.mutate(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    setThreadSearch('');
    setThreadSearchOpen(false);
  }, [selectedId]);

  const selected =
    conversations.find((c) => c.id === selectedId) ??
    (selectedSnapshot?.id === selectedId ? selectedSnapshot : null);

  const staffMessages = messagesData?.messages ?? [];
  const threadQuery = threadSearch.trim().toLowerCase();
  const visibleStaffMessages = useMemo(() => {
    if (!threadQuery) return staffMessages;
    return staffMessages.filter((m) => m.body.toLowerCase().includes(threadQuery));
  }, [staffMessages, threadQuery]);

  const selectedExpiry = selected ? getExpiryBadgeInfo(selected.days_remaining, alertDays) : null;

  const handleSelectConversation = (id: number) => {
    const item = conversations.find((c) => c.id === id) ?? null;
    setSelectedId(id);
    if (item) setSelectedSnapshot(item);
    setShowChatOnMobile(true);
  };

  const handleBackToList = () => {
    setShowChatOnMobile(false);
  };

  const renderConversationListBody = () => {
    if (loadingList) {
      return <ListRowSkeleton rows={6} />;
    }
    if (conversations.length === 0 && startableMembers.length === 0 && !memberHitsLoading) {
      return (
        <EmptyState
          compact
          icon={MessageSquare}
          title={search.trim() || listFilter !== 'all' ? 'Sin resultados' : 'Sin conversaciones'}
          description={
            search.trim()
              ? 'No hay chats ni miembros que coincidan. Prueba otro nombre o cédula.'
              : listFilter === 'unread'
                ? 'No hay mensajes sin leer en este canal.'
                : listFilter === 'expiring'
                  ? `Nadie por vencer en los próximos ${alertDays} días.`
                  : isTrainer
                    ? 'Aparecen cuando un cliente tuyo escribe o cuando abres el chat desde aquí buscando su nombre.'
                    : 'Busca un miembro arriba para iniciar un chat, o espera avisos automáticos.'
          }
          action={
            isTrainer && !search.trim() && listFilter === 'all' ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/routines?view=calendar&assign=1')}
              >
                Asignar rutina
              </Button>
            ) : undefined
          }
        />
      );
    }

    return (
      <>
        {startableMembers.length > 0 && (
          <div className="border-border mb-2 space-y-1 border-b pb-2">
            <p className="text-small text-text-muted px-1 font-semibold tracking-wide uppercase">
              Iniciar chat
            </p>
            {startableMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                disabled={openWithMember.isPending}
                onClick={() => startChatWithMember(member.id)}
                className="hover:bg-surface-raised flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors"
              >
                <UserPlus className="text-brand h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-sm font-semibold">{member.full_name}</p>
                  {member.cedula ? (
                    <p className="text-text-muted text-small truncate">{member.cedula}</p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
        {memberHitsLoading && conversations.length === 0 ? (
          <div className="flex justify-center py-4">
            <Spinner size="xs" />
          </div>
        ) : null}
        {conversations.map((item) => (
          <div key={item.id} className="pb-1">
            <ConversationListItem
              item={item}
              selected={item.id === selectedId}
              alertDays={alertDays}
              onSelect={() => {
                handleSelectConversation(item.id);
              }}
            />
          </div>
        ))}
        {conversationsTotal > conversationsPageSize ? (
          <div className="border-border border-t pt-2">
            <PaginationBar
              page={listPage}
              pageSize={conversationsPageSize}
              total={conversationsTotal}
              onPageChange={setListPage}
            />
          </div>
        ) : null}
      </>
    );
  };

  const listToolbar = (
    <div className="space-y-2">
      {isTrainer ? (
        <p className="bg-surface-raised text-text-muted text-small rounded-lg px-2.5 py-1.5 leading-snug font-medium">
          <span className="sm:hidden">Solo tus clientes con rutina</span>
          <span className="hidden sm:inline">Solo clientes con rutina asignada por ti</span>
        </p>
      ) : null}
      <SearchInput
        containerClassName="min-w-0 w-full"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder={isTrainer ? 'Buscar cliente…' : 'Buscar miembro…'}
      />
      <FilterChips
        className="w-fit max-w-full"
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'unread', label: 'No leídos' },
          { value: 'expiring', label: `Por vencer (${alertDays}d)` },
        ]}
        value={listFilter}
        onChange={(v) => setListFilter((v as 'all' | 'unread' | 'expiring') || 'all')}
      />
    </div>
  );

  const contextRail =
    selected && selected.member_id > 0 ? (
      <div className="border-border/70 bg-surface hidden min-h-0 flex-col overflow-hidden rounded-xl border lg:flex">
        <div className="border-border/80 shrink-0 border-b px-3 py-3">
          <p className="text-small text-text-muted font-semibold tracking-wide uppercase">
            Contexto
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar src={selected.member_avatar} name={selected.member_name} size="lg" />
            <div className="min-w-0">
              <p className="text-text truncate text-sm font-semibold">{selected.member_name}</p>
              {selected.member_cedula ? (
                <p className="text-text-muted text-small">{selected.member_cedula}</p>
              ) : null}
            </div>
          </div>
          <div className="bg-surface-raised space-y-2 rounded-xl p-3">
            <p className="text-small text-text-muted font-semibold tracking-wide uppercase">
              Membresía
            </p>
            <p className="text-text text-sm font-medium">
              {selected.membership_name ?? 'Sin plan activo'}
            </p>
            {selectedExpiry ? (
              <Badge className={selectedExpiry.className}>{selectedExpiry.label}</Badge>
            ) : selected.days_remaining != null ? (
              <p className="text-text-muted text-xs">{selected.days_remaining} días restantes</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <p className="text-small text-text-muted px-0.5 font-semibold tracking-wide uppercase">
              Atajos
            </p>
            {(isAdmin || isReception) && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() =>
                  navigate(
                    `/members?q=${encodeURIComponent(selected.member_cedula || selected.member_name)}`
                  )
                }
              >
                <User className="h-3.5 w-3.5" />
                Ver en miembros
              </Button>
            )}
            {(isAdmin || isReception) && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/payments?status=pending')}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Ir a pagos
              </Button>
            )}
            {isTrainer && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate(`/members/${selected.member_id}/routines`)}
                >
                  <Dumbbell className="h-3.5 w-3.5" />
                  Ver rutinas
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() =>
                    navigate(`/routines?view=calendar&assign=1&member=${selected.member_id}`)
                  }
                >
                  <Dumbbell className="h-3.5 w-3.5" />
                  Asignar rutina
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate(`/members/${selected.member_id}/nutrition`)}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Nutrición
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate(`/members/${selected.member_id}/history`)}
                >
                  <History className="h-3.5 w-3.5" />
                  Historial
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate(`/members/${selected.member_id}/routines?tab=progreso`)}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Progreso
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full justify-start gap-2"
                  onClick={() => navigate(`/members/${selected.member_id}/routines?tab=notas`)}
                >
                  <NotebookPen className="h-3.5 w-3.5" />
                  Notas coach
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/members/${selected.member_id}/history`)}
              >
                <History className="h-3.5 w-3.5" />
                Historial
              </Button>
            )}
          </div>
        </div>
      </div>
    ) : (
      <div className="border-border hidden min-h-0 flex-col items-center justify-center rounded-xl border border-dashed p-4 lg:flex">
        <EmptyState
          compact
          icon={User}
          title="Sin contexto"
          description="Selecciona un chat para ver membresía y atajos."
          framed={false}
        />
      </div>
    );

  const chatThread = selected ? (
    <>
      <div className="border-border/80 flex shrink-0 flex-col gap-2 border-b px-2 py-2 sm:px-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackToList}
            className="text-text-muted hover:bg-surface-overlay inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
            aria-label="Volver a conversaciones"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <Avatar
            src={selected.member_avatar}
            name={selected.member_name}
            size="sm"
            className="!h-8 !w-8 shrink-0 !text-[10px] !ring-1"
          />
          <div className="min-w-0 flex-1">
            <p className="text-text truncate text-sm font-semibold">{selected.member_name}</p>
            <p className="text-text-muted text-small hidden truncate sm:block">
              {[selected.member_cedula, selected.membership_name].filter(Boolean).join(' · ') ||
                'Miembro'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setThreadSearchOpen((open) => !open)}
            className={clsx(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
              threadSearchOpen
                ? 'bg-brand/10 text-brand'
                : 'text-text-muted hover:bg-surface-overlay'
            )}
            aria-label="Buscar en la conversación"
            aria-pressed={threadSearchOpen}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        {threadSearchOpen ? (
          <SearchInput
            containerClassName="w-full"
            value={threadSearch}
            onChange={(e) => setThreadSearch(e.target.value)}
            placeholder="Buscar en este chat…"
            autoFocus
          />
        ) : null}
        {threadQuery && (
          <p className="text-text-muted text-small">
            {visibleStaffMessages.length === 0
              ? 'Sin coincidencias'
              : `${visibleStaffMessages.length} mensaje${visibleStaffMessages.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        {loadingMessages && !messagesData ? (
          <ChatBubbleSkeleton />
        ) : staffMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              compact
              variant="motivational"
              icon={MessageSquare}
              title={`Escribe a ${selected.member_name.split(' ')[0] || 'este miembro'}`}
              description="Aún no hay mensajes en este chat. Envía el primero o usa una respuesta rápida."
              framed={false}
            />
          </div>
        ) : visibleStaffMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <EmptyState
              compact
              icon={Search}
              title="Sin coincidencias"
              description="Prueba otra palabra o limpia la búsqueda."
              framed={false}
            />
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%', width: '100%' }}
            className="absolute inset-0"
            data={visibleStaffMessages}
            itemContent={(index, message) => {
              const prev = visibleStaffMessages[index - 1];
              const showDay = !prev || !sameCalendarDay(prev.created_at, message.created_at);
              return (
                <div className="px-2.5 pt-1 sm:px-3">
                  {showDay ? <DaySeparator iso={message.created_at} /> : null}
                  <ChatBubble message={message} conversationId={selected.id} />
                </div>
              );
            }}
            followOutput={threadQuery ? false : 'smooth'}
          />
        )}
      </div>
      <ChatComposer conversationId={selected.id} quickReplies={quickReplies} />
    </>
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <EmptyState
        compact
        icon={MessageSquare}
        title="Selecciona una conversación"
        description="Elige un miembro de la lista para chatear."
        framed={false}
      />
    </div>
  );

  const threadOpenOnMobile = showChatOnMobile && selected != null;

  return (
    <div className="page-stack-tight mx-auto w-full max-w-[90rem]">
      <div className={clsx('space-y-3 md:hidden', threadOpenOnMobile && 'hidden')}>
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">del gym</span>
            </>
          }
          subtitle={staffSubtitle}
          action={<BackToDashboardLink />}
        />
        {listToolbar}
        <div className="space-y-0.5 pb-2">{renderConversationListBody()}</div>
      </div>

      {threadOpenOnMobile ? (
        <div className="staff-chat-mobile-thread flex flex-col overflow-hidden md:hidden">
          {chatThread}
        </div>
      ) : null}

      <div className="hidden md:block">
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">del gym</span>
            </>
          }
          subtitle={staffSubtitle}
          action={<BackToDashboardLink />}
        />
        <div className="staff-chat-shell mt-0 grid min-h-0 grid-cols-[minmax(240px,300px)_minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(200px,240px)] xl:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(220px,260px)]">
          <div className="border-border/70 bg-surface flex min-h-0 flex-col overflow-hidden rounded-xl border">
            <div className="border-border/80 shrink-0 space-y-2 border-b p-3">{listToolbar}</div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {renderConversationListBody()}
            </div>
          </div>
          <div className="border-border/70 bg-surface flex min-h-0 flex-col overflow-hidden rounded-xl border">
            {chatThread}
          </div>
          {contextRail}
        </div>
      </div>
    </div>
  );
}
