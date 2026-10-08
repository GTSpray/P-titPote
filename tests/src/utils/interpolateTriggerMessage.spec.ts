import { interpolateTriggerMessage } from '../../../src/utils/interpolateTriggerMessage.js';

describe('interpolateTriggerMessage', () => {
  it('should replace placeholders', () => {
    expect(
      interpolateTriggerMessage(
        'Salut {user} ({username}) — bienvenue sur {server} !',
        {
          userId: '123',
          username: 'Alice',
          serverName: 'Mon serveur',
        },
      ),
    ).toBe('Salut <@123> (Alice) — bienvenue sur Mon serveur !');
  });
});
