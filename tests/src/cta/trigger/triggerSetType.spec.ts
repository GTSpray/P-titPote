import { triggerSetType } from '../../../../src/commands/cta/trigger/triggerSetType.js';
import { ModalHandlerOptions } from '../../../../src/commands/modals.js';
import { initORM } from '../../../initORM.js';
import { getInteractionMessageComponentHttpMock } from '../../../mocks/getInteractionHttpMock.js';
import {
  ComponentType,
  InteractionResponseType,
  MessageFlags,
  TextInputStyle,
} from 'discord-api-types/v10';
import {
  admin_permissions,
  default_member_permissions,
} from '../../../mocks/discord-api/rolePermission.js';
import { t } from '../../../../src/i18n/index.js';

describe('cta/triggerSetType', () => {
  let handlerOpts: ModalHandlerOptions<any>;
  let data: {
    custom_id: string;
    component_type: number;
    values: string[];
  };

  beforeEach(async () => {
    data = {
      custom_id: `{"t":"cta","d":{"a":"triggerSetType"}}`,
      component_type: ComponentType.StringSelect,
      values: ['welcome_message'],
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

  it('should open welcome message config modal', async () => {
    const response = await triggerSetType.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'triggerSetWelcomeMessage' },
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

  it('should open welcome role config modal', async () => {
    data.values = ['welcome_role'];
    handlerOpts.req.body.data = data;

    const response = await triggerSetType.handler(handlerOpts);

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.Modal,
      data: {
        custom_id: JSON.stringify({
          t: 'cta',
          d: { a: 'triggerSetWelcomeRole' },
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

  it('should refuse non-moderators', async () => {
    const { req, res } = getInteractionMessageComponentHttpMock({
      data,
      permissions: default_member_permissions,
    });

    const response = await triggerSetType.handler({
      ...handlerOpts,
      req,
      res,
    });

    expect(response).toMeetApiResponse(200, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: t('common.notAllowed'),
      },
    });
  });
});
