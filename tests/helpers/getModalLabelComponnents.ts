import { ComponentType } from "discord-api-types/v10";

export type PartialComponentSingle = {
  custom_id: string;
  type: ComponentType;
  value: string | number;
};
export type PartialComponentList = {
  custom_id: string;
  type: ComponentType;
  values: (string | number)[];
};

export type PartialComponentBase =
  | PartialComponentSingle
  | PartialComponentList;

export const getModalLabelComponnents = (complist: PartialComponentBase[]) =>
  complist.map((e, i) => ({
    component: {
      id: i * 2 + 2,
      ...e,
    },
    id: i * 2 + 1,
    type: ComponentType.Label,
  }));
