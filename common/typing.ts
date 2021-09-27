export enum PassStatus {
  LIVE = "live",
  DEAD = "dead",
}

export enum Sex {
  MALE = "male",
  FEMALE = "female",
}

export interface PassRecipient {
  name: string;
  profileImage: string;
  fin: string;
  dob: string;
  sex: Sex;
  nationality: string;
}
