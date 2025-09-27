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

export type GatewayEvent = {
  [GWSEvent.Debug]: [shard: number, debugmsg: string, meta?: any];
  [GWSEvent.Payload]: [
    shard: number,
    payload: { s: number; op: number; t: string; d: any },
  ];
  [GatewayDispatchEvents.ApplicationCommandPermissionsUpdate]: [
    shard: number,
    GatewayApplicationCommandPermissionsUpdateDispatchData,
  ];
  [GatewayDispatchEvents.AutoModerationActionExecution]: [
    shard: number,
    GatewayAutoModerationActionExecutionDispatchData,
  ];
  [GatewayDispatchEvents.AutoModerationRuleCreate]: [
    shard: number,
    GatewayAutoModerationRuleCreateDispatchData,
  ];
  [GatewayDispatchEvents.AutoModerationRuleDelete]: [
    shard: number,
    GatewayAutoModerationRuleDeleteDispatchData,
  ];
  [GatewayDispatchEvents.AutoModerationRuleUpdate]: [
    shard: number,
    GatewayAutoModerationRuleUpdateDispatchData,
  ];
  [GatewayDispatchEvents.ChannelCreate]: [
    shard: number,
    GatewayChannelCreateDispatchData,
  ];
  [GatewayDispatchEvents.ChannelDelete]: [
    shard: number,
    GatewayChannelDeleteDispatchData,
  ];
  [GatewayDispatchEvents.ChannelPinsUpdate]: [
    shard: number,
    GatewayChannelPinsUpdateDispatchData,
  ];
  [GatewayDispatchEvents.ChannelUpdate]: [
    shard: number,
    GatewayChannelUpdateDispatchData,
  ];
  [GatewayDispatchEvents.EntitlementCreate]: [
    shard: number,
    GatewayEntitlementCreateDispatchData,
  ];
  [GatewayDispatchEvents.EntitlementDelete]: [
    shard: number,
    GatewayEntitlementDeleteDispatchData,
  ];
  [GatewayDispatchEvents.EntitlementUpdate]: [
    shard: number,
    GatewayEntitlementUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildAuditLogEntryCreate]: [
    shard: number,
    GatewayGuildAuditLogEntryCreateDispatchData,
  ];
  [GatewayDispatchEvents.GuildBanAdd]: [
    shard: number,
    GatewayGuildBanAddDispatchData,
  ];
  [GatewayDispatchEvents.GuildBanRemove]: [
    shard: number,
    GatewayGuildBanRemoveDispatchData,
  ];
  [GatewayDispatchEvents.GuildCreate]: [
    shard: number,
    GatewayGuildCreateDispatchData,
  ];
  [GatewayDispatchEvents.GuildDelete]: [
    shard: number,
    GatewayGuildDeleteDispatchData,
  ];
  [GatewayDispatchEvents.GuildEmojisUpdate]: [
    shard: number,
    GatewayGuildEmojisUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildIntegrationsUpdate]: [
    shard: number,
    GatewayGuildIntegrationsUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildMemberAdd]: [
    shard: number,
    GatewayGuildMemberAddDispatchData,
  ];
  [GatewayDispatchEvents.GuildMemberRemove]: [
    shard: number,
    GatewayGuildMemberRemoveDispatchData,
  ];
  [GatewayDispatchEvents.GuildMembersChunk]: [
    shard: number,
    GatewayGuildMembersChunkDispatchData,
  ];
  [GatewayDispatchEvents.GuildMemberUpdate]: [
    shard: number,
    GatewayGuildMemberUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildRoleCreate]: [
    shard: number,
    GatewayGuildRoleCreateDispatchData,
  ];
  [GatewayDispatchEvents.GuildRoleDelete]: [
    shard: number,
    GatewayGuildRoleDeleteDispatchData,
  ];
  [GatewayDispatchEvents.GuildRoleUpdate]: [
    shard: number,
    GatewayGuildRoleUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildScheduledEventCreate]: [
    shard: number,
    GatewayGuildScheduledEventCreateDispatchData,
  ];
  [GatewayDispatchEvents.GuildScheduledEventDelete]: [
    shard: number,
    GatewayGuildScheduledEventDeleteDispatchData,
  ];
  [GatewayDispatchEvents.GuildScheduledEventUpdate]: [
    shard: number,
    GatewayGuildScheduledEventUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildScheduledEventUserAdd]: [
    shard: number,
    GatewayGuildScheduledEventUserAddDispatchData,
  ];
  [GatewayDispatchEvents.GuildScheduledEventUserRemove]: [
    shard: number,
    GatewayGuildScheduledEventUserRemoveDispatchData,
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundCreate]: [
    shard: number,
    GatewayGuildSoundboardSoundCreateDispatchData,
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundDelete]: [
    shard: number,
    GatewayGuildSoundboardSoundDeleteDispatchData,
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundsUpdate]: [
    shard: number,
    GatewayGuildSoundboardSoundsUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildSoundboardSoundUpdate]: [
    shard: number,
    GatewayGuildSoundboardSoundUpdateDispatchData,
  ];
  [GatewayDispatchEvents.SoundboardSounds]: [
    shard: number,
    GatewaySoundboardSoundsDispatchData,
  ];
  [GatewayDispatchEvents.GuildStickersUpdate]: [
    shard: number,
    GatewayGuildStickersUpdateDispatchData,
  ];
  [GatewayDispatchEvents.GuildUpdate]: [
    shard: number,
    GatewayGuildUpdateDispatchData,
  ];
  [GatewayDispatchEvents.IntegrationCreate]: [
    shard: number,
    GatewayIntegrationCreateDispatchData,
  ];
  [GatewayDispatchEvents.IntegrationDelete]: [
    shard: number,
    GatewayIntegrationDeleteDispatchData,
  ];
  [GatewayDispatchEvents.IntegrationUpdate]: [
    shard: number,
    GatewayIntegrationUpdateDispatchData,
  ];
  [GatewayDispatchEvents.InteractionCreate]: [
    shard: number,
    GatewayInteractionCreateDispatchData,
  ];
  [GatewayDispatchEvents.InviteCreate]: [
    shard: number,
    GatewayInviteCreateDispatchData,
  ];
  [GatewayDispatchEvents.InviteDelete]: [
    shard: number,
    GatewayInviteDeleteDispatchData,
  ];
  [GatewayDispatchEvents.MessageCreate]: [
    shard: number,
    GatewayMessageCreateDispatchData,
  ];
  [GatewayDispatchEvents.MessageDelete]: [
    shard: number,
    GatewayMessageDeleteDispatchData,
  ];
  [GatewayDispatchEvents.MessageDeleteBulk]: [
    shard: number,
    GatewayMessageDeleteBulkDispatchData,
  ];
  [GatewayDispatchEvents.MessagePollVoteAdd]: [
    shard: number,
    GatewayMessageDeleteDispatchData,
  ];
  [GatewayDispatchEvents.MessagePollVoteRemove]: [
    shard: number,
    GatewayMessageDeleteDispatchData,
  ];
  [GatewayDispatchEvents.MessageReactionAdd]: [
    shard: number,
    GatewayMessageReactionAddDispatchData,
  ];
  [GatewayDispatchEvents.MessageReactionRemove]: [
    shard: number,
    GatewayMessageReactionRemoveDispatchData,
  ];
  [GatewayDispatchEvents.MessageReactionRemoveAll]: [
    shard: number,
    GatewayMessageReactionRemoveAllDispatchData,
  ];
  [GatewayDispatchEvents.MessageReactionRemoveEmoji]: [
    shard: number,
    GatewayMessageReactionRemoveEmojiDispatchData,
  ];
  [GatewayDispatchEvents.MessageUpdate]: [
    shard: number,
    GatewayMessageUpdateDispatchData,
  ];
  [GatewayDispatchEvents.PresenceUpdate]: [
    shard: number,
    GatewayPresenceUpdateDispatchData,
  ];
  [GatewayDispatchEvents.RateLimited]: [
    shard: number,
    GatewayRateLimitedDispatchData,
  ];
  [GatewayDispatchEvents.Ready]: [shard: number, GatewayReadyDispatchData];
  [GatewayDispatchEvents.Resumed]: [shard: number, GatewayReadyDispatchData];
  [GatewayDispatchEvents.StageInstanceCreate]: [
    shard: number,
    GatewayStageInstanceCreateDispatchData,
  ];
  [GatewayDispatchEvents.StageInstanceDelete]: [
    shard: number,
    GatewayStageInstanceDeleteDispatchData,
  ];
  [GatewayDispatchEvents.StageInstanceUpdate]: [
    shard: number,
    GatewayStageInstanceUpdateDispatchData,
  ];
  [GatewayDispatchEvents.SubscriptionCreate]: [
    shard: number,
    GatewaySubscriptionCreateDispatchData,
  ];
  [GatewayDispatchEvents.SubscriptionDelete]: [
    shard: number,
    GatewaySubscriptionDeleteDispatchData,
  ];
  [GatewayDispatchEvents.SubscriptionUpdate]: [
    shard: number,
    GatewaySubscriptionUpdateDispatchData,
  ];
  [GatewayDispatchEvents.ThreadCreate]: [
    shard: number,
    GatewayThreadCreateDispatchData,
  ];
  [GatewayDispatchEvents.ThreadDelete]: [
    shard: number,
    GatewayThreadDeleteDispatchData,
  ];
  [GatewayDispatchEvents.ThreadListSync]: [
    shard: number,
    GatewayThreadListSyncDispatchData,
  ];
  [GatewayDispatchEvents.ThreadMembersUpdate]: [
    shard: number,
    GatewayThreadMembersUpdateDispatchData,
  ];
  [GatewayDispatchEvents.ThreadMemberUpdate]: [
    shard: number,
    GatewayThreadMemberUpdateDispatchData,
  ];
  [GatewayDispatchEvents.ThreadUpdate]: [
    shard: number,
    GatewayThreadUpdateDispatchData,
  ];
  [GatewayDispatchEvents.TypingStart]: [
    shard: number,
    GatewayTypingStartDispatchData,
  ];
  [GatewayDispatchEvents.UserUpdate]: [
    shard: number,
    GatewayUserUpdateDispatchData,
  ];
  [GatewayDispatchEvents.VoiceChannelEffectSend]: [
    shard: number,
    GatewayVoiceChannelEffectSendDispatchData,
  ];
  [GatewayDispatchEvents.VoiceServerUpdate]: [
    shard: number,
    GatewayVoiceServerUpdateDispatchData,
  ];
  [GatewayDispatchEvents.VoiceStateUpdate]: [
    shard: number,
    GatewayVoiceStateUpdateDispatchData,
  ];
  [GatewayDispatchEvents.WebhooksUpdate]: [
    shard: number,
    GatewayWebhooksUpdateDispatchData,
  ];
};
