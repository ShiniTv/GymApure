import { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useSearchParams } from 'react-router';
import { MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import {
  useChatMessagesQuery,
  useMarkChatRead,
  useMemberChatQuery,
  useOpenMemberChannel,
  type ChatConversationListItem,
  type ChatStaffChannel,
} from '../../hooks/queries/useChatQuery';
import { CHAT_CHANNEL_LABELS, isChatStaffChannel } from '../../lib/chat/types';
import {
  Button,
  EmptyState,
  PageHeader,
  BackToDashboardLink,
  ListRowSkeleton,
  ChatBubbleSkeleton,
  Skeleton,
} from '../../components/ui';
import { usePageTitle } from '../../hooks/usePageTitle';
import { toDisplayErrorMessage } from '../../lib/api';
import { useToastOptional } from '../../context/ToastContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ChatComposer } from './ChatComposer';
import { ChatBubble, DaySeparator } from './ChatBubble';
import { formatListTime, sameCalendarDay } from './chatFormat';

const MEMBER_CHANNEL_ORDER: ChatStaffChannel[] = ['receptionist', 'admin', 'trainer'];

const MEMBER_CHANNEL_META: Record<
  ChatStaffChannel,
  { description: string; composer: string; emptyTitle: string; emptyDescription: string }
> = {
  receptionist: {
    description: 'Pagos, membresía y mostrador',
    composer: 'Escribe a recepción…',
    emptyTitle: 'Chat con recepción',
    emptyDescription: 'Avisos de pagos y membresía. Escribe aquí para el mostrador.',
  },
  admin: {
    description: 'Consultas con administración',
    composer: 'Escribe a administración…',
    emptyTitle: 'Chat con administración',
    emptyDescription: 'Mensajes directos con el equipo administrativo del gym.',
  },
  trainer: {
    description: 'Rutinas y coaching',
    composer: 'Escribe a tu entrenador…',
    emptyTitle: 'Chat con tu entrenador',
    emptyDescription: 'Aquí verás avisos de rutinas y podrás escribirle a tu entrenador.',
  },
};

function MemberChannelButton({
  channel,
  item,
  selected,
  onSelect,
}: {
  channel: ChatStaffChannel;
  item: ChatConversationListItem | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = MEMBER_CHANNEL_META[channel];
  const unread = item?.unread_count ?? 0;
  const listTime = item?.last_message_at ? formatListTime(item.last_message_at) : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors',
        selected
          ? 'border-brand/40 bg-brand/5'
          : 'hover:border-brand/30 hover:bg-brand/5 border-border bg-surface'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-text truncate text-sm font-semibold">{CHAT_CHANNEL_LABELS[channel]}</p>
          {listTime ? (
            <span className="text-text-muted text-small shrink-0 tabular-nums">{listTime}</span>
          ) : null}
        </div>
        <p className="text-text-muted mt-0.5 truncate text-xs">
          {item?.last_message_preview?.trim() || meta.description}
        </p>
      </div>
      {unread > 0 ? (
        <span className="nav-badge brand-solid shrink-0">{unread > 99 ? '99+' : unread}</span>
      ) : null}
    </button>
  );
}

export function MemberChatView() {
  usePageTitle('Mensajes');
  const toast = useToastOptional();
  const { isDesktop } = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const channelParam = searchParams.get('channel');
  const selectedChannel = channelParam && isChatStaffChannel(channelParam) ? channelParam : null;

  const {
    data: conversations = [],
    isPending,
    isError,
    isFetching,
    error,
    refetch,
  } = useMemberChatQuery(true);
  const openChannel = useOpenMemberChannel();
  const markRead = useMarkChatRead();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [activeConversation, setActiveConversation] = useState<ChatConversationListItem | null>(
    null
  );
  const [openingChannel, setOpeningChannel] = useState(false);
  const openingForRef = useRef<ChatStaffChannel | null>(null);

  const conversationByChannel = useMemo(() => {
    const map = new Map<ChatStaffChannel, ChatConversationListItem>();
    for (const item of conversations) {
      if (isChatStaffChannel(item.channel)) map.set(item.channel, item);
    }
    return map;
  }, [conversations]);

  useEffect(() => {
    if (!selectedChannel) {
      openingForRef.current = null;
      setActiveConversation(null);
      setOpeningChannel(false);
      return;
    }

    const existing = conversationByChannel.get(selectedChannel);
    if (existing) {
      setActiveConversation(existing);
      openingForRef.current = selectedChannel;
      setOpeningChannel(false);
      return;
    }

    if (openingForRef.current === selectedChannel) return;
    openingForRef.current = selectedChannel;

    let cancelled = false;
    setOpeningChannel(true);
    void openChannel
      .mutateAsync(selectedChannel)
      .then((created) => {
        if (!cancelled) setActiveConversation(created);
      })
      .catch((err) => {
        if (!cancelled) {
          openingForRef.current = null;
          toast?.error(toDisplayErrorMessage(err, 'No se pudo abrir el chat'));
          setSearchParams({}, { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) setOpeningChannel(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedChannel, conversationByChannel, openChannel, toast, setSearchParams]);

  const { data: messagesData, isPending: loadingMessages } = useChatMessagesQuery(
    activeConversation?.id ?? null,
    activeConversation?.id != null
  );

  useEffect(() => {
    if (activeConversation?.id != null) {
      markRead.mutate(activeConversation.id);
    }
  }, [activeConversation?.id, messagesData?.messages.length]);

  const openChannelView = (channel: ChatStaffChannel) => {
    setSearchParams({ channel }, { replace: false });
  };

  const backToChannels = () => {
    setSearchParams({}, { replace: false });
    setActiveConversation(null);
  };

  const channelList = (
    <div className="flex flex-col gap-2">
      <div className="border-border bg-surface-raised/60 rounded-xl border px-3.5 py-3">
        <p className="text-text text-sm font-semibold">Tres canales, un solo chat</p>
        <p className="text-text-secondary text-small mt-1 leading-relaxed">
          <strong>Recepción</strong> · pagos y membresía · <strong>Admin</strong> · consultas del
          gym · <strong>Entrenador</strong> · rutinas y coaching. Cada hilo es independiente.
        </p>
      </div>
      {MEMBER_CHANNEL_ORDER.map((channel) => (
        <MemberChannelButton
          key={channel}
          channel={channel}
          item={conversationByChannel.get(channel)}
          selected={selectedChannel === channel}
          onSelect={() => openChannelView(channel)}
        />
      ))}
    </div>
  );

  const renderThreadBody = (channel: ChatStaffChannel) => {
    const meta = MEMBER_CHANNEL_META[channel];
    const conversation = activeConversation;
    const messages = messagesData?.messages ?? [];
    const messageCount = messages.length;
    const loadingThread = openingChannel || (conversation == null && openChannel.isPending);

    if (loadingThread || (loadingMessages && !messagesData)) {
      return <ChatBubbleSkeleton />;
    }
    if (conversation == null) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8">
          <EmptyState
            icon={MessageSquare}
            title="No se pudo abrir el chat"
            description="Vuelve a la lista de canales e inténtalo de nuevo."
            action={
              <Button size="sm" variant="secondary" onClick={backToChannels}>
                Volver
              </Button>
            }
          />
        </div>
      );
    }
    if (messages.length === 0) {
      return (
        <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 py-8">
          <EmptyState
            variant="motivational"
            icon={MessageSquare}
            title={meta.emptyTitle}
            description={meta.emptyDescription}
            framed={false}
          />
        </div>
      );
    }
    return (
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={messages}
        alignToBottom
        initialTopMostItemIndex={Math.max(0, messageCount - 1)}
        itemContent={(index, message) => {
          const prev = messages[index - 1];
          const showDay = !prev || !sameCalendarDay(prev.created_at, message.created_at);
          return (
            <div className="px-3 pt-1.5 sm:px-3.5">
              {showDay ? <DaySeparator iso={message.created_at} /> : null}
              <ChatBubble message={message} conversationId={conversation.id} />
            </div>
          );
        }}
        followOutput="smooth"
        className="h-full"
      />
    );
  };

  if (isPending) {
    return (
      <div className="page-stack-tight" aria-busy="true" aria-label="Cargando mensajes">
        <Skeleton className="mx-4 h-8 w-48" />
        <ListRowSkeleton rows={3} />
      </div>
    );
  }

  if (isError) {
    const detail = toDisplayErrorMessage(error, '');
    return (
      <div className="page-stack-tight">
        <PageHeader
          compact
          title={
            <>
              Mensajes <span className="text-brand">con el gym</span>
            </>
          }
          subtitle="Elige con quién quieres hablar"
          action={<BackToDashboardLink />}
        />
        <EmptyState
          icon={MessageSquare}
          title="No se pudieron cargar los mensajes"
          description={
            detail && detail !== 'Error inesperado'
              ? detail
              : 'Revisa tu conexión e inténtalo de nuevo.'
          }
          action={
            <Button
              size="sm"
              variant="primary"
              className="min-h-[var(--touch-min)]"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  const meta = selectedChannel ? MEMBER_CHANNEL_META[selectedChannel] : null;
  const messages = messagesData?.messages ?? [];
  const messageCount = messages.length;
  const loadingThread =
    selectedChannel != null &&
    (openingChannel || (activeConversation == null && openChannel.isPending));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:gap-3">
      <PageHeader
        compact
        title={
          selectedChannel ? (
            <>
              Chat con <span className="text-brand">{CHAT_CHANNEL_LABELS[selectedChannel]}</span>
            </>
          ) : (
            <>
              Mensajes <span className="text-brand">con el gym</span>
            </>
          )
        }
        subtitle={
          selectedChannel
            ? loadingMessages || loadingThread
              ? undefined
              : messageCount > 0
                ? `${messageCount} mensaje${messageCount !== 1 ? 's' : ''}`
                : meta?.description
            : 'Elige el chat: recepción, administración o entrenador'
        }
        action={
          <div className="flex items-center gap-2">
            {selectedChannel ? (
              <Button
                size="sm"
                variant="secondary"
                className={isDesktop ? 'hidden' : undefined}
                onClick={backToChannels}
              >
                Canales
              </Button>
            ) : null}
            <BackToDashboardLink />
          </div>
        }
      />

      {/* Móvil / tablet: un panel a la vez */}
      {!isDesktop ? (
        <>
          <div className={clsx(selectedChannel && 'hidden')}>{channelList}</div>
          {selectedChannel ? (
            <div className="member-chat-panel flex min-h-0 flex-col overflow-hidden border-0 bg-transparent">
              <div className="flex min-h-0 flex-1 flex-col">
                {renderThreadBody(selectedChannel)}
              </div>
              {activeConversation != null ? (
                <ChatComposer
                  conversationId={activeConversation.id}
                  placeholder={MEMBER_CHANNEL_META[selectedChannel].composer}
                />
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="member-chat-shell grid min-h-0 grid-cols-[minmax(240px,300px)_minmax(0,1fr)] gap-3">
          <div className="border-border/70 bg-surface flex min-h-0 flex-col overflow-hidden rounded-xl border p-2">
            <p className="text-text-muted text-small px-2 py-2 font-semibold tracking-wide uppercase">
              Canales
            </p>
            {channelList}
          </div>
          <div className="member-chat-panel border-border/60 bg-surface flex min-h-0 flex-col overflow-hidden rounded-xl border">
            {selectedChannel ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col">
                  {renderThreadBody(selectedChannel)}
                </div>
                {activeConversation != null ? (
                  <ChatComposer
                    conversationId={activeConversation.id}
                    placeholder={MEMBER_CHANNEL_META[selectedChannel].composer}
                  />
                ) : null}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyState
                  compact
                  icon={MessageSquare}
                  title="Elige un canal"
                  description="Recepción, administración o entrenador — cada uno es un chat aparte."
                  framed={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
