export interface IAvatarListFilters {
  category: string;
  item_name: string;
  startDate: string;
  endDate: string;
}

export interface IUserAvatar {
  uuid: string,
  email: string,
  nickname: string,
  gender: string,
  hair: string,
  top: string,
  bottom: string,
  shoes: string
  skin: string
}
export interface IUsersAvatarListFilters {
  email: string;
  nickName: string;
  item_name: string;
}
