import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios.instance";
import {
  ContractProjectListSchema,
  ContractProjectSchema,
  type ContractProject,
} from "./contractProject.schema";

const ENDPOINT = "/contractProjects";

const omitEmptyReferences = (project: ContractProject): ContractProject =>
  Object.fromEntries(
    Object.entries(project).filter(
      ([key, value]) =>
        !/Id$/.test(key) ||
        (value !== "" && value !== null && value !== undefined),
    ),
  ) as ContractProject;

const fetchAll = async (): Promise<ContractProject[]> => {
  const response = await api.get(ENDPOINT);
  return ContractProjectListSchema.parse(response.data);
};

const fetchByOrganization = async (
  organizationId: string | number,
): Promise<ContractProject[]> => {
  const response = await api.get(ENDPOINT, { params: { organizationId } });
  return ContractProjectListSchema.parse(response.data);
};

const fetchById = async (
  id: string | number,
): Promise<ContractProject> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return ContractProjectSchema.parse(response.data);
};

const create = async (project: ContractProject): Promise<ContractProject> => {
  const response = await api.post(ENDPOINT, omitEmptyReferences(project));
  return ContractProjectSchema.parse(response.data);
};

const update = async ({
  id,
  ...data
}: { id: string | number } & Partial<ContractProject>): Promise<ContractProject> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return ContractProjectSchema.parse(response.data);
};

const remove = async (id: string | number): Promise<string | number> => {
  await api.delete(`${ENDPOINT}/${id}`);
  return id;
};

export const contractProjectsQueryKey = ["contractProjects"];

export const useContractProjects = () =>
  useQuery({
    queryKey: contractProjectsQueryKey,
    queryFn: fetchAll,
  });

export const useOrganizationContractProjects = (
  organizationId: string | number | undefined,
) =>
  useQuery({
    queryKey: [...contractProjectsQueryKey, "org", String(organizationId)],
    queryFn: () => fetchByOrganization(organizationId as string | number),
    enabled: Boolean(organizationId),
  });

export const useContractProject = (id: string | number | undefined) =>
  useQuery({
    queryKey: [...contractProjectsQueryKey, "id", String(id)],
    queryFn: () => fetchById(id as string | number),
    enabled: Boolean(id),
  });

export const useCreateContractProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: create,
    onSuccess: () => qc.invalidateQueries({ queryKey: contractProjectsQueryKey }),
  });
};

export const useUpdateContractProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: update,
    onSuccess: () => qc.invalidateQueries({ queryKey: contractProjectsQueryKey }),
  });
};

export const useDeleteContractProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: contractProjectsQueryKey }),
  });
};
