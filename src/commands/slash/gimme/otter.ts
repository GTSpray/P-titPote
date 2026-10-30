import type { CommandHandlerOptions } from '../../commands.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';

import type { Response } from 'express';
import * as z from 'zod';
import { foundItComponnents } from '../../commonMessages.js';
import { logger } from '../../../logger.js';

const OTTER_IMAGE_API_URL = 'https://api.tinyfox.dev/img.json?animal=ott';
const TINYFOX_ORIGIN = 'https://api.tinyfox.dev';
const FALLBACK_OTTER_IMAGE_URL =
  'https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png?raw=true';

const TinyFoxOtterPayload = z.object({
  loc: z.string(),
});

export interface gimmeOtterCommandData {
  id: string;
  name: string;
  options: [gimmeOtterSubCommandData];
  type: number;
}

export type gimmeOtterSubCommandData = {
  name: 'otter';
  type: number;
};

async function getOtterImageUrl() {
  let imageUrl = FALLBACK_OTTER_IMAGE_URL;
  try {
    const tinyFoxOtterResponse = await fetch(OTTER_IMAGE_API_URL, {
      signal: AbortSignal.timeout(2000),
      headers: { accept: 'application/json' },
    });
    if (!tinyFoxOtterResponse.ok) {
      logger.warn('gimme otter image api failed', {
        status: tinyFoxOtterResponse.status,
      });
    } else {
      const payload = await tinyFoxOtterResponse.json();
      const parsed = TinyFoxOtterPayload.safeParse(payload);
      if (!parsed.success) {
        logger.warn('gimme otter image api payload invalid');
      } else {
        const { loc } = parsed.data;
        const media = new URL(loc, TINYFOX_ORIGIN);
        if (
          loc.startsWith('/') &&
          !loc.startsWith('//') &&
          !loc.includes('..') &&
          !loc.includes('\\') &&
          loc.length <= 500 &&
          media.origin === TINYFOX_ORIGIN &&
          /\.(jpe?g|png|gif|webp)$/i.test(media.pathname)
        ) {
          imageUrl = media.href;
        } else {
          logger.warn('gimme otter image api loc rejected');
        }
      }
    }
  } catch (error) {
    logger.warn('gimme otter image api unavailable', {
      err: error instanceof Error ? error.message : 'unknown',
    });
  }

  return imageUrl;
}

export const otter = async ({
  res,
}: CommandHandlerOptions<gimmeOtterCommandData>): Promise<Response | null> => {
  let imageUrl = await getOtterImageUrl();

  return res.json({
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components: [
        ...foundItComponnents(),
        {
          type: ComponentType.MediaGallery,
          items: [
            {
              description: 'otter',
              media: { url: imageUrl },
            },
          ],
        },
      ],
    },
  });
};
