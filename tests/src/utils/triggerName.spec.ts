import { triggerNameSchema } from '../../../src/utils/triggerName.js';

describe('triggerNameSchema', () => {
  it('accepts letters, digits, spaces, underscore, hyphen, period', () => {
    expect(triggerNameSchema.parse('welcome_role')).toBe('welcome_role');
    expect(triggerNameSchema.parse('welcome-role')).toBe('welcome-role');
    expect(triggerNameSchema.parse('welcome.role')).toBe('welcome.role');
    expect(triggerNameSchema.parse('welcome role')).toBe('welcome role');
    expect(triggerNameSchema.parse(' a.b-c_d ')).toBe('a.b-c_d');
  });

  it('rejects uppercase and other symbols', () => {
    expect(triggerNameSchema.safeParse('Welcome').success).toBe(false);
    expect(triggerNameSchema.safeParse('welcome!').success).toBe(false);
    expect(triggerNameSchema.safeParse('').success).toBe(false);
  });
});
