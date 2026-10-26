import type { APIBaseInteraction } from 'discord-api-types/v10';
import type { InteractionType } from 'discord-api-types/v10';
import { t } from '../../i18n/index.js';
import {
  isManageRolesPermissions,
  isModeratorPermissions,
} from '../../utils/isModeratorPermissions.js';

type InteractionTypeOpts =
  | InteractionType.ApplicationCommand
  | InteractionType.ModalSubmit
  | InteractionType.MessageComponent;
type iModeratorBodyOpts = APIBaseInteraction<InteractionTypeOpts, unknown>;

export function assertInteractionUserIsModerator(body: iModeratorBodyOpts) {
  if (!body.member || !body.member.permissions) {
    throw Error(t('errors.notServerScope'));
  }

  if (!isModeratorPermissions(body.member.permissions)) {
    throw Error(t('errors.notModerator'));
  }
}

export function assertInteractionUserCanManageRoles(body: iModeratorBodyOpts) {
  if (!body.member || !body.member.permissions) {
    throw Error(t('errors.notServerScope'));
  }

  if (!isManageRolesPermissions(body.member.permissions)) {
    throw Error(t('errors.notModerator'));
  }
}
