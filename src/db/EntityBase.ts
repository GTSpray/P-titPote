import { PrimaryKey, Property, types } from "@mikro-orm/mysql";
import { v4 } from "uuid";
export abstract class EntityBase {
  @PrimaryKey({ type: types.uuid })
  id = v4();

  @Property()
  createdAt = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt = new Date();
}
