import { get } from "./request";

export interface UserItem {
  id: number;
  name: string;
  age: number;
}

export default {
  // usage demonstration
  query(params: { page: number; size: number }) {
    return get<UserItem[]>("/users", { data: params });
  },
};
