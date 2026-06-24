declare module "shapefile" {
  interface Source {
    read(): Promise<{ done: boolean; value?: GeoJSON.Feature }>;
  }

  export function open(
    shp: string | ArrayBuffer,
    dbf?: string | ArrayBuffer,
    options?: { encoding?: string }
  ): Promise<Source>;
}
