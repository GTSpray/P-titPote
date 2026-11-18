/** Pure domain entity for a guild's aliased message - no ORM types. */
export interface MessageAliasEntity {
  id: string;
  alias: string;
  message: string;
  /** Internal DiscordGuild.id (not the Discord guild id). */
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
