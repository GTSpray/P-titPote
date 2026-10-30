import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
} from 'discord-api-types/v10';
import { getInteractionCommandHttpMock } from '../../../../mocks/getInteractionHttpMock.js';
import { randomDiscordId19 } from '../../../../mocks/discord-api/utils.js';
import type { CommandHandlerOptions } from '../../../../../src/commands/commands.js';
import {
  type gimmeOtterCommandData,
  type gimmeOtterSubCommandData,
  otter,
} from '../../../../../src/commands/slash/gimme/otter.js';
import { t } from '../../../../../src/i18n/index.js';

const USUAL_OTTER_URL =
  'https://github.com/GTSpray/P-titPote/raw/main/assets/otter.png?raw=true';

describe('/gimme otter', () => {
  let handlerOpts: CommandHandlerOptions<gimmeOtterCommandData>;

  const subcommand: gimmeOtterSubCommandData = {
    name: 'otter',
    type: 1,
  };
  const data: gimmeOtterCommandData = {
    id: randomDiscordId19(),
    name: 'gimme',
    options: [subcommand],
    type: 1,
  };

  const usualOtterResponse = {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: t('common.foundIt'),
        },
        {
          type: ComponentType.Separator,
          divider: true,
          spacing: 1,
        },
        {
          type: ComponentType.MediaGallery,
          items: [
            {
              description: 'otter',
              media: { url: USUAL_OTTER_URL },
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    const { req, res } = getInteractionCommandHttpMock({
      data,
    });
    handlerOpts = {
      req,
      res,
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the otter image returned by the json api', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ loc: '/hourly/ott/16169445973_41dcbfd37d_c.jpg' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    const response = await otter(handlerOpts);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.tinyfox.dev/img.json?animal=ott',
      expect.objectContaining({
        headers: { accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: t('common.foundIt'),
          },
          {
            type: ComponentType.Separator,
            divider: true,
            spacing: 1,
          },
          {
            type: ComponentType.MediaGallery,
            items: [
              {
                description: 'otter',
                media: {
                  url: 'https://api.tinyfox.dev/hourly/ott/16169445973_41dcbfd37d_c.jpg',
                },
              },
            ],
          },
        ],
      },
    });
  });

  it('falls back to the usual otter when the api responds with an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 503 })),
    );

    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, usualOtterResponse);
  });

  it('falls back to the usual otter when the api returns invalid json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })),
    );

    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, usualOtterResponse);
  });

  it('falls back to the usual otter when the api omits loc', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ remaining_api_calls: 'not_active' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, usualOtterResponse);
  });

  it('falls back to the usual otter when loc is not a tinyfox image path', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ loc: 'https://evil.example/otter.jpg' }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      ),
    );

    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, usualOtterResponse);
  });

  it('falls back to the usual otter when loc escapes the image host', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ loc: '/hourly/../ott/otter.jpg' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, usualOtterResponse);
  });

  it('falls back to the usual otter when the api is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    const response = await otter(handlerOpts);

    expect(response).toMeetApiResponse(200, usualOtterResponse);
  });
});
