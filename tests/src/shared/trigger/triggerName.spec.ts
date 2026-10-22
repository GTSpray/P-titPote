import { triggerNameSchema } from '../../../../src/shared/trigger/triggerName.js';

describe('triggerNameSchema', () => {
  it('accepts underscore', () => {
    expect(triggerNameSchema.parse('welcome_role')).toBe('welcome_role');
  });

  it('accepts hyphen', () => {
    expect(triggerNameSchema.parse('welcome-role')).toBe('welcome-role');
  });

  it('accepts period', () => {
    expect(triggerNameSchema.parse('welcome.role')).toBe('welcome.role');
  });

  it('accepts space', () => {
    expect(triggerNameSchema.parse('welcome role')).toBe('welcome role');
  });

  it('trims and accepts mixed allowed characters', () => {
    expect(triggerNameSchema.parse(' a.b-c_d ')).toBe('a.b-c_d');
  });

  it('rejects uppercase', () => {
    expect(triggerNameSchema.safeParse('Welcome').success).toBe(false);
  });

  it('rejects other symbols', () => {
    expect(triggerNameSchema.safeParse('welcome!').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(triggerNameSchema.safeParse('').success).toBe(false);
  });
});
