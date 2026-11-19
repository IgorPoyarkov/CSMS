/**
 * Mock-данные для уполномоченных органов и организаторов совместных закупок.
 * Формируются на основе реальных значений из базы данных.
 */

export interface AuthorizedBody {
  id: string | number;
  name: string;
}

export interface JointOrganizer {
  id: string | number;
  name: string;
  authorizedBodyId?: string | number; // связь с уполномоченным органом
}

// Уполномоченные органы (учреждения)
export const AUTHORIZED_BODIES: AuthorizedBody[] = [
  { id: 1, name: "Департамент здравоохранения города Москвы" },
  { id: 2, name: "Министерство имущественных и земельных отношений Белгородской области" },
  { id: 3, name: "Управление образования администрации города Белгорода" },
  { id: 4, name: "Министерство здравоохранения Белгородской области" },
  { id: 5, name: "Департамент образования города Москвы" },
  { id: 6, name: "Администрация города Белгорода" },
] as const;

// Организаторы совместных закупок
export const JOINT_ORGANIZERS: JointOrganizer[] = [
  { id: 1, name: "ГБУ «Клинико-диагностический центр ДЗМ»", authorizedBodyId: 1 },
  { id: 2, name: "ГКУ «Дирекция по организации закупок ДЗМ»", authorizedBodyId: 1 },
  { id: 3, name: "ОБГУ «Центр закупок Белгородской области»", authorizedBodyId: 2 },
  { id: 4, name: "ГКУ «Белгородский областной центр закупок»", authorizedBodyId: 4 },
  { id: 5, name: "ГБУ «Московский городской центр закупок»", authorizedBodyId: 5 },
] as const;

/**
 * Фильтрует организаторов по уполномоченному органу.
 * Если уполномоченный орган не указан — возвращает всех организаторов.
 */
export const getOrganizersByAuthorizedBody = (
  authorizedBodyId: string | number | null | undefined,
): JointOrganizer[] => {
  if (!authorizedBodyId) {
    return JOINT_ORGANIZERS;
  }

  return JOINT_ORGANIZERS.filter(
    (organizer) => organizer.authorizedBodyId === authorizedBodyId,
  );
};
