export interface SotDataInterface {
  attributes: Array<SotAttributes>;
  description: string;
  image: string;
  name: string;
  metadata: Metadata;
}

export interface SotAttributes {
  trait_type: string;
  value: string;
}

export interface Metadata {
  UUID: string;
  Longitude: string;
  Latitude: string;
}

export interface ISot {
  sotId: string;
  name: string;
  sotOwner: string;
}
