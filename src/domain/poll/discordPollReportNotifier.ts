import { Routes } from 'discord-api-types/v10';
import type { Notifier } from '../../cqrs/contracts.js';
import type { PollReport } from '../../entities/pollReport.js';
import { discordapi } from '../../utils/discordapi.js';

export class DiscordPollReportNotifier implements Notifier<PollReport> {
  async notify(report: PollReport): Promise<void> {
    const url = Routes.channelMessages(report.channelId);
    for (const content of report.chunks) {
      await discordapi.post(url, {
        body: {
          content,
          allowed_mentions: { parse: [] },
        },
      });
    }
  }
}
