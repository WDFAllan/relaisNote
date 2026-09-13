export type User = { id: string; email: string; prenom: string; nom: string; role: number }
export type TeamUser = User & { statut: number }
export type Service = { id: string; nom: string; nombreEquipes: number; nombreBeneficiaires: number }
export type Team = { id: string; nom: string; serviceId: string; serviceNom: string; nombreMembres: number }
export type Beneficiary = {
  id: string
  prenom: string
  statut: number
  serviceId: string | null
  serviceNom?: string | null
  referentId: string | null
  referentNom: string | null
}
export type Tag = { id: string; libelle: string; estAlerte: boolean }
export type Transmission = { id: string; texte: string; creeLe: string; auteurNom: string | null; tags: Tag[] }
export type View = 'beneficiaries' | 'team' | 'service-beneficiaries'
