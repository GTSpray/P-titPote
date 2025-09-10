import { Filter, PrimaryKey, Property, types } from "@mikro-orm/mariadb";
import { v4 } from "uuid";

@Filter({
  name: "excludeDeleted",
  cond: { deletedAt: "1970-01-01 01:00:00.000" },
  default: true,
})
export abstract class EntityBase {
  @PrimaryKey({ type: types.uuid })
  id = v4();

  @Property({ type: types.datetime })
  createdAt = new Date();

  @Property({ type: types.datetime, onUpdate: () => new Date() })
  updatedAt = new Date();

  @Property({ type: types.datetime })
  deletedAt: Date = new Date("1970-01-01T00:00:00.000Z");
}
