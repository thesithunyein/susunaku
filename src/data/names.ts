/**
 * The same institution, dozens of names, two continents. Susunaku is a blend of
 * two of them: susu (West Africa) and pasanaku (the Andes).
 */
export interface NameEntry {
  label: string;
  region: "africa" | "latam" | "other";
}

export const CIRCLE_NAMES: NameEntry[] = [
  { label: "Susu · Ghana", region: "africa" },
  { label: "Ajo · Nigeria", region: "africa" },
  { label: "Esusu · Nigeria", region: "africa" },
  { label: "Chama · Kenya", region: "africa" },
  { label: "Stokvel · South Africa", region: "africa" },
  { label: "Equb · Ethiopia", region: "africa" },
  { label: "Tontine · West Africa", region: "africa" },
  { label: "Hagbad · Somalia", region: "africa" },
  { label: "Gam'eya · Egypt", region: "africa" },
  { label: "Likelemba · DR Congo", region: "africa" },
  { label: "Pasanaku · Bolivia", region: "latam" },
  { label: "Tanda · Mexico", region: "latam" },
  { label: "Cundina · Mexico", region: "latam" },
  { label: "Junta · Peru", region: "latam" },
  { label: "Natillera · Colombia", region: "latam" },
  { label: "San · Venezuela", region: "latam" },
  { label: "Cuchubal · Guatemala", region: "latam" },
  { label: "Sou-Sou · Trinidad", region: "latam" },
  { label: "Consórcio · Brazil", region: "latam" },
  { label: "Sociedad · Dominican Rep.", region: "latam" },
];
