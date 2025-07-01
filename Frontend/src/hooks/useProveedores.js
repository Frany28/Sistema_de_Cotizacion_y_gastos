import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/index";

/**
 * Hook que obtiene la lista de proveedores.
 *
 * @returns { data, isLoading, error, refetch }
 */
export const useProveedores = () => {
  return useQuery(
    ["proveedores"],
    async () => {
      const { data } = await api.get("/proveedores");
      return data.proveedores ?? data;
    },
    {
      staleTime: 1000 * 60 * 5, // cache por 5 minutos
      refetchOnWindowFocus: false,
    }
  );
};
