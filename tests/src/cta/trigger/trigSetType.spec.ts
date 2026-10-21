import { trigSetType } from '../../../../src/commands/cta/trigger/trigSetType.js';
import {
  CTASelectData,
  ModalHandlerOptions,
} from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import {
  ComponentType,
  InteractionResponseType,
  TextInputStyle,
} from 'discord-api-types/v10';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';
import { GuildTriggerKind } from '../../../../src/db/entities/GuildTrigger.entity.js';

describe('cta/trigSetType', () => {
  let handlerOpts: ModalHandlerOptions<CTASelectData>;
  let data: CTASelectData;

  beforeEach(async () => {
    data = {
      custom_id: `{"t":"cta","d":{"a":"trigSetType"}}`,
      component_type: ComponentType.StringSelect,
      values: [GuildTriggerKind.WelcomeMessage],
    };
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: admin_permissions,
    });
    const dbServices = await initORM();
    handlerOpts = {
      req,
      res,
      dbServices,
      additionalData: JSON.parse(data.custom_id),
    };
  });

  it('should open the welcome message config modal', async () => {
    const response = await trigSetType.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'trigCreateWelMsg' },
        }),
        title: t('trigger.modal.config.welcome_message.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.name'),
            description: t('trigger.modal.description.name'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'name',
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 50,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.channel'),
            component: {
              type: ComponentType.ChannelSelect,
              custom_id: 'channel',
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.message'),
            description: t('trigger.modal.description.message'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'message',
              style: TextInputStyle.Paragraph,
              min_length: 1,
              max_length: 2000,
              required: true,
            },
          },
        ],
      },
    });
  });

  it('should open the welcome role config modal', async () => {
    data.values = [GuildTriggerKind.WelcomeRole];
    handlerOpts.req.body.data = data;

    const response = await trigSetType.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'trigCreateWelRole' },
        }),
        title: t('trigger.modal.config.welcome_role.title'),
        components: [
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.name'),
            description: t('trigger.modal.description.name'),
            component: {
              type: ComponentType.TextInput,
              custom_id: 'name',
              style: TextInputStyle.Short,
              min_length: 1,
              max_length: 50,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: t('trigger.modal.label.role'),
            component: {
              type: ComponentType.RoleSelect,
              custom_id: 'role',
              required: true,
            },
          },
        ],
      },
    });
  });

  it('should refuse when the user is not a moderator', async () => {
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await trigSetType.handler({
      ...handlerOpts,
      req,
      res,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.UpdateMessage,
      data: {
        content: t('common.notAllowed'),
        components: [],
      },
    });
  });
});
