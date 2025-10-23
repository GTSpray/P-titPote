import {
  type GatewayApplicationCommandPermissionsUpdateDispatchData,
  type GatewayAutoModerationActionExecutionDispatchData,
  type GatewayAutoModerationRuleCreateDispatchData,
  type GatewayAutoModerationRuleDeleteDispatchData,
  type GatewayAutoModerationRuleUpdateDispatchData,
  type GatewayChannelCreateDispatchData,
  type GatewayChannelDeleteDispatchData,
  type GatewayChannelPinsUpdateDispatchData,
  type GatewayChannelUpdateDispatchData,
  type GatewayDispatchEvents,
  type GatewayEntitlementCreateDispatchData,
  type GatewayEntitlementDeleteDispatchData,
  type GatewayEntitlementUpdateDispatchData,
  type GatewayGuildAuditLogEntryCreateDispatchData,
  type GatewayGuildBanAddDispatchData,
  type GatewayGuildBanRemoveDispatchData,
  type GatewayGuildCreateDispatchData,
  type GatewayGuildDeleteDispatchData,
  type GatewayGuildEmojisUpdateDispatchData,
  type GatewayGuildIntegrationsUpdateDispatchData,
  type GatewayGuildMemberAddDispatchData,
  type GatewayGuildMemberRemoveDispatchData,
  type GatewayGuildMembersChunkDispatchData,
  type GatewayGuildMemberUpdateDispatchData,
  type GatewayGuildRoleCreateDispatchData,
  type GatewayGuildRoleDeleteDispatchData,
  type GatewayGuildRoleUpdateDispatchData,
  type GatewayGuildScheduledEventCreateDispatchData,
  type GatewayGuildScheduledEventDeleteDispatchData,
  type GatewayGuildScheduledEventUpdateDispatchData,
  type GatewayGuildScheduledEventUserAddDispatchData,
  type GatewayGuildScheduledEventUserRemoveDispatchData,
  type GatewayGuildSoundboardSoundCreateDispatchData,
  type GatewayGuildSoundboardSoundDeleteDispatchData,
  type GatewayGuildSoundboardSoundsUpdateDispatchData,
  type GatewayGuildSoundboardSoundUpdateDispatchData,
  type GatewayGuildStickersUpdateDispatchData,
  type GatewayGuildUpdateDispatchData,
  type GatewayIntegrationCreateDispatchData,
  type GatewayIntegrationDeleteDispatchData,
  type GatewayIntegrationUpdateDispatchData,
  type GatewayInteractionCreateDispatchData,
  type GatewayInviteCreateDispatchData,
  type GatewayInviteDeleteDispatchData,
  type GatewayMessageCreateDispatchData,
  type GatewayMessageDeleteBulkDispatchData,
  type GatewayMessageDeleteDispatchData,
  type GatewayMessageReactionAddDispatchData,
  type GatewayMessageReactionRemoveAllDispatchData,
  type GatewayMessageReactionRemoveDispatchData,
  type GatewayMessageReactionRemoveEmojiDispatchData,
  type GatewayMessageUpdateDispatchData,
  type GatewayPresenceUpdateDispatchData,
  type GatewayRateLimitedDispatchData,
  type GatewayReadyDispatchData,
  type GatewaySoundboardSoundsDispatchData,
  type GatewayStageInstanceCreateDispatchData,
  type GatewayStageInstanceDeleteDispatchData,
  type GatewayStageInstanceUpdateDispatchData,
  type GatewaySubscriptionCreateDispatchData,
  type GatewaySubscriptionDeleteDispatchData,
  type GatewaySubscriptionUpdateDispatchData,
  type GatewayThreadCreateDispatchData,
  type GatewayThreadDeleteDispatchData,
  type GatewayThreadListSyncDispatchData,
  type GatewayThreadMembersUpdateDispatchData,
  type GatewayThreadMemberUpdateDispatchData,
  type GatewayThreadUpdateDispatchData,
  type GatewayTypingStartDispatchData,
  type GatewayUserUpdateDispatchData,
  type GatewayVoiceChannelEffectSendDispatchData,
  type GatewayVoiceServerUpdateDispatchData,
  type GatewayVoiceStateUpdateDispatchData,
  type GatewayWebhooksUpdateDispatchData,
} from "discord.js";

export enum GWSEvent {
  Debug = "DEBUG",
  Payload = "PAYLOAD",
}

// https://www.rfc-editor.org/rfc/rfc6455
export enum WsClosedCode {
  NormalClosure = 1000, // indicates a normal closure, meaning that the purpose for which the connection was established has been fulfilled.
  GoingAway = 1001, // indicates that an endpoint is "going away", such as a server going down or a browser having navigated away from a page.
  ProtocolError = 1002, // indicates that an endpoint is terminating the connection due to a protocol error.
  UnsupportedData = 1003, // indicates that an endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).
  NoStatusReceived = 1005, // It is designated for use in applications expecting a status code to indicate that no status code was actually present.
  AbnormalClosure = 1006, // It is designated for use in applications expecting a status code to indicate that the connection was closed abnormally, e.g., without sending or receiving a Close control frame.
}

export type GatewayEvent = {
  [GWSEvent.Debug]: [shard: number, debugmsg: string, meta?: any];
  [GWSEvent.Payload]: [
    shard: number,
    payload: { s: number; op: number; t: string; d: any },
  ];
  [GatewayDispatchEvents.ApplicationCommandPermissionsUpdate]: [
    {
      shard: number;
      event: GatewayApplicationCommandPermissionsUpdateDispatchData;
    },
  ];
  [GatewayDispatchEvents.AutoModerationActionExecution]: [
    {
      shard: number;
      event: GatewayAutoModerationActionExecutionDispatchData;
    },
  ];
  [GatewayDispatchEvents.AutoModerationRuleCreate]: [
    { shard: number; event: GatewayAutoModerationRuleCreateDispatchData },
  ];
  [GatewayDispatchEvents.AutoModerationRuleDelete]: [
    { shard: number; event: GatewayAutoModerationRuleDeleteDispatchData },
  ];
  [GatewayDispatchEvents.AutoModerationRuleUpdate]: [
    { shard: number; event: GatewayAutoModerationRuleUpdateDispatchData },
  ];
  [GatewayDispatchEvents.ChannelCreate]: [
    { shard: number; event: GatewayChannelCreateDispatchData },
  ];
  [GatewayDispatchEvents.ChannelDelete]: [
    { shard: number; event: GatewayChannelDeleteDispatchData },
  ];
  [GatewayDispatchEvents.ChannelPinsUpdate]: [
    { shard: number; event: GatewayChannelPinsUpdateDispatchData },
  ];
  [GatewayDispatchEvents.ChannelUpdate]: [
    { shard: number; event: GatewayChannelUpdateDispatchData },
  ];
  [GatewayDispatchEvents.EntitlementCreate]: [
    { shard: number; event: GatewayEntitlementCreateDispatchData },
  ];
  [GatewayDispatchEvents.EntitlementDelete]: [
    { shard: number; event: GatewayEntitlementDeleteDispatchData },
  ];
  [GatewayDispatchEvents.EntitlementUpdate]: [
    { shard: number; event: GatewayEntitlementUpdateDispatchData },
  ];
  [GatewayDispatchEvents.GuildAuditLogEntryCreate]: [
    { shard: number; event: GatewayGuildAuditLogEntryCreateDispatchData },
  ];
  [GatewayDispatchEvents.GuildBanAdd]: [
    { shard: number; event: GatewayGuildBanAddDispatchData },
  ];
  [GatewayDispatchEvents.GuildBanRemove]: [
    { shard: number; event: GatewayGuildBanRemoveDispatchData },
  ];
  [GatewayDispatchEvents.GuildCreate]: [
    { shard: number; event: GatewayGuildCreateDispatchData },
  ];
  [GatewayDispatchEvents.GuildDelete]: [
    { shard: number; event: GatewayGuildDeleteDispatchData },
  ];
  [GatewayDispatchEvents.GuildEmojisUpdate]: [
    { shard: number; event: GatewayGuildEmojisUpdateDispatchData },
  ];
  [GatewayDispatchEvents.GuildIntegrationsUpdate]: [
    { shard: number; event: GatewayGuildIntegrationsUpdateDispatchData },
  ];
  [GatewayDispatchEvents.GuildMemberAdd]: [
    { shard: number; event: GatewayGuildMemberAddDispatchData },
  ];
  [GatewayDispatchEvents.GuildMemberRemove]: [
    { shard: number; event: GatewayGuildMemberRemoveDispatchData },
  ];
  [GatewayDispatchEvents.GuildMembersChunk]: [
    { shard: number; event: GatewayGuildMembersChunkDispatchData },
  ];
  [GatewayDispatchEvents.GuildMemberUpdate]: [
    { shard: number; event: GatewayGuildMemberUpdateDispatchData },
  ];
  [GatewayDispatchEvents.GuildRoleCreate]: [
    { shard: number; event: GatewayGuildRoleCreateDispatchData },
  ];
  [GatewayDispatchEvents.GuildRoleDelete]: [
    { shard: number; event: GatewayGuildRoleDeleteDispatchData },
  ];
  [GatewayDispatchEvents.GuildRoleUpdate]: [
    { shard: number; event: GatewayGuildRoleUpdateDispatchData },
  ];
  [GatewayDispatchEvents.GuildScheduledEventCreate]: [
    {
      shard: number;
      event: GatewayGuildScheduledEventCreateDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildScheduledEventDelete]: [
    {
      shard: number;
      event: GatewayGuildScheduledEventDeleteDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildScheduledEventUpdate]: [
    {
      shard: number;
      event: GatewayGuildScheduledEventUpdateDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildScheduledEventUserAdd]: [
    {
      shard: number;
      event: GatewayGuildScheduledEventUserAddDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildScheduledEventUserRemove]: [
    {
      shard: number;
      event: GatewayGuildScheduledEventUserRemoveDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundCreate]: [
    {
      shard: number;
      event: GatewayGuildSoundboardSoundCreateDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundDelete]: [
    {
      shard: number;
      event: GatewayGuildSoundboardSoundDeleteDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundsUpdate]: [
    {
      shard: number;
      event: GatewayGuildSoundboardSoundsUpdateDispatchData;
    },
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundUpdate]: [
    {
      shard: number;
      event: GatewayGuildSoundboardSoundUpdateDispatchData;
    },
  ];
  [GatewayDispatchEvents.SoundboardSounds]: [
    { shard: number; event: GatewaySoundboardSoundsDispatchData },
  ];
  [GatewayDispatchEvents.GuildStickersUpdate]: [
    { shard: number; event: GatewayGuildStickersUpdateDispatchData },
  ];
  [GatewayDispatchEvents.GuildUpdate]: [
    { shard: number; event: GatewayGuildUpdateDispatchData },
  ];
  [GatewayDispatchEvents.IntegrationCreate]: [
    { shard: number; event: GatewayIntegrationCreateDispatchData },
  ];
  [GatewayDispatchEvents.IntegrationDelete]: [
    { shard: number; event: GatewayIntegrationDeleteDispatchData },
  ];
  [GatewayDispatchEvents.IntegrationUpdate]: [
    { shard: number; event: GatewayIntegrationUpdateDispatchData },
  ];
  [GatewayDispatchEvents.InteractionCreate]: [
    { shard: number; event: GatewayInteractionCreateDispatchData },
  ];
  [GatewayDispatchEvents.InviteCreate]: [
    { shard: number; event: GatewayInviteCreateDispatchData },
  ];
  [GatewayDispatchEvents.InviteDelete]: [
    { shard: number; event: GatewayInviteDeleteDispatchData },
  ];
  [GatewayDispatchEvents.MessageCreate]: [
    { shard: number; event: GatewayMessageCreateDispatchData },
  ];
  [GatewayDispatchEvents.MessageDelete]: [
    { shard: number; event: GatewayMessageDeleteDispatchData },
  ];
  [GatewayDispatchEvents.MessageDeleteBulk]: [
    { shard: number; event: GatewayMessageDeleteBulkDispatchData },
  ];
  [GatewayDispatchEvents.MessagePollVoteAdd]: [
    { shard: number; event: GatewayMessageDeleteDispatchData },
  ];
  [GatewayDispatchEvents.MessagePollVoteRemove]: [
    { shard: number; event: GatewayMessageDeleteDispatchData },
  ];
  [GatewayDispatchEvents.MessageReactionAdd]: [
    { shard: number; event: GatewayMessageReactionAddDispatchData },
  ];
  [GatewayDispatchEvents.MessageReactionRemove]: [
    { shard: number; event: GatewayMessageReactionRemoveDispatchData },
  ];
  [GatewayDispatchEvents.MessageReactionRemoveAll]: [
    { shard: number; event: GatewayMessageReactionRemoveAllDispatchData },
  ];
  [GatewayDispatchEvents.MessageReactionRemoveEmoji]: [
    {
      shard: number;
      event: GatewayMessageReactionRemoveEmojiDispatchData;
    },
  ];
  [GatewayDispatchEvents.MessageUpdate]: [
    { shard: number; event: GatewayMessageUpdateDispatchData },
  ];
  [GatewayDispatchEvents.PresenceUpdate]: [
    { shard: number; event: GatewayPresenceUpdateDispatchData },
  ];
  [GatewayDispatchEvents.RateLimited]: [
    { shard: number; event: GatewayRateLimitedDispatchData },
  ];
  [GatewayDispatchEvents.Ready]: [
    { shard: number; event: GatewayReadyDispatchData },
  ];
  [GatewayDispatchEvents.Resumed]: [
    { shard: number; event: GatewayReadyDispatchData },
  ];
  [GatewayDispatchEvents.StageInstanceCreate]: [
    { shard: number; event: GatewayStageInstanceCreateDispatchData },
  ];
  [GatewayDispatchEvents.StageInstanceDelete]: [
    { shard: number; event: GatewayStageInstanceDeleteDispatchData },
  ];
  [GatewayDispatchEvents.StageInstanceUpdate]: [
    { shard: number; event: GatewayStageInstanceUpdateDispatchData },
  ];
  [GatewayDispatchEvents.SubscriptionCreate]: [
    { shard: number; event: GatewaySubscriptionCreateDispatchData },
  ];
  [GatewayDispatchEvents.SubscriptionDelete]: [
    { shard: number; event: GatewaySubscriptionDeleteDispatchData },
  ];
  [GatewayDispatchEvents.SubscriptionUpdate]: [
    { shard: number; event: GatewaySubscriptionUpdateDispatchData },
  ];
  [GatewayDispatchEvents.ThreadCreate]: [
    { shard: number; event: GatewayThreadCreateDispatchData },
  ];
  [GatewayDispatchEvents.ThreadDelete]: [
    { shard: number; event: GatewayThreadDeleteDispatchData },
  ];
  [GatewayDispatchEvents.ThreadListSync]: [
    { shard: number; event: GatewayThreadListSyncDispatchData },
  ];
  [GatewayDispatchEvents.ThreadMembersUpdate]: [
    { shard: number; event: GatewayThreadMembersUpdateDispatchData },
  ];
  [GatewayDispatchEvents.ThreadMemberUpdate]: [
    { shard: number; event: GatewayThreadMemberUpdateDispatchData },
  ];
  [GatewayDispatchEvents.ThreadUpdate]: [
    { shard: number; event: GatewayThreadUpdateDispatchData },
  ];
  [GatewayDispatchEvents.TypingStart]: [
    { shard: number; event: GatewayTypingStartDispatchData },
  ];
  [GatewayDispatchEvents.UserUpdate]: [
    { shard: number; event: GatewayUserUpdateDispatchData },
  ];
  [GatewayDispatchEvents.VoiceChannelEffectSend]: [
    { shard: number; event: GatewayVoiceChannelEffectSendDispatchData },
  ];
  [GatewayDispatchEvents.VoiceServerUpdate]: [
    { shard: number; event: GatewayVoiceServerUpdateDispatchData },
  ];
  [GatewayDispatchEvents.VoiceStateUpdate]: [
    { shard: number; event: GatewayVoiceStateUpdateDispatchData },
  ];
  [GatewayDispatchEvents.WebhooksUpdate]: [
    { shard: number; event: GatewayWebhooksUpdateDispatchData },
  ];
};
